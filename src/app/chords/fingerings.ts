import { useEffect, useState } from "react";
import type { Chord } from "../../sheet";

export type Fingering = { frets: number[]; fingers: number[]; barres: number[]; baseFret: number };
export type FingeringTable = Record<string, Record<string, Fingering>>;

const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function fingeringFor(table: FingeringTable, chord: Chord): Fingering | undefined {
  const bass = chord.bass === undefined ? "" : `/${sharpNames[chord.bass]}`;
  return table[sharpNames[chord.root]!]?.[chord.suffix + bass];
}

let loading: Promise<FingeringTable> | undefined;
let loaded: FingeringTable | undefined;

function loadFingerings() {
  loading ??= import("./chords-db/guitar.json").then((module) => (loaded = module.default as FingeringTable));
  return loading;
}

export function useFingeringTable() {
  const [table, setTable] = useState(loaded);
  useEffect(() => {
    void loadFingerings().then(setTable);
  }, []);
  return table;
}
