# Lyrics are cached on our server, with provenance on every content row

Michael registered a server-side LRCLIB app (2026-10-29), so Catalog fetches a Song's lyrics once, through Sources, and stores them permanently. This saves LRCLIB's allowance and gives the AI the words it needs to place chords. It replaces the earlier plan of fetching lyrics on her phone and never storing them. LRCLIB's API terms leave the rights to display lyrics with us, so this suits a private, invite-only app and not publishing. Every Lyrics record and Chord sheet carries its provenance (source, record id, licence tag, fetch time), so a licensed provider can replace LRCLIB, and one song's lyrics can be removed on request, without guessing where each row came from.

## Considered options

- Lyrics fetched on the phone and never stored (the first round's plan): rejected, because AI chord placement needs the words on the server, and every open would call LRCLIB again.
- Lyrics passed through the server for drafting only: superseded by Michael's app registration.
