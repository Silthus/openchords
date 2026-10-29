import type { BuiltInSong } from "./song";

const classic = `{title: House of the Rising Sun}
{artist: Traditional}
{key: Am}
{capo: 0}

{comment: Verse 1}
There [Am]is a [C]house in [D]New [F]Orleans
They [Am]call the [C]Rising [E]Sun
And it's [Am]been the [C]ruin of [D]many a poor [F]girl
And [Am]me, oh [E]Lord, for [Am]one [E]

{comment: Verse 2}
If [Am]I had [C]listened [D]what Mama [F]said
I'd [Am]be at [C]home [E]today
Being [Am]so young and [C]foolish, [D]poor [F]girl
Let a [Am]rambler [E]lead me [Am]astray [E]

{comment: Verse 3}
Go [Am]tell my [C]baby [D]sister [F]dear
To [Am]never [C]do like I [E]done
To [Am]shun that [C]house in [D]New [F]Orleans
They [Am]call the [E]Rising [Am]Sun [E]

{comment: Verse 4}
One [Am]foot is [C]on the [D]plat[F]form
And the [Am]other [C]one on the [E]train
I'm [Am]going [C]back to [D]New [F]Orleans
To [Am]wear that [E]ball and [Am]chain [E]
`;

function withChords(chordPro: string, swaps: Record<string, string>, capo = 0) {
  return chordPro
    .replace(/\[([^\]]+)\]/g, (mark, chord: string) => (swaps[chord] ? `[${swaps[chord]}]` : mark))
    .replace("{capo: 0}", `{capo: ${capo}}`);
}

export const houseOfTheRisingSun: BuiltInSong = {
  builtInId: "house-of-the-rising-sun",
  sheets: [
    { name: "Classic", chordPro: classic },
    { name: "Easy shapes", chordPro: withChords(classic, { Am: "Em", C: "G", D: "A", F: "C", E: "B7" }, 5) },
    { name: "Bluesy", chordPro: withChords(classic, { Am: "Am7", F: "Fmaj7", E: "E7" }) },
  ],
};
