import type { ParsedSheet } from ".";

export type Notation = "international" | "german";
export type Chord = { written: string; root: number; suffix: string; bass?: number };

export const chordSuffixes = [
  ...["", "m", "5", "6", "69", "7", "9", "11", "13", "add9", "add11", "madd9"],
  ...["m6", "m69", "m7", "m9", "m11", "maj7", "maj9", "mmaj7", "m7b5", "7b5", "7b9", "7#9"],
  ...["sus2", "sus4", "7sus4", "dim", "dim7", "aug", "aug7"],
];

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

export function chordsIn(sheet: ParsedSheet): Chord[] {
  const written = writtenChordsOf(sheet);
  const notation = notationOf(written);
  return written.flatMap((text) => readChord(text, notation) ?? []);
}

function writtenChordsOf(sheet: ParsedSheet) {
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

function readName(text: string, notation: Notation) {
  const letter = text[0] ?? "";
  const natural = letter === "B" && notation === "german" ? 10 : naturals[letter];
  if (natural === undefined) return null;
  for (const [accidental, shift] of accidentals) {
    if (!text.startsWith(accidental, 1) || (accidental === "s" && !"AE".includes(letter))) continue;
    const suffix = canonicalSuffix(text.slice(1 + accidental.length));
    if (suffix !== null) return { root: (natural + shift + 12) % 12, suffix, german: letter === "H" || germanAccidentals.includes(accidental) };
  }
  return null;
}

function canonicalSuffix(written: string) {
  const suffix = spellings.reduce((text, [spelling, canonical]) => text.replace(spelling, canonical), written);
  return chordSuffixes.includes(suffix) ? suffix : null;
}
