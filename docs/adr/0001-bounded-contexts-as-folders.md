# Bounded contexts are folders, joined by ids only

OpenChords is split into Catalog, Sources, Library and Access, plus the Sheet shared kernel. Each context is a folder with one public `index.ts`. Contexts reference each other only by id (`SongId`, `ChordSheetId`, `UserId`), never read another context's tables, and call each other's interfaces directly. A lint rule against deep imports enforces this. We chose this over a Convex component per context and over domain events, because both add build, auth and test wiring that a two-person, invite-only app does not need yet, while the folder rule already keeps every context swappable.

## Consequences

- A context can become a Convex component later without changing its callers, because they already go through its one public file and hold only ids.
- Events wait until a second context must react to a change that a reactive query cannot cover.
