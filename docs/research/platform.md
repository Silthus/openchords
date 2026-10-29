# Platform research: Convex static hosting, PR previews, Google login, PWA, link preloading

Researched 2026-10-29. Every fact cites its owning source. Versions read: `@convex-dev/static-hosting` 0.2.1 (commit `b0dcf4a`), `@convex-dev/auth` 0.0.96 (commit `dd314f5`), `convex` npm 1.48.0, `@tanstack/react-router` 1.170.46, `vite-plugin-pwa` 2.0.0 (commit `355cf3d`), Lonir at `824bd52`.

Not tested against a live Convex account. Anything marked **(inferred)** or **(unverified)** needs a spike.

## Short answers

| Question | Answer |
| --- | --- |
| Static hosting serves a Vite SPA? | Yes. Deep links fall back to `index.html`, hashed assets are `immutable`, HTML revalidates. Serves at `https://<deployment>.convex.site`. |
| Which mount mode? | **App-owned root routing** (`registerStaticRoutes`), not the default component-owned `/`. Convex Auth needs `/.well-known/*` and `/api/auth/*` at the site root. |
| Custom domain? | Needs Convex **Pro**. Not needed for v1: the `.convex.site` URL works on her phone. |
| Per-PR preview on her phone? | Convex preview deployments exist (free tier: 5 day expiry), but the static-hosting CLI is **not wired for a preview deploy key** (hardcoded `--prod`). Needs a spike. Google OAuth also needs one hand-added redirect URI per preview (no wildcards). |
| Google login + invite-only? | Convex Auth with the Auth.js Google provider. Allowlist: throw in `afterUserCreatedOrUpdated`. Hand-made settings are in the checklist below. |
| PWA next to Convex? | `vite-plugin-pwa` works. The Convex client uses a WebSocket, which service workers never intercept. Precache the app shell only. Deny-list `/api/` from navigation fallback. |
| Preloading? | Lonir: TanStack `Link preload="intent"` plus Convex `client.prewarmQuery` on a 120 ms intent debounce, wrapped in one `Link` component. Files and constants below. |

---

## 1. Static hosting

Source: [`get-convex/static-hosting`](https://github.com/get-convex/static-hosting) `README.md`, `INTEGRATION.md`, `src/component/serving.ts`, `src/component/http.ts` (Apache-2.0).

- **What it does.** A Convex component. The CLI builds `dist/`, uploads each file to component-owned Convex storage, and atomically publishes a manifest. An HTTP action serves the files. A failed upload leaves the previous deployment live. (`INTEGRATION.md`, "CLI Reference").
- **Limits.** 1,800 files and 2 MiB of manifest metadata per deployment (`INTEGRATION.md`). HEAD is not supported on Convex HTTP routes, so uptime checks must use GET.
- **Client-side routes / deep links.** On by default. An extension-less path that matches no file serves `index.html`. A path with an extension that is missing returns 404. `--no-spa` turns the fallback off (`INTEGRATION.md`, "SPA routing"; `serving.ts` `hasFileExtension`).
- **Caching headers** (`serving.ts` `cacheControlFor`, `http.ts`):
  - Hashed non-HTML assets (`name-<hash>.ext`, hash 6 to 32 chars and containing a digit, `_` or `-`): `public, max-age=31536000, immutable`.
  - Everything else, including all HTML: `public, max-age=0, must-revalidate`, with `ETag` and `If-None-Match` support.
  - No uploaded `index.html` yet: a 503 setup page with `no-store`.
  - MIME types include `.webmanifest` as `application/manifest+json`, so a PWA manifest is served correctly.
- **Root mounting: pick app-owned mode.**
  - Default setup: `defineApp({ httpPrefix: "/api" })` plus `app.use(staticHosting, { httpPrefix: "/" })`. This moves **all of the app's own HTTP routes** under `/api` (`README.md`).
  - Convex Auth registers `/.well-known/openid-configuration`, `/.well-known/jwks.json`, `/api/auth/signin/*` and `/api/auth/callback/*` at the root (`@convex-dev/auth` `src/server/implementation/index.ts` lines 185 to 191, 196, 220, 236, 368). Its issuer is `CONVEX_SITE_URL` (same file, line 202). Moving those routes under `/api` would break token validation and the OAuth callback **(inferred)**.
  - So: `app.use(staticHosting)` with no prefix, then in `convex/http.ts` call `auth.addHttpRoutes(http)` **before** `registerStaticRoutes(http, components.staticHosting)`. Exact routes win over the static catch-all. The cost is one extra internal query on uncached requests (`INTEGRATION.md`, "App-owned root routing").
- **Deploy command.** `npx @convex-dev/static-hosting deploy`. It runs `npx convex deploy`, then builds with `VITE_CONVEX_URL` set to the target deployment, then uploads. Two-step alternative: `npx convex deploy` then `npx @convex-dev/static-hosting upload --build --prod`. A `setup` command adds the component and a `deploy` script (`README.md`, `INTEGRATION.md`).
- **Custom domain.** The component does not cover it. Convex custom domains need a **Pro** plan and attach to the deployment's API and HTTP-actions domains ([Custom Domains](https://docs.convex.dev/production/custom-domains)). The default `<name>.convex.site` needs no DNS. With a custom site domain, set `CUSTOM_AUTH_SITE_URL` so the Google consent screen shows it (`@convex-dev/auth` `docs/pages/advanced.mdx` line 233). Decision for later, not v1.
- **Update banner** (optional): `exposeDeploymentQuery` plus `<UpdateBanner />`. Worth adding once the PWA exists, so a cached shell tells her a new version is out.

## 2. PR previews

Sources: [Working with Multiple Deployments](https://docs.convex.dev/production/multiple-deployments#preview), [`npx convex deploy`](https://docs.convex.dev/cli/reference/deploy), [Deploy Keys](https://docs.convex.dev/cli/deploy-key-types), [Limits](https://docs.convex.dev/production/state/limits); `convex` 1.48.0 CLI source (`src/cli/lib/deploymentSelection.ts`, `lib/api.ts`, `deploy.ts`); static-hosting `src/cli/deploy.ts`, `upload.ts`.

What Convex gives you:

- A **preview deploy key** (`preview:team:project|...`) is generated on the project settings page. Set it as `CONVEX_DEPLOY_KEY`. `npx convex deploy` then deploys to a preview deployment. In GitHub Actions the preview name is the branch name; `--preview-name` overrides it, `--preview-create` recreates it, `--preview-run <fn>` seeds data.
- Previews are in **beta**. They expire after **5 days on Free/Starter**, 14 days on Professional and up. Each counts toward the team deployment limit: **40 on Free/Starter**, 300 on Professional.
- The docs list no plan gate for previews beyond the expiry difference, but do not state that Free can create preview deploy keys. **(unverified: confirm in the dashboard.)**

The catch: the static-hosting CLI is not written for preview keys.

- `deploy` and `upload` call `npx convex run --component staticHosting lib:... --prod` (`src/cli/deploy.ts` `tryFetchUrls`, `src/cli/upload.ts` `convexRunAsync`).
- With a preview deploy key, the Convex CLI treats `--prod` as "select the production deployment within the project" (`deploymentSelection.ts` case `"preview"`; `api.ts` `fetchDeploymentCredentialsWithinCurrentProject`). It would query or write **production**, or fail on auth. **(inferred from source, not run.)**
- `convex run` does accept `--preview-name` (`api.ts` `deploymentSelectionWithinProjectFromOptions`), but the static-hosting CLI never passes it.
- The same CLI also runs `convex deploy` with no preview flags. That part works on GitHub Actions because the name comes from the branch.

Options, in order of preference:

1. **Spike first (1 hour):** run the stock `deploy`/`upload` with a preview key against a throwaway preview. If it fails or hits prod, go to option 2.
2. **Thin own upload step** in CI: `npx convex deploy --cmd 'bun run build' --cmd-url-env-var-name VITE_CONVEX_URL` (the Convex CLI builds with the preview URL), then run static-hosting's upload functions with `--preview-name <branch>`. The component is Apache-2.0 and its upload protocol is plain `convex run` calls. Cost: reimplementing about 800 lines of `upload.ts` logic, or upstreaming `--preview-name` as a flag.
3. **Fallback:** per-PR previews skip the backend swap. Serve the PR build from a throwaway static host and point it at the shared dev Convex deployment. Breaks the "one place" rule, so only if 1 and 2 fail.

What else a preview needs:

- **Secrets in GitHub:** `CONVEX_DEPLOY_KEY` (preview key) for PR runs, and a separate production deploy key for `main`. Same workflow, different secret per environment ([Multiple Deployments](https://docs.convex.dev/production/multiple-deployments#preview)).
- **Per-deployment env vars.** `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` are per deployment. `npx convex env default set NAME value` sets project defaults per deployment type (dev, preview, prod) (`convex` CLI `envDefault.ts`), so the JWT keys and Google client can be set once for all previews. `SITE_URL` still differs per preview and must be set by the deploy step or `--preview-run`. **(inferred.)**
- **Google redirect URIs forbid wildcards** ([Google OAuth redirect URI rules](https://developers.google.com/identity/protocols/oauth2/web-server)). A preview's callback `https://<preview>.convex.site/api/auth/callback/google` must be added by hand in Google Cloud for each preview. This does not scale to one preview per PR.
  - **Recommendation:** previews run **without Google login**. Either a build-time `VITE_PREVIEW_BYPASS` that only works on `preview` deployments and signs in a seeded test user, or previews show only logged-out screens (enough for the UI prototype loop). Production and one fixed "staging" deployment keep real Google login. Decide in the spec.
- **Public by design.** A `*.convex.site` URL is open to anyone with the link. Whatever the preview shows must be public-domain seed data.

## 3. Auth: Convex Auth with Google, invite-only

Sources: [Convex Auth docs](https://labs.convex.dev/auth) (repo `get-convex/convex-auth`, `docs/pages/setup/manual.mdx`, `config/oauth/google.mdx`, `config/oauth.mdx`, `advanced.mdx`, `production.mdx`); [Convex Auth in Convex docs](https://docs.convex.dev/auth/convex-auth) (marks it **beta**); Google [OAuth app audience](https://support.google.com/cloud/answer/15549945).

Setup, per the docs:

1. `npm install @convex-dev/auth @auth/core` and run `npx @convex-dev/auth` (or the manual steps). It sets `SITE_URL` and generates `JWT_PRIVATE_KEY` and `JWKS`.
2. `convex/auth.config.ts`: provider `{ domain: process.env.CONVEX_SITE_URL, applicationID: "convex" }`.
3. `convex/auth.ts`:
   ```ts
   import Google from "@auth/core/providers/google";
   import { convexAuth } from "@convex-dev/auth/server";
   export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({ providers: [Google] });
   ```
4. `convex/http.ts`: `auth.addHttpRoutes(http)`. Add the auth tables to `schema.ts` (`authTables`).
5. Client: `ConvexAuthProvider` around the app; button calls `useAuthActions().signIn("google")`.

**Invite-only.** `callbacks.afterUserCreatedOrUpdated(ctx, args)` runs inside the sign-in mutation, after the user is created or updated and before the account and tokens are created (`@convex-dev/auth` `src/server/implementation/users.ts` lines 142 to 163, `types.ts` lines 233 to 243). A throw there aborts the mutation, so no user or session is persisted **(inferred from Convex mutation semantics)**. Pattern:

```ts
callbacks: {
  async afterUserCreatedOrUpdated(ctx, { userId }) {
    const user = await ctx.db.get(userId);
    const invited = await ctx.db.query("invites")
      .withIndex("email", q => q.eq("email", user?.email?.toLowerCase())).unique();
    if (!invited) throw new ConvexError("Not invited");
  },
}
```

- Keep invites in an `invites` table keyed by lowercased email, seeded by an internal mutation Michael runs (`npx convex run`). It is the simplest option and needs no code deploy to add a person. An env-var allowlist also works for two people but needs `npx convex env set`.
- Use `afterUserCreatedOrUpdated`, not `createOrUpdateUser`: the second one replaces the library's account-linking logic (`advanced.mdx`).
- Check `email_verified` from the Google profile too. Google accounts return a verified email, and the default code treats OAuth emails as verified for linking (`users.ts` lines 62 to 66).
- **UX gap:** what an uninvited person sees comes from the thrown error on the OAuth callback. Not verified how Convex Auth surfaces it on the redirect back. Spike in the login slice.
- Also guard every query and mutation with an invited-user check; the callback only guards sign-in.

**Hand-made checklist for Michael (Google Cloud + Convex):**

Google Cloud ([Google Auth Platform](https://console.cloud.google.com/auth/overview)):

- [ ] Create or pick a Google Cloud project.
- [ ] Auth Platform, **Get started**: app name, support email, contact email. Choose audience **External**.
- [ ] Request only the basic scopes `openid`, `email`, `profile`. With only these, users need not be listed as test users, see no unverified-app warning, and authorizations do not expire after 7 days. This covers Sign in with Google ([Google](https://support.google.com/cloud/answer/15549945)).
- [ ] Publishing status: either leave **Testing** and add the invited emails (cap 100 test users), or **Publish** (with basic scopes only; Google's unverified-app cap of 100 new users applies if verification is needed). Testing plus the basic-scope exception is enough for a handful of people. **(partly unverified: the page does not say outright that basic-scope-only apps skip verification.)**
- [ ] **Clients, Create client**: type **Web application**. Authorized JavaScript origins: the site origin(s). Authorized redirect URIs: `https://<prod-deployment>.convex.site/api/auth/callback/google`, plus `https://<dev-deployment>.convex.site/api/auth/callback/google` for the dev deployment. (Google forbids wildcards.)
- [ ] Copy the **Client ID** and **Client secret**.

Convex dashboard / CLI, per deployment (dev and prod separately):

- [ ] `npx convex env set AUTH_GOOGLE_ID <client id>`
- [ ] `npx convex env set AUTH_GOOGLE_SECRET <client secret>`
- [ ] `npx convex env set SITE_URL <app origin>` (prod: `https://<prod-deployment>.convex.site`; dev: `http://localhost:5173`)
- [ ] `JWT_PRIVATE_KEY` and `JWKS`: run `npx @convex-dev/auth` (or the `generateKeys.mjs` script from the manual setup) once per deployment. For prod add `--prod`.
- [ ] Generate a **production deploy key** (Convex dashboard, deployment settings, Deploy keys, permission `deployment:deploy`) and a **preview deploy key** (project settings, preview deploy keys); store as GitHub Actions secrets.
- [ ] Seed the first invites (Michael's and her email) by running the invite mutation.

Production notes from the docs: dev and prod need separate OAuth "apps" or at least separate redirect URIs (`config/oauth.mdx`, "Production setup"). `SITE_URL` is one value per deployment, which is why previews need their own handling (section 2).

## 4. PWA

Sources: `vite-plugin-pwa` repo `docs/guide/pwa-minimal-requirements.md`, `auto-update.md`, `docs/workbox/generate-sw.md`; [WebSocket Standard](https://websockets.spec.whatwg.org/), opening handshake; `convex` 1.48.0 `src/browser/sync/client.ts`; static-hosting `serving.ts`.

- **Installable PWA minimum** (`pwa-minimal-requirements.md`): mobile viewport, title, description, favicon, `apple-touch-icon`, `mask-icon`, `theme-color` meta; a manifest with `name`, `short_name`, `description`, `theme_color` (must equal the meta tag), and icons of `192x192` and `512x512`. Config shape:
  ```ts
  VitePWA({ registerType: "autoUpdate", manifest: { name, short_name, description, theme_color,
    icons: [{ src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" }] } })
  ```
- **Hosting fit.** The static-hosting component serves `.webmanifest` with the right MIME type and `sw.js` with `must-revalidate` (not a hashed name), so a new service worker is picked up on the next navigation (`serving.ts` `MIME_TYPES`, `cacheControlFor`). Both live at the site root, so the service worker's default scope (`/`) works with root mounting.
- **Does the service worker interfere with Convex?** No for the realtime path. The Convex client talks over a WebSocket (`src/browser/sync/client.ts`, `WebSocketManager`), and the WebSocket opening handshake sets the fetch request's `service-workers mode` to `"none"` ([WebSocket Standard](https://websockets.spec.whatwg.org/), opening handshake), so no fetch event reaches the service worker. Convex query results are never cached by the service worker.
- **What can interfere:** the navigation fallback. Workbox's `generateSW` serves the cached `index.html` for navigations. Auth and uploads go through `https://<deployment>.convex.site/api/...`, which is a different origin from `*.convex.cloud`, but **with static hosting they share the origin**. So add `navigateFallbackDenylist: [/^\/api\//, /^\/\.well-known\//]` (`generate-sw.md`, "Exclude routes") so `/api/auth/*` is never answered with the app shell. Also never runtime-cache `/api/`.
- **What caches safely:**
  - Precache: the build output (hashed JS/CSS, icons, manifest, `index.html` shell). That is what `generateSW` does by default.
  - Runtime-cache candidates (later, offline slice): song data fetched through Convex, kept in IndexedDB by app code, not by the service worker. Convex data is not HTTP-cacheable.
  - Do not cache: `/api/*`, the WebSocket, `*.convex.cloud` calls.
- **Update behaviour.** `registerType: "autoUpdate"` forces `skipWaiting` and `clientsClaim` and reloads open tabs on a new version (`auto-update.md`); its docs warn that reloading can lose in-progress form data and that switching from `autoUpdate` to `prompt` later is painful. OpenChords has few forms, but she may be mid-song while scrolling, so prefer `prompt` (the default) with `<UpdateBanner />` or a toast, and decide **before** the first PWA release.
- **iOS note.** Install flow on iOS is "Add to Home Screen" from Safari; no `beforeinstallprompt`. Not verified against Apple docs. Cover in the spec if she uses an iPhone.

## 5. Link preloading: the Lonir pattern

Source: `~/dev/lonir-ref` at `824bd52`. Docs: `docs/agents/prewarm.md` (the rule), ADR `docs/adr/0017-prewarm-as-deep-module.md`.

**Two layers, one wrapper component.**

| Layer | What | Where |
| --- | --- | --- |
| Code | TanStack Router `preload="intent"` loads the route's code-split chunk on hover, focus, **and touchstart** | `Link` wrapper default `preload = 'intent'`; TanStack `link.tsx` `handleTouchStart` runs `preloadLink` when `preload === 'intent'` |
| Data | Convex `client.prewarmQuery` subscribes to the route's queries before the click, so `useQuery` finds them already cached | `packages/data/src/router/convex-route-data.ts` |

**Files (all under `packages/data/src/router/` unless noted):**

- `Link.tsx` (52 lines): wraps TanStack `Link`. Props: `LinkComponentProps & { prewarm?: (client) => Promise<void> }`. Defaults `preload = 'intent'`. Without `prewarm` it is a pass-through; with it, `PrewarmLink` composes the user's `onMouseEnter/Leave/Focus/Blur` with the intent handlers.
- `use-route-prewarm-intent.ts`: `createRoutePrewarmIntent({ prewarm, client, debounceMs = 120, isEnabled })` returns `onMouseEnter/onMouseLeave/onFocus/onBlur/dispose`. Enter or focus schedules `prewarm(client)` after the debounce; leave or blur cancels. `useRoutePrewarmIntent` is the hook form. `isEnabled` is `!isLoading && isAuthenticated`, so nothing prewarms before login. **Gap for touch:** the Lonir handler list has no `onTouchStart`, only mouse and focus. TanStack's own code preload does fire on touchstart; the Convex data prewarm would not on a phone. OpenChords must add `onTouchStart` to the intent controller. Mobile is the main target, so this is not optional.
- `convex-route-data.ts`: constants `PREWARM_DEBOUNCE_MS = 120`, `PREWARM_DEDUPE_MS = 3000`, `PREWARM_EXTEND_MS = 8000`. `makeRouteQuerySpec(query, args)`, `prewarmSpecs(client, specs)` (dedupes per client, auth epoch, function name and args for 3 s, then calls `client.prewarmQuery({ query, args, extendSubscriptionFor: 8000 })`), `composePrewarm(parent | null, buildSpecs)` (calls the parent chain first, then warms specs), `chainPrewarm(...)`, `resetPrewarmDedupe()`.
- `DataRoot.tsx` + `auth-context.tsx`: provides `{ isLoading, isAuthenticated }` and calls `resetPrewarmDedupe()` when auth flips, so one user's warm entries do not suppress another session's. Mounted inside `ConvexAuthProvider` in `apps/web/src/main.tsx`.
- `apps/web/src/routes/**/<route>.prewarm.ts`: one prewarm file per route, beside the route file, e.g. `libraryEntity.prewarm.ts` composing `makeRouteQuerySpec(api.entities.get, { workspaceId, entityId })`. Vite config excludes them from route generation: `routeFileIgnorePattern: '\\.(prewarm|test|component)\\.(ts|tsx)$'` in `apps/web/vite.config.ts` (`tanstackRouter` plugin).
- `apps/web/src/features/billing/BillingLink.tsx`: example consumer. A feature-owned link component that fixes the route string and the prewarm chain: `<Link to="/billing" prewarm={prewarmBilling} {...props} />`. Callers never learn the URL.
- `apps/web/src/main.tsx`: `createRouter({ routeTree })` with **no** `defaultPreload`; the `Link` wrapper sets it per link. Provider order: `ConvexAuthProvider client={convex}` then `DataRoot` then `RouterProvider`.
- Lint enforcement (`packages/eslint-plugin-omnigame`): `no-tanstack-link-import` forbids importing `Link` from `@tanstack/react-router` directly, `require-prewarm-on-link` requires a `prewarm` prop or a justified disable. Keeps every link on the wrapper.

**Underlying Convex API** (`convex` 1.48.0 `src/react/client.ts` lines 577 to 587): `prewarmQuery({ query, args, extendSubscriptionFor })` calls `watchQuery(...).onUpdate(() => {})` and unsubscribes after `extendSubscriptionFor` ms (default 5,000). Fire-and-forget, read-only. A later `useQuery` with the same function and args reuses the live subscription. This is the whole mechanism.

**Recipe for OpenChords** (smallest version):

1. Copy the four small modules (`convex-route-data.ts`, `use-route-prewarm-intent.ts`, `Link.tsx`, `DataRoot.tsx` plus `auth-context.tsx`) into `src/lib/prewarm/`. About 300 lines without tests. No dependency beyond `convex`, `@tanstack/react-router`, React.
2. Add `onTouchStart: schedule` to the intent controller and `Link` wrapper (new vs. Lonir).
3. `song.$songId.prewarm.ts` composing `api.songs.get`, `api.chordSheets.listForSong` and, for a logged-in user, `api.library.settingsFor`.
4. Search results render `<Link to="/songs/$songId" params={...} prewarm={prewarmSong(songId)} />` so a result tap or hover warms the sheet.
5. Keep `isEnabled` gated on auth, as Lonir does. Because the app is invite-only, nothing is public to prewarm for logged-out visitors.
6. Keep Lonir's constants (its docs say do not retune without reading ADR 0017), and revisit 120 ms for touch: touchstart should fire immediately (debounce 0) since tap and click are close together.

Licensing: Lonir is `Omni-GM/lonir`; the map says to follow its pattern. Check that the copied files may be reused in an MIT repo before copying, or rewrite them from this description (about 300 lines).

---

## Decisions I made (also in the ticket)

- Use app-owned root routing (`registerStaticRoutes`) so Convex Auth keeps its root URLs.
- Run PR previews without real Google login; seed a test user or show logged-out screens.
- Prefer SW `prompt` updates over `autoUpdate`.
- Invites live in an `invites` table; guard in `afterUserCreatedOrUpdated` plus per-function checks.
- Add touchstart prewarm, which Lonir lacks.

## Open risks and gaps

1. **Preview deploy via static-hosting CLI untested.** Spike required. Might hit prod if run with `--prod` and a preview key.
2. **Convex Auth is beta**; releases are `0.0.x`. Pin versions.
3. **Free plan preview eligibility** not stated in docs. Confirm in the dashboard.
4. **Rejected-user UX** on the OAuth callback not verified.
5. **Google "Testing" mode** and basic-scope claims: partly inferred from the support page, whose verification section was not fully read.
6. **iOS install behaviour** not researched from Apple docs.
7. **Static hosting 0.2.x is young** (breaking 0.1 to 0.2 change on 2026-10). Pin the version, read `CHANGELOG.md` before upgrades.
8. Nothing here was run against a live Convex or Google account.
