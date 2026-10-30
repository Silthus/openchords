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

Chord diagrams draw the first fingering of each chord from [chords-db](https://github.com/tombatossals/chords-db) at `df06fa7` (MIT, notice in `src/app/chords/chords-db/LICENSE`). `bun run scripts/vendor-chords-db.ts` vendors it again. Where none of its fingerings plays a chord, `src/app/chords/handWritten.ts` draws it by hand.

Every push to `main` deploys to production and uploads the app to Convex static hosting. Every pull request from this repo, drafts included, deploys its own Convex preview `pr-<number>` and comments its link.

## Sign-in

People sign in with Google, and only invited emails get in. Google asks which account to sign in with every time, so someone turned away can try another one. Invite someone with:

```sh
bunx convex run access/invites:add '{"email": "her@example.com"}'          # dev
bunx convex run --prod access/invites:add '{"email": "her@example.com"}'   # production
```

To take an invite back, delete its row from the `invites` table in the Convex dashboard.

Signing in needs device storage, because Convex Auth keeps its sign-in state there across the trip to Google. A browser that denies storage still reads the Songs while invites are off.

With `OPENCHORDS_INVITES=on`, reading needs an invited sign-in too: every public Catalog function asks a signed-out visitor to sign in and keeps the link they came from. Dev and previews have it on. Production turns it on once the first invites exist, so nobody is locked out:

```sh
bunx convex run --prod access/invites:add '{"email": "<his Google email>"}'
bunx convex run --prod access/invites:add '{"email": "<her Google email>"}'
bunx convex env set --prod OPENCHORDS_INVITES on
```

Previews and dev also offer "Sign in as the test user", which needs no invite. Their deployments set `OPENCHORDS_ALLOW_TEST_SIGNIN=1` (previews get it from the project's preview defaults, with their own key pair), and their app is built with `VITE_TEST_SIGN_IN=1`. Production sets `OPENCHORDS_ENV=production` and refuses to start with test sign-in on.

## Real songs

Search finds songs beyond the built-in ones on [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API), at most one request a second for the whole app. `OPENCHORDS_SOURCES` lists the sources a deployment uses, and is `builtIn` when unset. Outside sources need `OPENCHORDS_INVITES=on`, so only invited readers reach them:

The words of a Song come from [LRCLIB](https://lrclib.net/docs) when she opens it the first time, matched by title, artist and a duration within 2 seconds. When LRCLIB cannot be reached, the fill tries three times with backoff, then again the next time someone opens the Song an hour or more later. LRCLIB needs an app id and key in the Convex env, never in the repo:

```sh
bunx convex env set LRCLIB_APP_ID <app id>
bunx convex env set LRCLIB_API_KEY <api key>
bunx convex env set OPENCHORDS_SOURCES builtIn,musicbrainz,lrclib   # dev
```

Previews and production stay on `builtIn` until production has invites on. Once it does, switch production's outside sources on:

```sh
bunx convex env set --prod LRCLIB_APP_ID <app id>
bunx convex env set --prod LRCLIB_API_KEY <api key>
bunx convex env set --prod OPENCHORDS_SOURCES builtIn,musicbrainz,lrclib
```

## AI-drafted chords

A Song with words and no Chord sheet gets one AI draft the first time she opens it: `gpt-6.1-terra` at medium effort, through the [Convex AI gateway](https://docs.convex.dev/ai-gateway), so no provider key is needed. It sends only the title, the artist and the words, takes about 15 seconds, and costs about one to two cents a Song. The song screen says "Writing chords…" meanwhile, and the stored Chord sheet "AI draft" carries the mark "AI draft: unverified, chords may be wrong". A draft with a chord that is no chord, or a chord off the words, is asked for once more, then the Song stays words-only. Each Song is drafted once; a Song that got its words before `ai` was on gets its draft on its next open.

`ai` in `OPENCHORDS_SOURCES` turns drafting on, and like the other outside sources it needs `OPENCHORDS_INVITES=on`. Taking `ai` out again stops new drafts at once and keeps the stored ones:

```sh
bunx convex env set OPENCHORDS_SOURCES builtIn,musicbrainz,lrclib,ai          # dev
bunx convex env set --prod OPENCHORDS_SOURCES builtIn,musicbrainz,lrclib,ai   # production
```

To take a Song down, for example after a rights holder asks, run:

```sh
bunx convex run --prod catalog/takedown:song '{"songId": "<song id from its link>"}'
```

It deletes the Song's words, Chord sheets and fill, and marks it taken down: its link shows no words, search and the start screen leave it out, and opening it never fetches its words again.

Songs whose words came from LRCLIB before verse breaks were kept read as one block. List them, then give each its verse breaks, one Song a run:

```sh
bunx convex run --prod catalog/verses:pending
bunx convex run --prod catalog/verses:refetch '{"songId": "<song id>"}'
```

It asks LRCLIB for the words again and stores where each verse starts only when the words are still the same, and puts the gaps into each Chord sheet with the same chords on the same words. A Chord sheet that would change in any other way, or chords still being written, leave the Song as it is. Taking `lrclib` out of `OPENCHORDS_SOURCES` stops it.

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

Where the app offers "Sign in as the test user" (dev and previews), each walk signs in with it first; on production, which offers none, the walks read signed out.

The real-song walk (`tests/real-song.e2e.ts`) needs outside sources, so it runs only against the local app on dev. The other walks expect only the built-in Songs, so run them against a preview.
