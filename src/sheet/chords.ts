import type { ParsedSheet } from ".";

export type Notation = "international" | "german";
export type Chord = { written: string; root: number; suffix: string; bass?: number };

const intervals: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "5": [0, 7],
  "6": [0, 4, 7, 9],
  "69": [0, 4, 7, 9, 2],
  "7": [0, 4, 7, 10],
  "9": [0, 4, 7, 10, 2],
  "11": [0, 4, 7, 10, 2, 5],
  "13": [0, 4, 7, 10, 2, 5, 9],
  add9: [0, 4, 7, 2],
  add11: [0, 4, 7, 5],
  madd9: [0, 3, 7, 2],
  m6: [0, 3, 7, 9],
  m69: [0, 3, 7, 9, 2],
  m7: [0, 3, 7, 10],
  m9: [0, 3, 7, 10, 2],
  m11: [0, 3, 7, 10, 2, 5],
  maj7: [0, 4, 7, 11],
  maj9: [0, 4, 7, 11, 2],
  mmaj7: [0, 3, 7, 11],
  m7b5: [0, 3, 6, 10],
  "7b5": [0, 4, 6, 10],
  "7b9": [0, 4, 7, 10, 1],
  "7#9": [0, 4, 7, 10, 3],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "7sus4": [0, 5, 7, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  aug7: [0, 4, 8, 10],
};

export const chordSuffixes = Object.keys(intervals);

const perfectFifth = 7;
const droppableIntervals: Record<string, number[]> = { "5": [], "11": [7, 2], m11: [7, 2], "13": [7, 2, 5] };

const naturals: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, H: 11 };
const accidentals: Array<[string, number]> = [
  ["is", 1],
  ["es", -1],
  ["#", 1],
  ["b", -1],
  ["s", -1],
  ["", 0],
];
const germanAccidentals = ["is", "es", "s"];
const spellings: Array<[RegExp, string]> = [
  [/^(moll|min|mi|-)/, "m"],
  [/^(dur|M|Maj|maj)$/, ""],
  [/^(Δ|\^)$/, "maj7"],
  [/^(Maj|Ma|M|Δ|\^)(?=\d)/, "maj"],
  [/^o$/, "dim"],
  [/^o7$/, "dim7"],
  [/^ø7?$/, "m7b5"],
  [/^\+/, "aug"],
  [/^sus$/, "sus4"],
  [/^7sus$/, "7sus4"],
];

export function readChord(written: string, notation: Notation = "international"): Chord | null {
  return read(written, notation)?.chord ?? null;
}

export function isChord(text: string): boolean {
  return readChord(text) !== null;
}

export function notationOf(writtenChords: readonly string[]): Notation {
  return writtenChords.some((written) => read(written, "german")?.german) ? "german" : "international";
}

export function chordTones({ root, suffix, bass }: Chord): number[] {
  const tones = intervals[suffix]!.map((interval) => (root + interval) % 12);
  return bass === undefined ? tones : [...tones, bass];
}

export function essentialTones({ root, suffix }: Chord): number[] {
  const droppable = droppableIntervals[suffix] ?? [perfectFifth];
  return intervals[suffix]!.filter((interval) => !droppable.includes(interval)).map((interval) => (root + interval) % 12);
}

export function chordsIn(sheet: ParsedSheet): Chord[] {
  const written = writtenChordsOf(sheet);
  const notation = notationOf(written);
  return written.flatMap((text) => readChord(text, notation) ?? []);
}

export function writtenChordsOf(sheet: ParsedSheet) {
  const words = sheet.sections.flatMap((section) => section.lines.flatMap((line) => line.words));
  return [...new Set(words.flatMap((word) => word.chords))];
}

function read(written: string, notation: Notation) {
  const [main = "", bassName, ...extra] = written.split("/");
  if (extra.length > 0) return null;
  const name = readName(main, notation);
  if (!name) return null;
  const chord = { written, root: name.root, suffix: name.suffix };
  if (bassName === undefined) return { chord, german: name.german };
  const bass = readName(bassName, notation);
  if (bass?.suffix !== "") return null;
  return { chord: { ...chord, bass: bass.root }, german: name.german || bass.german };
}

export function readName(text: string, notation: Notation) {
  const letter = text[0] ?? "";
  const natural = letter === "B" && notation === "german" ? 10 : naturals[letter];
  if (natural === undefined) return null;
  for (const [accidental, shift] of accidentals) {
    if (!text.startsWith(accidental, 1) || (accidental === "s" && !"AE".includes(letter))) continue;
    const suffix = canonicalSuffix(text.slice(1 + accidental.length));
    if (suffix !== null) {
      const german = letter === "H" || germanAccidentals.includes(accidental);
      return { root: (natural + shift + 12) % 12, suffix, german, rootLength: 1 + accidental.length };
    }
  }
  return null;
}

function canonicalSuffix(written: string) {
  const suffix = spellings.reduce((text, [spelling, canonical]) => text.replace(spelling, canonical), written);
  return chordSuffixes.includes(suffix) ? suffix : null;
}
