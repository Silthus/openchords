import type { ParsedSheet } from ".";
import { chordsIn, type Chord } from "./chords";
import { transpose } from "./transpose";

export type View = { transpose: number; capo: number };

const capos = { lowest: 0, highestSuggested: 7 };

const openShapes: Record<string, number[]> = {
  "": [0, 2, 4, 7, 9],
  m: [9, 2, 4],
  "7": [9, 11, 0, 2, 4, 7],
  m7: [9, 2, 4],
  maj7: [0, 5],
  sus2: [2, 9],
  sus4: [2, 9, 4],
};

export function shapes(sheet: ParsedSheet, view: View): ParsedSheet {
  const played = transpose(sheet, view.transpose + sheet.meta.capo - view.capo);
  const { key } = transpose(sheet, view.transpose).meta;
  return { ...played, meta: { ...played.meta, ...(key === undefined ? {} : { key }), capo: view.capo } };
}

export function easierCapo(sheet: ParsedSheet, view: View): number | null {
  const barreChordsWith = (capo: number) => chordsIn(shapes(sheet, { ...view, capo })).filter(needsBarre).length;
  let easiest = view.capo;
  for (let capo = capos.lowest; capo <= capos.highestSuggested; capo++) {
    if (barreChordsWith(capo) < barreChordsWith(easiest)) easiest = capo;
  }
  return easiest === view.capo ? null : easiest;
}

function needsBarre({ root, suffix }: Chord) {
  return !openShapes[suffix]?.includes(root);
}
