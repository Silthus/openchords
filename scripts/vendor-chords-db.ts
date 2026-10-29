import { playsChord, type Fingering } from "../src/app/chords/fingerings";
import { chordSuffixes, readChord, type Chord } from "../src/sheet";

type Entry = { suffix: string; positions: Fingering[] };

const source = "https://raw.githubusercontent.com/tombatossals/chords-db/df06fa7";
const target = new URL("../src/app/chords/chords-db/", import.meta.url);
const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const dbRoots = ["C", "Csharp", "D", "Eb", "E", "F", "Fsharp", "G", "Ab", "A", "Bb", "B"];

function chordOf(root: number, dbSuffix: string): Chord | null {
  const [quality = "", bass] = dbSuffix.split("/");
  const suffix = { major: "", minor: "m" }[quality] ?? quality;
  if (!chordSuffixes.includes(suffix)) return null;
  if (bass === undefined) return { written: "", root, suffix };
  return { written: "", root, suffix, bass: readChord(bass)!.root };
}

function keyOf({ suffix, bass }: Chord) {
  return bass === undefined ? suffix : `${suffix}/${sharpNames[bass]}`;
}

function firstPositionPlaying(chord: Chord, { positions }: Entry) {
  const position = positions.find((fingering) => playsChord(fingering, chord));
  if (!position) return null;
  const { frets, fingers, barres, baseFret } = position;
  return { frets, fingers, barres, baseFret };
}

const guitar = (await (await fetch(`${source}/lib/guitar.json`)).json()) as { chords: Record<string, Entry[]> };
const fingerings = Object.fromEntries(
  dbRoots.map((dbRoot, root) => [
    sharpNames[root],
    Object.fromEntries(guitar.chords[dbRoot]!.flatMap((entry) => {
      const chord = chordOf(root, entry.suffix);
      const fingering = chord && firstPositionPlaying(chord, entry);
      return chord && fingering ? [[keyOf(chord), fingering]] : [];
    })),
  ]),
);

await Bun.write(new URL("guitar.json", target), JSON.stringify(fingerings));
await Bun.write(new URL("LICENSE", target), await (await fetch(`${source}/LICENSE`)).text());
