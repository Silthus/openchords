import { chordSuffixes } from "../src/sheet";

type Position = { frets: number[]; fingers: number[]; barres: number[]; baseFret: number };
type Entry = { suffix: string; positions: Position[] };

const source = "https://raw.githubusercontent.com/tombatossals/chords-db/df06fa7";
const target = new URL("../src/app/chords/chords-db/", import.meta.url);
const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const dbRoots = ["C", "Csharp", "D", "Eb", "E", "F", "Fsharp", "G", "Ab", "A", "Bb", "B"];
const dbBasses = [["C"], ["C#", "Db"], ["D"], ["D#", "Eb"], ["E"], ["F"], ["F#", "Gb"], ["G"], ["G#", "Ab"], ["A"], ["A#", "Bb"], ["B"]];

function ourSuffix(dbSuffix: string) {
  const [quality = "", bass] = dbSuffix.split("/");
  const suffix = { major: "", minor: "m" }[quality] ?? quality;
  if (!chordSuffixes.includes(suffix)) return null;
  if (bass === undefined) return suffix;
  const bassIndex = dbBasses.findIndex((names) => names.includes(bass));
  return `${suffix}/${sharpNames[bassIndex]}`;
}

function firstPosition({ positions: [first] }: Entry) {
  const { frets, fingers, barres, baseFret } = first!;
  return { frets, fingers, barres, baseFret };
}

const guitar = (await (await fetch(`${source}/lib/guitar.json`)).json()) as { chords: Record<string, Entry[]> };
const fingerings = Object.fromEntries(
  dbRoots.map((dbRoot, root) => [
    sharpNames[root],
    Object.fromEntries(guitar.chords[dbRoot]!.flatMap((entry) => {
      const suffix = ourSuffix(entry.suffix);
      return suffix === null ? [] : [[suffix, firstPosition(entry)]];
    })),
  ]),
);

await Bun.write(new URL("guitar.json", target), JSON.stringify(fingerings));
await Bun.write(new URL("LICENSE", target), await (await fetch(`${source}/LICENSE`)).text());
