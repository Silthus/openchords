import type { Chord } from "../../sheet";
import guitar from "./chords-db/guitar.json";

export type Fingering = { frets: number[]; fingers: number[]; barres: number[]; baseFret: number };

const table: Record<string, Record<string, Fingering>> = guitar;
const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function fingeringFor(chord: Chord): Fingering | undefined {
  const bass = chord.bass === undefined ? "" : `/${sharpNames[chord.bass]}`;
  return table[sharpNames[chord.root]!]?.[chord.suffix + bass];
}
