import type { ParsedSheet, SheetMeta } from ".";
import { readChord, readName, writtenChordsOf, type Chord, type Notation } from "./chords";

type Spelling = "sharps" | "flats";

const noteNames: Record<Notation, Record<Spelling, string[]>> = {
  international: {
    sharps: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
    flats: ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"],
  },
  german: {
    sharps: ["C", "Cis", "D", "Dis", "E", "F", "Fis", "G", "Gis", "A", "Ais", "H"],
    flats: ["C", "Des", "D", "Es", "E", "F", "Ges", "G", "As", "A", "B", "H"],
  },
};

const flatMajorKeys = [5, 10, 3, 8, 1];
const flatMinorKeys = flatMajorKeys.map((tonic) => (tonic + 9) % 12);

export function transpose(sheet: ParsedSheet, semitones: number): ParsedSheet {
  if (semitones % 12 === 0) return sheet;
  const { notation } = sheet;
  const tonic = readChord(sheet.meta.key ?? writtenChordsOf(sheet)[0] ?? "", notation);
  const names = noteNames[notation][spellingOf(tonic, semitones)];
  const move = (chord: string) => moveChord(chord, semitones, notation, names);
  return {
    ...sheet,
    meta: movedMeta(sheet.meta, notation, move),
    sections: sheet.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({ words: line.words.map((word) => ({ ...word, chords: word.chords.map(move) })) })),
    })),
  };
}

function spellingOf(tonic: Chord | null, semitones: number): Spelling {
  if (tonic === null) return "sharps";
  const flatKeys = isMinor(tonic.suffix) ? flatMinorKeys : flatMajorKeys;
  return flatKeys.includes(shift(tonic.root, semitones)) ? "flats" : "sharps";
}

function isMinor(suffix: string) {
  return suffix.startsWith("m") && !suffix.startsWith("maj");
}

function movedMeta({ key, ...meta }: SheetMeta, notation: Notation, move: (chord: string) => string): SheetMeta {
  return key !== undefined && readChord(key, notation) !== null ? { ...meta, key: move(key) } : meta;
}

function moveChord(written: string, semitones: number, notation: Notation, names: string[]) {
  if (readChord(written, notation) === null) return written;
  return written
    .split("/")
    .map((part) => {
      const name = readName(part, notation)!;
      return names[shift(name.root, semitones)] + part.slice(name.rootLength);
    })
    .join("/");
}

function shift(root: number, semitones: number) {
  return (((root + semitones) % 12) + 12) % 12;
}
