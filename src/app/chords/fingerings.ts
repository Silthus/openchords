import { chordTones, essentialTones, type Chord } from "../../sheet";
import guitar from "./chords-db/guitar.json";

export type Fingering = { frets: number[]; fingers: number[]; barres: number[]; baseFret: number };
export type Barre = { fret: number; finger: number; strings: number[] };

const table: Record<string, Record<string, Fingering>> = guitar;
const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const openStrings = [4, 9, 2, 7, 11, 4];

export function fingeringFor(chord: Chord): Fingering | undefined {
  const bass = chord.bass === undefined ? "" : `/${sharpNames[chord.bass]}`;
  return table[sharpNames[chord.root]!]?.[chord.suffix + bass];
}

export function playsChord(fingering: Fingering, chord: Chord): boolean {
  const sounding = pitchesOf(fingering);
  const tones = chordTones(chord);
  const bassFits = chord.bass === undefined || sounding[0] === chord.bass;
  const complete = essentialTones(chord).every((tone) => sounding.includes(tone));
  return bassFits && complete && sounding.every((pitch) => tones.includes(pitch));
}

export function barresOf({ frets, fingers, barres }: Fingering): Barre[] {
  return barres.flatMap((fret) => {
    const held = frets.flatMap((stringFret, string) => (stringFret === fret ? [string] : []));
    const fingersAtFret = new Set(held.map((string) => fingers[string]!));
    return [...fingersAtFret].flatMap((finger) => {
      const strings = held.filter((string) => fingers[string] === finger);
      return strings.length > 1 ? [{ fret, finger, strings }] : [];
    });
  });
}

function pitchesOf({ frets, baseFret }: Fingering) {
  return frets.flatMap((fret, string) => {
    if (fret === -1) return [];
    const played = fret === 0 ? 0 : fret + baseFret - 1;
    return [(openStrings[string]! + played) % 12];
  });
}
