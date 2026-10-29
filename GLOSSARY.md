# OpenChords

An ad-free app for playing songs on the guitar: search a song, read its chords over the lyrics, and let it scroll while you play.

## Catalog

**Song**:
A piece of music as people search for it, identified by its artist and title. Every recording of it, studio, live or remaster, is the same Song.
_Avoid_: track, recording, tune

**Lyrics**:
The words of one Song, line by line, as fetched once from a source.
_Avoid_: text, words

**Chord sheet**:
One version of a Song: its Lyrics with chords placed over the words, plus its key and capo. A Song can have several Chord sheets.
_Avoid_: tab, chart, arrangement, version (as a noun for the thing)

**Chord layer**:
The chords of a Chord sheet without the words: which chord sits over which word of which line.
_Avoid_: chord track, overlay

**Origin**:
Who made a Chord sheet: built in, ChoCo, AI, or a person.
_Avoid_: author, creator

**Provenance**:
Where a piece of content came from: the source, its record there, the licence, and when we fetched it.
_Avoid_: attribution, metadata

**AI draft**:
A Chord sheet whose chords an AI model placed. It may need fixing.

## Sources

**Source**:
An outside system that answers one of three questions: which Songs match a search, what are a Song's Lyrics, or what are its chords.
_Avoid_: provider, integration, feed

## Library

**Library**:
Everything one person keeps: their saved Songs and their Library entries.
_Avoid_: collection, favourites, profile

**Library entry**:
One person's choices for one Song: the chosen Chord sheet, transpose, capo and scroll speed.
_Avoid_: setting, preference

## Playing

**Transpose**:
Moving every chord of a Chord sheet up or down by semitones.

**Capo**:
The fret a capo clamps. The Chord sheet shows the shapes to play with it.

**Chord diagram**:
A drawing of one chord on the fretboard: where the fingers go.
_Avoid_: fingering chart, chord box

## Access

**Invite**:
Permission for one email address to sign in.
_Avoid_: allowlist entry, whitelist
