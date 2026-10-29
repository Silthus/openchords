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

Every push to `main` deploys to production and uploads the app to Convex static hosting.
