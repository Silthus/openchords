# Sources return chord layers, and Catalog composes immutable Chord sheets

A chord source (builtIn, ChoCo, AI) returns only a chord layer: chords placed by line and word over the lyrics it was given, each chord checked by the strict `isChord`. A source that cannot place chords reliably returns nothing: ChoCo answers only when synced lyrics and audio-timed chords let it align them. Catalog composes that layer with the cached lyrics, through the Sheet kernel, into the ChordPro it stores. The stored format then cannot drift when a source changes, and no adapter has to write ChordPro. A Chord sheet is immutable once stored and records its `origin`. Her chord fix, built later, creates a new Chord sheet with `origin: "person"` and does not edit the shared one, so AI drafts and her fixes stay apart and her pick sticks.

## Considered options

- Each source writes full ChordPro: rejected, because every adapter would then reimplement composition and could drift the format.
- Editable Chord sheets with a revision history: deferred. Immutable versions cover "her pick sticks" with no history table.
