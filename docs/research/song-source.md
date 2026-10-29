# Sources for searchable songs with lyrics and chords

Researched 2026-10-29. **Question:** which sources can power search, open a song, and play from chords over lyrics in an ad-free, invite-only app, without Ultimate Guitar scraping or proxying?

**Recommendation:** use MusicBrainz for song identity and a small catalog of complete, rights-cleared chord sheets contributed by their rights holders. Search playable sheets locally. Add modern songs only with the relevant permissions. No examined free source combination establishes those permissions for the five modern-song examples below. Invite-only access does not itself supply them.

If those exact songs are essential, content clearance is an unresolved dependency. Obtain a suitable lyrics agreement plus permission for the accompaniment-sheet use, or direct permission from the relevant rights holders. Do not promise that LRCLIB plus generated chords has solved this dependency.

This assessment concerns the examined sources and their permissions. A jurisdiction-specific private-use exception for the proposed catalog has not been established.

## Song registry

**Choose MusicBrainz.** Its API searches recordings by title and credited artist, supports JSON, needs no API key for public reads, and requires an identifying User-Agent. Noncommercial API use is free; commercial use of the hosted service has separate plans. Its published default limit is an average of one request per second per source IP, with HTTP 503 when throttled. [API][mb-api], [rate policy][mb-rate].

Use a backend request queue, a meaningful header such as `OpenChords/0.1 (https://github.com/Silthus/openchords)`, debounced searches, and cached results. Queue at the outbound-IP level rather than independently per user. Keep normal song opening and link preloading on the app's own stored sheets; they should not generate another registry lookup. These are implementation recommendations based on the rate policy.

Core metadata, including titles, artist credits, recording/work identifiers, durations and recording ISRCs, is CC0. Attribution is welcome but not a condition of CC0; credit MusicBrainz in the source information anyway. Supplementary annotations, tags and ratings are CC BY-NC-SA 3.0, so keep them out of the initial integration. Database licensing and hosted API access are separate questions. [License][mb-license], [field breakdown][mb-db].

A MusicBrainz **Work** is the composition; a **Recording** identifies a performance of it. A Song should have its own app ID and optional work/recording IDs. Do not create one Song per search hit: studio, live, demo and remastered results need disambiguation. A Chord sheet is an arrangement attached to the app's Song, not a MusicBrainz recording. [Work definition][mb-work].

**Search behavior recommendation:** the ordinary search lists songs with a usable sheet. An optional catalog lookup can find an unprepared Song, but it must say that no playable sheet is available. MusicBrainz supplies identity, not a chord-and-lyrics catalog. [API scope][mb-api].

## Lyrics: LRCLIB works technically, but does not clear copyright

LRCLIB provides plain and synchronized lyrics. Its current API documentation permits anonymous access, requires client identification, caps search at 20 results without pagination, and documents approximate rate allowances that may change. An identified client is currently listed at about 90 requests/minute/IP. Honor `Retry-After` and use sequential requests. `/api/get` supports matching with title, artist, album and duration; the documented duration tolerance is two seconds. Manual autoscroll needs only plain text. [API documentation][lrc-docs].

The Rust server is MIT-licensed **software**. More decisively, LRCLIB's API terms, version 2026-09-30, say API permission covers API use only; responsibility for obtaining rights to display, distribute or otherwise process lyrics stays with the developer. It offers no corresponding blanket lyric-content license. [Software license][lrc-license], [current API terms][lrc-terms], [served terms text][lrc-terms-asset].

**Decision:** reject LRCLIB as the default source of modern lyrics under the stated legal bar. Its API may be used where the lyric rights are established separately; retrieving the same text from LRCLIB is not a substitute for that grant. The service's “free and open” description and an API authorization document do not change this conclusion. [API terms][lrc-terms].

The access documentation advertises higher registered-client allowances while the terms say registration does not grant higher limits. Treat allowances as operational settings, not a contractual guarantee. This inconsistency does not affect the lyric-rights finding. [Documentation][lrc-docs], [terms][lrc-terms].

### What invite-only changes

As a concrete German-law check, reproduction is an exclusive right even when copies are temporary. Public communication depends on personal relationships, not just an account or invite screen. Private-copy exceptions have conditions, exclude obviously unlawful source copies, restrict subsequent distribution/public use, and have special rules for graphical music notation. Therefore a closed app can have a different legal analysis from a public service, but “invite-only” alone does not establish a lawful catalog-copying basis. [UrhG §16][law16], [§15(3)][law15], [§53][law53].

A contributor typing copyrighted lyrics from memory does not thereby acquire the underlying rights. For modern songs, require a grant from someone authorized to give it, or establish a specific applicable exception before admitting the content. Creative Commons licenses likewise grant only rights the licensor has authority to grant. [CC BY legal code, introductory considerations and §2][ccby].

For public-domain material, check the exact text, tune, translation and arrangement in the relevant territories. German law generally uses life plus 70 years, with joint authorship and specifically composed music-with-text rules. An old composition can still appear in a protected modern arrangement. [UrhG §64][law64], [§65][law65], [adaptations, §23][law23].

## Chord sources

| Option | What it actually supplies | Versions and quality | Decision |
| --- | --- | --- | --- |
| Chordonomicon | Chord sequences and some section labels, without lyrics or lyric positions | The paper selected a best source version; current CSV has duplicate recording IDs. Neither gives a ready version picker | Reject: Ultimate Guitar provenance, missing alignment, noncommercial dataset license |
| Title-only LLM | A proposed arrangement, when the model can generate one | Can generate variants, but variants are not independently verified transcriptions | Use only as an editorial draft aid after rights are settled; do not generate the default sheet on song open |
| Contributions by authorized rights holders | A complete sheet, including positions and editorial choices | Multiple arrangements and corrections can be reviewed and attributed | Recommended for the first cleared catalog; coverage must be built |
| ChoCo | Chord annotations indexed to score measures or audio time, depending on source | Multiple source annotations exist for some songs; provenance and precision vary | Useful for selective research, not a verified complete sheet catalog |
| Transcribe a recording | Proposed chords from an authorized audio input | Arrangement-specific; still needs listening, correction and lyric alignment | Later editorial tooling, not the first content source |
| Direct publisher agreement | Whatever lyric, arrangement and display rights are actually granted | Potentially authoritative material; availability is contractual | Best route when named modern-song coverage is mandatory |

The factual basis and limits for each option follow.

### Chordonomicon

The actual Hugging Face dataset card declares **CC BY-NC 4.0**. The separate code repository has an Apache-2.0 license. The paper's own license is also separate from the data license. Do not use the code license to relabel the dataset as commercially reusable. [Dataset card][chord-card], [code license][chord-code-license].

The authors explicitly describe scraping Ultimate Guitar. They selected a preferred version using ratings/votes, collapsed consecutive identical chords, and removed lyrics, titles and artist names from the release. The authors argue that the retained material is not copyrightable; that is their legal argument, not a lyric license or an independent clearance opinion. Ultimate Guitar provenance alone rules this source out for this app. [Paper, Data Gathering and Curation and Ethical Statement][chord-paper].

The current `chordonomicon_v2.csv` contains 679,807 rows and 10 columns. Inspection found no lyrics, word/line anchors, chord durations or usable contributor/version metadata. It includes Spotify recording IDs, but no title/artist-name fields. The full scan used dataset revision `f3a8b678bd65639c01caa342921733f1db01be23`; the published size API independently confirms the row count. [CSV][chord-csv], [size API][chord-size].

**Engineering inference:** section labels plus a sequence with repeated chords collapsed cannot recover exact chord positions over lyric words. Joining it to LRCLIB would still require new alignment work and separate lyric permission.

### LLM accuracy: a draft is not coverage

A 2026 primary study found substantially weaker chord-perception performance from audio than from symbolic MIDI for the models it evaluated. It did **not** test title-only retrieval of these five songs or the research worker's model, so its numbers cannot be reused as this app's accuracy. [PMLR study][llm-study].

An informal title-only spot check was performed by the research worker, GPT-6.1 Sol at high effort. Chord-vocabulary guesses were recorded before inspecting the two reference files' chord values. No audio or lyrics were supplied. This is a diagnostic, not a controlled independent-model evaluation:

| Song | Check performed | Result |
| --- | --- | --- |
| Riverside | Title/artist-only draft vocabulary | Unverified; no cleared reference comparison performed |
| I Will Follow You into the Dark | Title/artist-only draft vocabulary | Unverified; no cleared reference comparison performed |
| Down by the Water | Title/artist-only draft vocabulary | Unverified; no cleared reference comparison performed |
| Ring of Fire | Draft `G, C, D` compared with ChoCo's chart vocabulary `G, C, D7` | Extension detail missed. Simplifying D7 to D could be an intentional arrangement, but it is not an exact transcription |
| Nothing Else Matters | Draft `Em, D, C, G, B7, Am` compared with ChoCo's live-recording annotations | Omitted A major, E major and a decorated A-minor annotation. Live-reference mismatch also prevents a studio-transcription accuracy claim |

The two checked references are [Ring of Fire, iReal-derived chart][choco-ring] and [Nothing Else Matters, Uspop live annotation][choco-nothing]. The other title-only guesses were `Dm, Am, Gm, C, F` for Riverside, `F, Dm, Bb, C, A, Bbm` for I Will Follow You into the Dark, and `Em, G, D, C, Am` for Down by the Water. These are recorded observations of unverified generation, not recommended chord content.

This check evaluates neither transitions nor word placement, capo, section order, repeats or playability. **Per-song sheet accuracy remains unknown for all five.** A model's ability to return valid chord syntax is not proof of a correct arrangement. A useful future evaluation requires a chosen recording, a permitted reference, and a musician checking the complete sheet against it.

Generating a second variant does not create an independently validated Chord sheet, and generating lyrics does not establish lyric permission. Keep any accepted draft's provenance and mark it reviewed only after a real musical check.

### Contributions and versions

Accept original songs from their rights holders, public-domain material with independently prepared arrangements, or explicitly authorized modern-song sheets. Request permission for storage, in-app display, lyric/chord alignment and arrangement changes, transpose/capo variants, and offline copies if desired. A contributor can grant rights to their own work, not someone else's lyric or protected arrangement. [Scope of a licensor's authority][ccby].

**Recommendation:** create at least one reviewed, complete sheet before making the Song playable. An editor can prepare it before the player arrives, preserving search-and-play without requiring the player to paste anything. This trades automatic catalog breadth for reliable availability.

Several contributed arrangements produce real versions naturally: for example, an easier arrangement and an arrangement matching a particular performance. Give each its own stable Chord sheet ID, contributor, source and revision. Remember the user's chosen ID. Store capo and transpose as preferences on that sheet; do not count every transposition as a new independently authored version. These are product/data-model recommendations.

Retain minimal evidence of the permissions, source URL or document reference, allowed uses and attribution. Keep permission correspondence private. Code may remain MIT while content has its own license; do not blanket-license third-party content under the repository's MIT file. [Separate rights and license scope][ccby].

### ChoCo and audio transcription

ChoCo's documentation describes chord annotations aligned to audio time or score measures. Its main release license is CC BY 4.0, with named partitions under CC BY-NC-SA 4.0. It combines source collections, so the relevant partition and underlying material still need provenance review. The inspected JAMS annotations for the target songs contain chords, not aligned lyric text. [README and license exceptions][choco-readme], [Ring chart][choco-ring], [Nothing Else Matters annotation][choco-nothing].

The live source tree has grown beyond the headline collection size in its README. A scan read the ordinary metadata files for 17 partitions and the split audio/score metadata for Schubert-Winterreise, rather than relying on a truncated recursive GitHub listing. Matches are reported below. Do not equate a matching title with an approved arrangement.

An audio-analysis pipeline could supply another draft if an appropriate audio input and its permitted processing are available. It still does not supply lyric rights or exact lyric anchors. This is an architectural alternative, not a tested source in this research; no audio transcription accuracy or coverage is claimed. The perception study reinforces the need to evaluate the chosen method rather than assuming “AI” guarantees transcription. [PMLR study][llm-study].

## Actual song lookups

All lookups were performed on 2026-10-29. “Ring of Fire” is an explicitly chosen representative Johnny Cash recording. “Down by the Water” means The Decemberists.

| Song / artist | MusicBrainz registry | LRCLIB lyrics | Chordonomicon exact recording-ID check | ChoCo metadata scan |
| --- | --- | --- | --- | --- |
| Riverside / Agnes Obel | [Found][mb-riverside] | [Found, 20 returned][lrc-riverside]; example record `34660912` | Found row `341428`, Spotify `4vJ2nNBA6sxAUN5kLGPq3Q` | No matching title/artist in the metadata scanned |
| I Will Follow You into the Dark / Death Cab for Cutie | [Found][mb-follow] | [Found, 20 returned][lrc-follow]; example record `37481026` | No match among the queried recording IDs; full song coverage unresolved | No matching title/artist in the metadata scanned |
| Down by the Water / The Decemberists | [Found][mb-water] | [Found, 20 returned][lrc-water]; studio record `1772678`, 222 seconds | Found row `607729`, Spotify `7IxWqdG1zG0gaAFYq2q0Iy` | No matching title/artist in the metadata scanned |
| Ring of Fire / Johnny Cash | [Found][mb-ring] | [Found, 20 returned][lrc-ring]; example record `36947252` | Rows `297683`, `432473`, `509130` share Spotify `6YffUZJ2R06kyxyK6onezL` | Multiple matches: iReal-derived charts, Rock Corpus and Wikifonia metadata |
| Nothing Else Matters / Metallica | [Found][mb-nothing] | [Found, 20 returned][lrc-nothing]; example record `29293391` | No match among the queried recording IDs; full song coverage unresolved | iReal-derived, Wikifonia and Uspop matches; Uspop is a live recording |

**What these results prove:** the registry and lyric service return records for all five title/artist pairs. All five initial LRCLIB searches returned nonempty plain and synchronized lyric fields. Twenty is its search cap, not a count of all versions, and lyric presence does not establish lyric accuracy or permission. [Search behavior][lrc-docs], linked queries above.

**Matching failures observed:** the Riverside result labeled Philharmonics had duration 221 seconds, while MusicBrainz also returned a roughly 228-second recording. The I Will Follow You into the Dark results included Plans entries with 50-, 140- and 170-second durations. Nothing Else Matters included an S&M entry with a three-second duration. More-specific album queries subsequently hit HTTP 503 and one timeout; the successful Down by the Water album query included both 95-second and approximately 222-second entries. Do not pick the first hit automatically. These are direct metadata observations from the linked API searches, not verification of lyric text.

The initial MusicBrainz run also encountered two HTTP 503 responses. A later, slower run returned all five queries successfully. Cache and retry behavior matters even for a tiny catalog. [Rate policy][mb-rate].

For Chordonomicon, a full CSV scan compared Spotify IDs from actual catalog lookups and retained only matching IDs and metadata for this report. Up to 20 candidates were queried for each unresolved song. Because releases can have different or replaced Spotify IDs, an unmatched exact ID does **not** demonstrate that the composition is absent. The three positive matches are linked from [Riverside][sp-riverside], [Down by the Water][sp-water], and [Ring of Fire][sp-ring] to the released CSV. Duplicate Ring of Fire IDs do not establish three meaningfully distinct, attributed arrangements. [Dataset file][chord-csv].

ChoCo examples can be inspected directly: [Ring of Fire, iReal chart][choco-ring], [Nothing Else Matters, live annotation][choco-nothing], [iReal metadata][choco-ireal-meta], [Wikifonia metadata][choco-wikifonia-meta], and [Rock Corpus metadata][choco-rock-meta]. “Down By The Riverside” matches were excluded because they are a different song from both requested water-themed titles. ChoCo revision inspected: `5fe168fd55be5c84512abcfbc4e6f1b1f8f0092a`.

For authorized contributions, no sheet or permission was supplied for any of these five: current verified coverage is **none**. For LLM drafts, no complete sheet was verified. For commercial providers, no authenticated customer API key was available, so per-song, per-territory licensable coverage remains **unverified**. These gaps must not be reported as service-wide absence.

## Publish-safe path and cost

| Provider/path | Price established by primary sources in this run | What must be established before adopting |
| --- | --- | --- |
| MusicBrainz registry | Free hosted API for noncommercial use; commercial service plans separate from CC0 core data | Whether future use is commercial; applicable hosted-service plan |
| LRCLIB API | API access free; **no blanket lyric-rights grant** | Separate rights for the particular lyrics and uses |
| Musixmatch lyrics API | Self-serve plans are documented, but the official pricing URL returned HTTP 404 with “Not Allowed”; no current dollar amount verified | Plan/quote, full lyric access, territory coverage, use-case approval, caching/offline and AI permissions |
| LyricFind Lyric Display | Product and sales-enquiry path verified; no public dollar price found on the inspected official product/contact/FAQ pages | Quote and signed scope for lyrics, use case, reporting, territory, caching and offline copies |
| Direct rights-holder contributions/agreements | No fixed price; negotiated grant, potentially no fee from a willing owner | Evidence that the contributor controls every relevant right |

Sources: [MusicBrainz API][mb-api], [LRCLIB terms][lrc-terms], [Musixmatch getting started][mm-start], [official pricing URL][mm-pricing], [LyricFind Lyric Display][lf-display], [contact][lf-contact], [FAQ][lf-faq].

**No reliable total monthly content cost can be quoted from the evidence obtained.** Do not budget around an old “free 2,000 calls/day” or partial-lyrics plan, or an artist-distribution subscription: none was verified as a current full-lyrics application license. Obtain a written quote for this exact accompaniment reader. Prices on unofficial API wrappers are not evidence of a rights grant from the lyric owner.

Musixmatch's current published API terms grant noncommercial digital use by default, require separate written approval for commercial use and public lyric pages, require attribution, and retain an obligation to obtain necessary third-party permissions. They also prohibit using its data with or to prompt AI without prior written approval. A plan purchase alone should not be treated as permission to feed its lyrics to a chord-generation model. [API terms, §§1, 2.1, 2.2.1 and 2.2.14][mm-terms].

Its implementation rules require visible copyright information, provider branding/backlinks, lyric-view tracking and territorial restrictions. A track can be in the catalog but have lyric content withheld in a territory. This adds operational work and third-party tracking to an ad-free app. [Implementation guidelines][mm-guidelines], [tracking][mm-tracking], [restrictions][mm-restrictions].

LyricFind offers static, line-synchronized and word-synchronized lyric display; its official product page routes prospects to an enquiry. Its ordinary website terms govern that website, not a customer redistribution agreement. Do not infer an API caching or arrangement license from those site terms. [Product][lf-display], [website terms][lf-site-terms].

For either provider, request the same concrete package: full lyrics for a web/PWA accompaniment reader, the intended territories, adding and displaying chord annotations, alternate arrangements, transpose/capo handling, corrections, cache duration, offline access, usage reporting, minimum fees, overage fees and termination/deletion requirements. Confirm whether separate music-publishing or arrangement rights remain necessary. This is the recommended procurement scope, not a claim that either provider grants it automatically. Musixmatch expressly retains third-party-permission obligations. [API terms][mm-terms].

## Ranked recommendation and unresolved risks

1. **First cleared catalog:** MusicBrainz identity plus a locally searchable set of complete, reviewed sheets from authorized contributors. Use public-domain material or owner-authorized originals first. This satisfies search-and-play for the prepared set and supports real versions without requiring player-side pasting.
2. **Exact modern-song coverage:** obtain explicit permissions directly, or a lyric-provider agreement approved for this reader plus any required arrangement permissions. Keep content private to the licensed app and separate from the MIT code repository. Coverage and cost are not yet proven.
3. **Selective open annotations:** consider independently cleared ChoCo partitions as editorial inputs where they cover a song. Missing lyrics, alignment and underlying-rights provenance prevent treating ChoCo as a complete solution.
4. **LLM/audio drafts:** use as optional editorial assistance only with permitted inputs and human validation. Never turn an unverified draft into a “ready to play” result automatically.

**Rejected default:** LRCLIB plus Chordonomicon or title-only LLM generation. It has attractive technical breadth, but does not establish the required lyric rights; Chordonomicon additionally violates the source restriction.

Open risks and gaps:

- The five sample songs have no established complete-sheet clearance in this research. Their availability remains blocked on rights, even though metadata and lyrics can be found.
- No paid-provider quote, account-specific terms, authenticated coverage check or display approval was obtained. The Musixmatch pricing page access failure is a specific price-research gap, not evidence that pricing is unpublished.
- Chordonomicon coverage for two titles is unresolved because exact recording-ID checks were negative, not exhaustive title searches.
- No measured complete-sheet accuracy for LLM generation, audio transcription or lyric alignment. The title-only check above is too narrow to supply one.
- Rights-holder contributions do not provide automatic popular-song coverage. Someone must obtain permission, prepare the sheet and listen through it before release.
- Cache/offline requirements depend on the content grant. Preserve source/permission provenance and a way to remove withdrawn content; do not assume an invite or PWA cache overrides terms.

## Reproducing the lookup evidence

No copyrighted lyric text or chord corpus is copied into this repository. The report records metadata, limited chord-vocabulary observations, and source links.

For each table row, query `GET https://musicbrainz.org/ws/2/recording/` with `query=recording:"<title>" AND artist:"<artist>"`, `fmt=json`, and `limit=100`. Use the identifying User-Agent above and no more than one request per second per source IP. Record the status and recording IDs; search result order is not stable. [Query syntax][mb-search], [rate policy][mb-rate].

Query `GET https://lrclib.net/api/search` with `track_name` and `artist_name`. Retain only IDs, title, artist, album, duration and booleans for the presence of `plainLyrics`/`syncedLyrics`. Do not store or publish lyric bodies for this research. The live API can change after this observation date. [API][lrc-docs].

For the positive Chordonomicon matches, read the pinned CSV and select rows where `spotify_song_id` equals one of the three IDs in the coverage table. Full-scan count: 679,807 rows. The Hugging Face filter endpoint initially returned HTTP 500 because its index was loading; coverage above came from scanning the released CSV, not assuming the failed query was empty. [Pinned CSV][chord-csv], [size endpoint][chord-size].

For ChoCo, inspect each partition's `choco/meta.csv`, with `ireal-pro/choco/forum/meta.csv` and both `schubert-winterreise/choco/{audio,score}/meta.csv` as path exceptions. Search normalized title and artist/composer fields together, then inspect the matched JAMS file. `git` revision and direct examples are recorded above. [Partition tree][choco-parts].

## References

All references below are primary documentation, source files, provider pages, published research, statutes or live APIs. Recommendations and engineering inferences are labeled in the text.

[mb-api]: https://musicbrainz.org/doc/MusicBrainz_API
[mb-rate]: https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
[mb-license]: https://musicbrainz.org/doc/About/Data_License
[mb-db]: https://musicbrainz.org/doc/MusicBrainz_Database
[mb-work]: https://musicbrainz.org/doc/Work
[mb-search]: https://musicbrainz.org/doc/MusicBrainz_API/Search
[lrc-docs]: https://lrclib.net/docs.md
[lrc-license]: https://github.com/tranxuanthang/lrclib/blob/main/LICENSE
[lrc-terms]: https://lrclib.net/developers/terms
[lrc-terms-asset]: https://lrclib.net/assets/TermsView-b551c67a.js
[law15]: https://www.gesetze-im-internet.de/urhg/__15.html
[law16]: https://www.gesetze-im-internet.de/urhg/__16.html
[law23]: https://www.gesetze-im-internet.de/urhg/__23.html
[law53]: https://www.gesetze-im-internet.de/urhg/__53.html
[law64]: https://www.gesetze-im-internet.de/urhg/__64.html
[law65]: https://www.gesetze-im-internet.de/urhg/__65.html
[ccby]: https://creativecommons.org/licenses/by/4.0/legalcode.en
[chord-card]: https://huggingface.co/datasets/ailsntua/Chordonomicon/blob/f3a8b678bd65639c01caa342921733f1db01be23/README.md
[chord-code-license]: https://github.com/spyroskantarelis/chordonomicon/blob/main/LICENSE
[chord-paper]: https://arxiv.org/html/2410.22046v1
[chord-csv]: https://huggingface.co/datasets/ailsntua/Chordonomicon/resolve/f3a8b678bd65639c01caa342921733f1db01be23/chordonomicon_v2.csv
[chord-size]: https://datasets-server.huggingface.co/size?dataset=ailsntua%2FChordonomicon
[choco-readme]: https://github.com/smashub/choco/blob/5fe168fd55be5c84512abcfbc4e6f1b1f8f0092a/README.md
[choco-parts]: https://github.com/smashub/choco/tree/5fe168fd55be5c84512abcfbc4e6f1b1f8f0092a/partitions
[choco-ring]: https://github.com/smashub/choco/blob/5fe168fd55be5c84512abcfbc4e6f1b1f8f0092a/partitions/ireal-pro/choco/forum/jams/ireal-pro-forum_206.jams
[choco-nothing]: https://github.com/smashub/choco/blob/5fe168fd55be5c84512abcfbc4e6f1b1f8f0092a/partitions/uspop2002/choco/jams/uspop2002_0.jams
[choco-ireal-meta]: https://github.com/smashub/choco/blob/5fe168fd55be5c84512abcfbc4e6f1b1f8f0092a/partitions/ireal-pro/choco/forum/meta.csv
[choco-wikifonia-meta]: https://github.com/smashub/choco/blob/5fe168fd55be5c84512abcfbc4e6f1b1f8f0092a/partitions/wikifonia/choco/meta.csv
[choco-rock-meta]: https://github.com/smashub/choco/blob/5fe168fd55be5c84512abcfbc4e6f1b1f8f0092a/partitions/rock-corpus/choco/meta.csv
[llm-study]: https://proceedings.mlr.press/v303/carone26a.html
[mm-start]: https://docs.musixmatch.com/getting-started.md
[mm-pricing]: https://www.musixmatch.com/pro/api/pricing
[mm-terms]: https://about.musixmatch.com/apiterms
[mm-guidelines]: https://docs.musixmatch.com/implementation-guidelines.md
[mm-tracking]: https://docs.musixmatch.com/lyrics-views-tracking.md
[mm-restrictions]: https://docs.musixmatch.com/content-restrictions.md
[lf-display]: https://www.lyricfind.com/products/lyric-display
[lf-contact]: https://www.lyricfind.com/contact
[lf-faq]: https://www.lyricfind.com/faq
[lf-site-terms]: https://www.lyricfind.com/terms-and-conditions
[sp-riverside]: https://open.spotify.com/track/4vJ2nNBA6sxAUN5kLGPq3Q
[sp-water]: https://open.spotify.com/track/7IxWqdG1zG0gaAFYq2q0Iy
[sp-ring]: https://open.spotify.com/track/6YffUZJ2R06kyxyK6onezL

[mb-riverside]: https://musicbrainz.org/ws/2/recording/?query=recording%3A%22Riverside%22+AND+artist%3A%22Agnes+Obel%22&fmt=json&limit=100
[lrc-riverside]: https://lrclib.net/api/search?track_name=Riverside&artist_name=Agnes+Obel
[mb-follow]: https://musicbrainz.org/ws/2/recording/?query=recording%3A%22I+Will+Follow+You+into+the+Dark%22+AND+artist%3A%22Death+Cab+for+Cutie%22&fmt=json&limit=100
[lrc-follow]: https://lrclib.net/api/search?track_name=I+Will+Follow+You+into+the+Dark&artist_name=Death+Cab+for+Cutie
[mb-water]: https://musicbrainz.org/ws/2/recording/?query=recording%3A%22Down+by+the+Water%22+AND+artist%3A%22The+Decemberists%22&fmt=json&limit=100
[lrc-water]: https://lrclib.net/api/search?track_name=Down+by+the+Water&artist_name=The+Decemberists
[mb-ring]: https://musicbrainz.org/ws/2/recording/?query=recording%3A%22Ring+of+Fire%22+AND+artist%3A%22Johnny+Cash%22&fmt=json&limit=100
[lrc-ring]: https://lrclib.net/api/search?track_name=Ring+of+Fire&artist_name=Johnny+Cash
[mb-nothing]: https://musicbrainz.org/ws/2/recording/?query=recording%3A%22Nothing+Else+Matters%22+AND+artist%3A%22Metallica%22&fmt=json&limit=100
[lrc-nothing]: https://lrclib.net/api/search?track_name=Nothing+Else+Matters&artist_name=Metallica
