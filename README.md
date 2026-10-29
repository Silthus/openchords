# OpenChords

A free, ad-free app for playing songs on the guitar: search a song, see its chords over the lyrics, tap a chord to see where your fingers go, and let it scroll while you play.

It runs at https://judicious-falcon-175.eu-west-1.convex.site.

## Develop

```sh
bun install
bunx convex dev     # pushes convex/ to your dev deployment and writes .env.local
bun run dev         # the app on http://localhost:5173
bun run gate:lane   # typecheck, lint and tests, as CI runs them
```

Chord diagrams draw the first fingering of each chord from [chords-db](https://github.com/tombatossals/chords-db) at `df06fa7` (MIT, notice in `src/app/chords/chords-db/LICENSE`). `bun run scripts/vendor-chords-db.ts` vendors it again.

Every push to `main` deploys to production and uploads the app to Convex static hosting. Every pull request from this repo, drafts included, deploys its own Convex preview `pr-<number>` and comments its link.

## Sign-in

People sign in with Google, and only invited emails get in. Invite someone with:

```sh
bunx convex run access/invites:add '{"email": "her@example.com"}'          # dev
bunx convex run --prod access/invites:add '{"email": "her@example.com"}'   # production
```

To take an invite back, delete its row from the `invites` table in the Convex dashboard.

## On her phone

OpenChords installs to the home screen: Android offers to install it, and on iOS she adds it with Share → Add to Home Screen. A service worker from [vite-plugin-pwa](https://vite-pwa-org.netlify.app) keeps the app shell (HTML, JS, CSS, icons), never Convex data. When a new version is deployed, the app shows "New version ready." with a Reload button and never reloads by itself, so an update never interrupts a Song.

The icons come from `public/favicon.svg`: `bunx pwa-assets-generator --override` draws them again.

**Kill switch.** A service worker outlives a bad deploy. To take it off every phone, set `selfDestroying: true` next to `registerType` in `vite.config.ts` and push to `main`. Each phone drops the worker and its cache the next time it opens the app, and loads straight from the server from then on. Remove the line to bring it back.

## Walks

The journeys in `tests/*.e2e.ts` run with [e2e](https://e2e.tester.army) on a ChatGPT login, so they run locally, not in CI:

```sh
bunx e2e login openai --device   # once
bunx e2e run                     # against the local app, which it starts
APP_URL=https://<preview>.convex.site bunx e2e run   # against a pull request's preview
```

The install check needs a build with its service worker, so it runs only with `APP_URL` set.
