# Chord domain primer: diagrams, fingerings, capo, transpose, names, sheet formats, libraries

Written 2026-10-29 for the OpenChords prototype and spec work. Audience: a developer with no guitar experience.
Every fact carries a source. Anything marked **(call)** is a design recommendation, not a sourced fact.

Measured items (bundle sizes, data counts, the capo experiment) were produced by installing the packages
in a scratch directory on 2026-10-29: `svguitar@2.10.1`, `@tombatossals/chords-db@0.5.1` (npm) and the
`master` branch of `tombatossals/chords-db` (package version 0.6.0, commit `df06fa7`), `chord-symbol@4.0.0`, `tonal@6.5.1`.

## 1. Guitar in five lines

- A guitar has 6 strings. In standard tuning they are, lowest-sounding to highest: E A D G B E. [Wikipedia: Guitar chord](https://en.wikipedia.org/wiki/Guitar_chord)
- Strings are numbered the other way round: string 6 is the lowest (thickest), string 1 is the highest. (Convention used by svguitar's API; confirmed in its source: `toArrayIndex(i) = |i − strings|`, so string 6 draws leftmost.) [svguitar source](https://github.com/omnibrain/svguitar)
- Frets are the metal bars along the neck. Pressing a string just behind a fret shortens the vibrating part and raises the pitch. One fret is one semitone (the smallest step on a piano). [Wikipedia: Capo (musical device)](https://en.wikipedia.org/wiki/Capo_(musical_device)) says a capo "creates the same musical effect as retuning all strings up the same number of steps"; the one-fret-one-semitone equivalence is standard music theory, not stated verbatim there.
- An **open string** is played with no finger on it. Chords that use open strings are easier and so are played far more in popular music: "chords that contain open notes are more easily played and hence more frequently played in popular music." [Wikipedia: Guitar chord](https://en.wikipedia.org/wiki/Guitar_chord)
- A **barre** is one finger laid flat across several strings. Wikipedia: "The B major and F major chords are commonly played as barre chords, with the first finger depressing five–six strings." That barre chords are harder for beginners is common teaching knowledge; the Wikipedia article does not say it outright. [Wikipedia: Guitar chord](https://en.wikipedia.org/wiki/Guitar_chord)

## 2. Chord diagrams

A chord diagram is "a schematic view of the fretboard with markings for the frets that should be pressed when playing the chord". [Wikipedia: Chord diagram (guitar)](https://en.wikipedia.org/wiki/Chord_diagram_(guitar))

How to read one. Wikipedia's guitar-chord article gives the orientation: "Standard tuning, read from left to right, low E to high e. The low E is on the left." The symbol meanings below are the common convention (no fetched primary source spells them out; the data models in section 2.1 encode each of them):

| Element | Meaning |
| --- | --- |
| Vertical lines | The 6 strings. Leftmost = lowest (thick low E). |
| Horizontal lines | Frets. The thick top line is the nut (the end of the neck) when the diagram starts at fret 1. |
| Dot on a string between two lines | Put a finger there. |
| Number in the dot | Which finger: 1 index, 2 middle, 3 ring, 4 pinky. |
| `O` above a string | Play this string open. |
| `X` above a string | Do not play this string (muted or left out). |
| Dot-wide bar across several strings | A barre. |
| Number beside the diagram (such as "3fr") | The diagram starts higher up the neck: the **base fret**. |

### 2.1 The two data models you will meet

**chords-db** (JSON; MIT). One entry per chord, with up to 5 positions (fingerings) each: [chords-db `lib/guitar.json`](https://github.com/tombatossals/chords-db/blob/master/lib/guitar.json)

```json
{"key":"C","suffix":"major","positions":[
  {"frets":[-1,3,2,0,1,0],"fingers":[0,3,2,0,1,0],"baseFret":1,"barres":[],"midi":[48,52,55,60,64]},
  {"frets":[1,1,3,3,3,1],"fingers":[1,1,2,3,4,1],"barres":[1],"capo":true,"baseFret":3,"midi":[43,48,55,60,64,67]}
]}
```

- `frets` has one number per string, **index 0 = lowest string (6th)**. `-1` = muted, `0` = open, `n ≥ 1` = fret number **relative to `baseFret`** (so with `baseFret: 3`, `frets: [1,1,3,3,3,1]` means absolute frets 3,3,5,5,5,3, an A major barre shape).
- `fingers`: 0 = no finger (open or muted), 1–4 = finger.
- `barres`: the relative fret numbers where a barre lies. `capo: true` marks a barre that a capo could imitate.
- Measured: the first position of C major is the open shape (x32010); the same chord also has barre shapes higher up the neck.

**svguitar** (draws the SVG; MIT) takes: `fingers: [stringNumber, fret | 'x' | 0, text?][]`, `barres: {fromString, toString, fret, text?}[]`, `position` (the base fret) and `title`. String numbers follow guitar numbering (6 = low E). [svguitar README](https://github.com/omnibrain/svguitar#usage)

Mapping chords-db to svguitar is mechanical **(call)**:

```
for i in 0..5:  string = 6 - i
  frets[i] == -1 -> [string, 'x']
  frets[i] ==  0 -> [string, 0]
  else           -> [string, frets[i], String(fingers[i])]
barres: for each fret f in barres:
  fromString = the highest string number whose frets[i] == f
  toString   = the lowest string number whose frets[i] == f
  fret = f
position = baseFret
```

ChordPro's `define` directive uses the same left (lowest) to right order, `0` for open, `-1`/`N`/`x` for not played, and `base-fret` for the offset: `{define: Am base-fret 1 frets 0 2 2 1 0 0}`. So chords-db rows convert one-to-one to ChordPro `define` lines. [ChordPro: define](https://www.chordpro.org/chordpro/directives-define/)

## 3. Which fingering is "the easy one", and how players choose among shapes

- Many chords can be played "with the same notes in more than one place on the fretboard." There are "separate chord forms for chords having their root note on the third, fourth, fifth, and sixth strings." [Wikipedia: Guitar chord](https://en.wikipedia.org/wiki/Guitar_chord)
- Ultimate Guitar's own help describes its chord view as "simplified fretboard diagrams with tablature for easier play", plus a **Simplify** button ("Make chords easier to play with simplified versions"; "not every Tab have this button") and a **Transpose** button. [UG help: app tabs quick guide](https://help.ultimate-guitar.com/en/articles/6741306-ultimate-guitar-app-tabs-quick-guide) Its help page says nothing about capo or about alternative fingerings. A forum review of the Android app (about 8 years old) says a tap on a chord opens a popup with arrows to page through other ways to play it, with Em having 26 variations. [Acoustic Guitar Forum review](https://www.acousticguitarforum.com/forums/showthread.php?p=5802569) UG's current UI was not verified.
- How a beginner picks (practice, not a cited rule; this is how every free chord source ranks shapes) **(call)**:
  1. Open position, no barre (`baseFret == 1` and `barres == []`). Lowest friction.
  2. Open position with a barre (the F chord, the Bm chord).
  3. Barre shapes higher up the neck (E-shape and A-shape barres).
  4. Higher-up partial shapes (3-4 string "triad" voicings).
- Measured on chords-db: the first listed position is open with no barre for 294 of 529 chord entries in the npm release (major: 6 of 12 roots, minor: 7 of 12, 7: 8 of 12; dim: 12 of 12). The first position is **not always** open even where an open shape exists elsewhere in the list, so rank by the rule above instead of trusting list order. **(call)**
- The spec should therefore: show the lowest-difficulty position first, let the user page through the others (a swipe or arrows, with a position counter), and remember the user's pick per chord **(call)**.

## 4. Capo and transpose

- A capo "uses a fret of an instrument to create a new nut at a higher note than the instrument's actual nut." Players use it to "play in a different key using the same fingerings as playing open." Most capos "raise all strings"; partial capos cover only some. [Wikipedia: Capo (musical device)](https://en.wikipedia.org/wiki/Capo_(musical_device))
- **Capo n = shapes sound n semitones higher than written.** The song's real key is the chord names you would play without the capo. The player plays *shapes* named n semitones lower. So: shapes = original chords transposed **down** n; the audience hears the original chords.
- ChordPro encodes exactly this: with `{key: C}` and `{capo: 2}`, "the player still sees C, while the listener hears D" (the key is relative to the shapes; the sounding key is raised by the capo). `{capo: 2}` or `{meta: capo 2}` is the syntax. [ChordPro: capo](https://www.chordpro.org/chordpro/directives-capo/)
- How a sheet shows "Capo 2": as a header line (a user review says the app shows the capo position with the song when there is one; UG's help page is silent), or as ChordPro `{capo: 2}`. The chords printed on the sheet are normally the *shapes*, not the sounding chords. **(call)** Treat printed chords as shapes.
- **Transpose** changes every chord name by n semitones (the sounding key changes; you sing higher or lower). **Capo** keeps the sounding key but changes which shapes you play. They combine: transpose by `t`, capo `c` means shapes = original chords transposed by `t − c`. Two controls, one formula. **(call)**
- Spelling: when transposing, choose sharps or flats to suit the target key (a song in F# uses sharps; in Bb uses flats). The chord sets for key spelling: `C C# D Eb E F F# G Ab A Bb B` is the spelling chords-db itself uses. [chords-db `lib/guitar.json`](https://github.com/tombatossals/chords-db/blob/master/lib/guitar.json)

### 4.1 Picking an easier key: "fewest barre chords" algorithm **(call, prototyped)**

For capo values 0 to 7 (beyond 7 the neck is too cramped and a capo up there is rare **(call)**), transpose every chord of the song down by that many semitones, then score each candidate by how many of the resulting chords have an open, no-barre position in chords-db. Pick the highest score; break ties by smaller capo number. I ran it on chords-db data:

| Song chords | Best option | Result |
| --- | --- | --- |
| F#m A E D | Capo 2 | Em G D C, 4 of 4 open (capo 0 gives only 3 of 4) |
| Bb F Gm Eb | Capo 3 | G D Em C, 4 of 4 open (capo 0 gives 2 of 4) |
| Am F C G | Capo 0 | 3 of 4 open (only F is a barre); capo 1 scores 1 of 4, so the capo does not help |

The scoring should weigh a "hard" chord (barre with 6 strings) heavier than a "medium" one. For slash and extended chords the db has few shapes, so fall back to the base triad's difficulty.

## 5. Chord names: the grammar a parser must read

### 5.1 International (English) names

From the Wikipedia chord-notation article, with ChordPro adding its tolerated forms:

- **Root:** `A`–`G`, then optional `#` or `b`. [ChordPro: chords](https://www.chordpro.org/chordpro/chordpro-chords/)
- **Quality:** none or `M`/`Maj` = major; `m`, `min`, `mi`, `-` = minor; `+` or `aug` = augmented; `o` or `dim` = diminished; `ø`/`m7b5` = half-diminished; lowercase root (`c`) = minor in some books. [Wikipedia: Chord notation](https://en.wikipedia.org/wiki/Chord_notation)
- **Seventh / extensions:** `7`, `maj7` (also `M7`, `Ma7`, `Δ7`; Δ is ambiguous), `9`, `11`, `13`; "C13 implies that 3, 5, 7, 9, and 11 are also there"; an even number such as `6` "implies that only that one extra note has been added"; `add9` adds without a seventh; `sus` alone "implied" `sus4`. [Wikipedia: Chord notation](https://en.wikipedia.org/wiki/Chord_notation)
- **Altered tones:** `b5`, `#5`, `b9`, `#9`, `#11`, `b13`.
- **Slash (bass) chords:** `D/F#`, `Am/E`; "the letter following the slash indicates the new bass note." The bass can lie outside the chord (`C/Ab`, `Am/D`). [Wikipedia: Guitar chord](https://en.wikipedia.org/wiki/Guitar_chord) and [Chord notation](https://en.wikipedia.org/wiki/Chord_notation)
- **No chord:** `N.C.` means play no chord. [Wikipedia: Chord notation](https://en.wikipedia.org/wiki/Chord_notation)
- ChordPro (the format's own spec) calls the parts `root`, `qual`, `ext`, `bass`; "Minor chords can use `m`, `mi`, `min` and `-`" and `^` is an alternative for `maj`; extensions like `maj7`, `7sus4`, `m7b5`, `add9`, `13#11`. [ChordPro: chords](https://www.chordpro.org/chordpro/chordpro-chords/)

Suggested parser grammar **(call)**; it covers everything above plus German:

```
chord   = root quality? ext* alt* ("/" root)?
root    = [A-H] ("#" | "b" | "is" | "es" | "s")?     // see section 5.2 for -is/-es/H/B
quality = "m" | "min" | "mi" | "-" | "maj" | "M" | "dim" | "o" | "aug" | "+" | "sus" | "sus2" | "sus4"
ext     = "6" | "7" | "9" | "11" | "13" | "69" | "add9" | "add11" | "maj7" | "M7" | "Δ"
alt     = ("b" | "#") ("5" | "9" | "11" | "13") | "(" ... ")"
```

Model a parsed chord as `{ root, quality, ext, bass }` with the original text kept (the sheet shows names as written, per the map's decision), and transpose by rewriting `root` and `bass` only; this is what ChordPro does, which requires "at least a root property" for transposition. [ChordPro: chords](https://www.chordpro.org/chordpro/chordpro-chords/)

### 5.2 German names (and the H/B trap)

- "In current German music terminology, H is used instead of B♮ (B natural), and B instead of B♭ (B flat)." [Wikipedia: Musical note](https://en.wikipedia.org/wiki/Musical_note) So **German `H` = English `B`; German `B` = English `Bb`.** Same letters, two meanings: the only truly ambiguous name is a bare `B`.
- Sharp/flat suffixes: "-is" = sharp (`Fis` = F♯, `Cis`, `Gis`), "-es" = flat, "-s" after a vowel (`Es` = E♭, `As` = A♭, `Des`, `Ges`). German flat row: `Des Es Ges As B`. [Wikipedia: Musical note](https://en.wikipedia.org/wiki/Musical_note) Guitar sheets mix these with the shorthand `b`/`#` (people write `Fis`, `F#`, or both).
- Countries: Austria, Czechia, Germany, Denmark, Estonia, Finland, Hungary, Iceland, Norway, Poland, Serbia, Slovakia, Slovenia, Sweden, Switzerland. [Wikipedia: Musical note](https://en.wikipedia.org/wiki/Musical_note)
- Minor/major words on German sheets: `Hm` or `Hmoll`; `Am` is the same as English; major is plain (`C`); some use `dur`/`moll`. Seven chords use `7`, major seventh `maj7` or `Δ`. This vocabulary is not in the primary sources I could fetch; treat as practice. **(call)** Expect `Hm`, `H7`, `Hsus4`, `Es`, `As`, `Fis`, `B`. Accept `Hmoll` only if tests show real sheets use it.
- ChordPro itself reads both: it supports "A, B, C, …, G (European/Dutch), H (German)" and can also read Roman and Nashville numbers. It does not explain H versus B. [ChordPro: chords](https://www.chordpro.org/chordpro/chordpro-chords/)
- `chord-symbol@4.0.0` (MIT) parsed `Hm` as B minor and `H7` as B7 in a test I ran (it has a `notationSystems` option); `B` stays B, and `Hmoll` fails to parse.

#### How to tell which one a sheet uses **(call)**

Per sheet, scan all parsed chord tokens, in this order:

1. Any token starts with `H` (`H`, `Hm`, `H7`), or any root uses `Fis`, `Cis`, `Gis`, `Dis`, `Ais`, `Es`, `As`, `Des`, `Ges`, `Ces` => **German**. (`H` and `Es`/`As` never occur in English chords.)
2. Any token is `Bb`, `Bbm`, `Eb`, `Ab`, `Db`, `Gb`, `F#`, `C#` => **international**. (`Bb` is not valid German.)
3. Otherwise there is only a bare `B`/`Bm`, or no B at all => **international** by default, because most of the sheets will be English. Flag as ambiguous when `B` occurs without any other evidence, and let the user flip a per-sheet setting; store it with the sheet.
4. A sheet that contains both `H` and `B` is German with `B` = B♭. A sheet that contains `H` and `Bb` is mixed or wrong: surface it, do not guess.

Rendering: the app shows names as the sheet wrote them (per the map's decision), but transposing needs the system to be known: German `B` must shift as B♭, not as B natural. Parse to an internal pitch class and write back in the sheet's own system.

## 6. Chord-sheet formats and telling chord lines from lyric lines

### 6.1 The two formats

**Chords above the lyrics** (what Ultimate Guitar shows; plain text, monospaced):

```
[Verse 1]
Am              F
I will follow you into the dark
```

The chord sits above the syllable where it changes. Position = column index in the line above.

**ChordPro** (open standard; chords inline in brackets): [ChordPro: chords](https://www.chordpro.org/chordpro/chordpro-chords/)

```
{title: Swing Low Sweet Chariot}
{start_of_verse: Verse 1}
I [D]looked over Jordan, and [G]what did I [D]see
{end_of_verse}
```

- Chords go "between brackets `[` and `]`"; an opening `*` marks a text annotation (`[*Coda]`).
- Directives are `{name: value}`; short forms exist (`t`, `st`, `c`, `soc`/`eoc`, `sov`/`eov`), but the spec recommends the full names. Core ones: `title`, `subtitle`, `artist`, `key`, `capo`, `define`, `start_of_chorus`/`end_of_chorus`, `start_of_verse`/`end_of_verse`, `comment`. [ChordPro: directives](https://www.chordpro.org/chordpro/chordpro-directives/)
- `{capo: 2}` and `{define: Am base-fret 1 frets 0 2 2 1 0 0 fingers ...}` carry the capo and custom chord diagrams. [capo](https://www.chordpro.org/chordpro/directives-capo/), [define](https://www.chordpro.org/chordpro/directives-define/)
- Two parsing modes: *strict* (extension must be a known name) and *relaxed* (any extension; `[Coda]` becomes root C + extension `oda`). So bracket text that is not a chord must be marked with `*`, and a parser should treat unknown brackets as annotations, not chords. [ChordPro: chords](https://www.chordpro.org/chordpro/chordpro-chords/)
- The reference implementation: [chordpro/chordpro](https://github.com/chordpro/chordpro) (Perl; GitHub reports its licence as NOASSERTION, so do not link code from it).

**(call)** Make ChordPro the internal storage format: it is a published standard, round-trips to chords-over-lyrics, and per-line chord position is just an offset into the lyric string. Convert the chords-above format into it once, on import.

### 6.2 Telling a chord line from a lyric line (plain format) **(call)**

A line is a *chord line* when after trimming, splitting on spaces, and ignoring separators (`|`, `-`, `/` repeats, `x2`, `(...)`), at least ~80% of tokens parse as chords and the line has at least one token. Words the English language shares with chord names are the trap:

- `A` is both a chord and an English article. A lyric line "A little more" has one chord token out of three, so the 80% rule rejects it. A line that is just `A` is ambiguous: accept it as a chord line only when the neighbouring lines in the section are chord lines or the next line is a lyric line.
- `Am` is both a chord and a verb: "Am I" has one chord token out of two and is rejected by the 80% rule. `Dad` and `Bad` are not valid chords.
- German `H`: a lyric starting with `H` such as "Hallo" is not a valid chord; only whole tokens count.
- Spacing is the strongest signal: chord lines have wide gaps of spaces inside the line; lyric lines rarely do. Use it as a tie-breaker.
- Section markers such as `[Verse 1]`, `[Chorus]`, `Intro:`, `x2` are neither chords nor lyrics: match them before the chord-line test.
- A chord line directly above a lyric line merges into ChordPro by inserting `[chord]` at the same column offset in the lyric. A chord line followed by another chord line or a blank line is an instrumental line: keep it as a chord-only line.

This is what the whole ecosystem of "chords over lyrics" parsers does in some form; the exact thresholds above are mine. **(call)** Validate against real, publicly-licensed sheets before the spec fixes them.

## 7. Libraries and data (licences checked 2026-10-29)

| Library | Purpose | Licence | State | Notes |
| --- | --- | --- | --- | --- |
| [svguitar](https://github.com/omnibrain/svguitar) 2.10.1 | Draw a chord diagram as SVG | MIT (`LICENSE` read) | Active: last release 2026-10-17; also published as `@svguitar/core` | Deps: `@svgdotjs/svg.js`, `roughjs`, `svgdom` (Node only). Built-ins: `title`, `position`, `barres`, `orientation`, `leftHanded`, `style: 'handdrawn'`. Browser bundle with esbuild, minified: **170 KB, 69 KB gzipped** (single `SVGuitarChord` import). Needs a DOM; use in `useEffect` with a ref, or render once to an SVG string. Not tree-shakeable below that size. |
| [chords-db](https://github.com/tombatossals/chords-db) | Fingerings (JSON) | MIT (`LICENSE` read) | npm `0.5.1` is from June 2022; GitHub `master` (0.6.0) is newer (last commit 2025-10-14) | **npm is stale: use the repo.** npm guitar.json: 238 KB (26 KB gzip), 2069 positions, 63 suffixes. `master` guitar.json: 378 KB (40 KB gzip), 828 chords, 3283 positions, 82 suffixes. Chords exist for all 12 roots under the keys `C Csharp D Eb E F Fsharp G Ab A Bb B`. In the npm data, slash chords exist only under the root keys C, D, E, F, G and A. Do not `import` the whole file on the first page: split it by root or load on demand. |
| [chord-symbol](https://github.com/no-chris/chord-symbol) 4.0.0 | Parse and render chord names, transpose, `notationSystems` | MIT | Last commit 2023-12; stable | Minified, tree-shaken: **50 KB, 19 KB gzipped** for the parser and renderer. Parsed all my test names (`Am7`, `Csus4`, `D/F#`, `Bb`, `Hm`, `H7`, `F#m7b5`, `A6/9`, `Em7/D`); `Hmoll` fails. Gives `rootNote`, `quality`, `formatted.symbol`. Normalizes names (`Am7` -> `Ami7`), so keep the original text for display. |
| [tonal](https://github.com/tonaljs/tonal) 6.5.1 | General music theory: notes, intervals, chord types, transpose | MIT (npm metadata; GitHub reports no licence file) | Active, last push 2026-10-14 | `Chord.get("Am7")` and `Note.transpose("C","2M")` imported from `tonal`: **26 KB minified, 9.5 KB gzipped** after tree shaking. Use `@tonaljs/note` and `@tonaljs/chord` directly for smaller bundles. It does not read German names or `H`. |
| [react-chords](https://github.com/tombatossals/react-chords) | React wrapper around chords-db | MIT | pushed 2025-10-15 | Draws its own SVG; skip it: svguitar is more featureful, and OpenChords wants Tailwind-styled output. |
| [ChordSheetJS](https://github.com/martijnversluis/ChordSheetJS) | Parse and render chord sheets | **GPL-2.0** | Active | **Excluded** by the licence rule. |
| [chord-fingering](https://www.npmjs.com/package/chord-fingering) | Generate fingerings from a chord name | **GPL-3.0-only** (npm `package.json`) | 1.0.2 | **Excluded**. |
| [chordproject-parser](https://github.com/chordproject/chordproject-parser) | ChordPro parser | AGPL-3.0 | | **Excluded**. |
| `vexchords` | Chord diagrams | MIT (npm) | last published 2022-05 | Older, less maintained than svguitar; skip. |

Takeaways **(call)**:

1. **Render:** svguitar. **Data:** vendor the `lib/guitar.json` of chords-db at a pinned commit (`df06fa7`) into the repo with its MIT licence, rather than depending on the stale npm package; this also lets us drop unused suffixes and split by root to cut the 40 KB gzipped payload. Keep the `LICENSE` text alongside the data file (MIT requires the notice).
2. **Names:** write a small in-house parser for the grammar above (it has to read German names, which `chord-symbol` only partly does), or wrap `chord-symbol` as the base and add the German front-end (`H`/`B`/`-is`/`-es` rewriting before parse, and back after). Which of the two is the better build is a call for the spec; a hand-written parser is about 150 lines for the grammar in 5.1, and its test table is the same as for the wrapper.
3. **Transpose maths:** 12-step pitch class arithmetic. Neither `tonal` nor `chord-symbol` is needed for this alone; take them only if the spec needs chord-type analysis. Avoid pulling both.
4. **ChordPro parsing:** no MIT parser was found that is also current (ChordSheetJS is GPL; chordproject-parser is AGPL). The format is small enough to write a parser for in-house (brackets, directives, comments). Pick it up in the spec.
5. Do not use [Chordonomicon](https://huggingface.co/datasets/ailsntua/Chordonomicon) or any dataset taken from Ultimate Guitar for chord lookup. Chords-db is self-contained and open.

## 8. Open risks

- **chords-db coverage:** common chord types are well covered, but slash chords are sparse (none under `C#`, `Eb`, `F#`, `Ab`, `Bb`, `B` in the npm data), and some suffixes are missing entirely. The diagram view needs a fallback for a chord that has no entry: draw the diagram for the base chord and label it, or show no diagram. Do not leave a tap on a chord with an empty popup.
- **Enharmonic spelling:** chords-db is keyed by one spelling per pitch (`C#` stored as `Csharp`; `Eb`, `Ab`, `Bb`, `F#` but not `Db`, `G#`, `A#`, `D#`). The lookup must normalize `Db` to `C#` and so on.
- **chords-db data quality:** it is community-maintained; a handful of fingerings may be wrong or awkward. Spot-check the 20 chords the first songs need before trusting it.
- **Left-handed players:** svguitar has a `leftHanded` option; add it to the settings if needed.
- **Capo for beginners** is a UI risk more than a data risk: "Capo 2" must show both what to put on the neck and which shape names to play. The spec should say which the sheet shows by default.
- **German detection** is heuristic (see 5.2). Keep a per-sheet override; a wrong guess silently shifts `B`/`H` by a semitone when transposing.
- The UG user-interface claims in section 3 come from UG's help page plus an old user review; UG's current UI was not tested. Read nothing from Ultimate Guitar's content itself, as the legal bar demands.

## 9. Sources

- Wikipedia: [Guitar chord](https://en.wikipedia.org/wiki/Guitar_chord), [Chord diagram (guitar)](https://en.wikipedia.org/wiki/Chord_diagram_(guitar)), [Capo (musical device)](https://en.wikipedia.org/wiki/Capo_(musical_device)), [Chord notation](https://en.wikipedia.org/wiki/Chord_notation), [Musical note](https://en.wikipedia.org/wiki/Musical_note). These are secondary sources (no standards body owns guitar chord diagrams or German note names). Page text quoted as retrieved on 2026-10-29.
- ChordPro (the format's own documentation): [chords](https://www.chordpro.org/chordpro/chordpro-chords/), [directives](https://www.chordpro.org/chordpro/chordpro-directives/), [capo](https://www.chordpro.org/chordpro/directives-capo/), [define](https://www.chordpro.org/chordpro/directives-define/).
- Ultimate Guitar: [app tabs quick guide](https://help.ultimate-guitar.com/en/articles/6741306-ultimate-guitar-app-tabs-quick-guide) (first-party), [Acoustic Guitar Forum review](https://www.acousticguitarforum.com/forums/showthread.php?p=5802569) (user review, about 8 years old).
- Source and data: [svguitar](https://github.com/omnibrain/svguitar), [chords-db](https://github.com/tombatossals/chords-db), [chord-symbol](https://github.com/no-chris/chord-symbol), [tonal](https://github.com/tonaljs/tonal), [ChordSheetJS](https://github.com/martijnversluis/ChordSheetJS), [chord-fingering](https://www.npmjs.com/package/chord-fingering).
