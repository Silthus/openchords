import { parse, type View } from "../../sheet";
import type { ChordSheetChoice } from "./SettingsSheet";

export const startingSpeed = 3;

type StoredChoices = { chordSheetId: string; transpose: number; capos: Record<string, number>; speed: number };
type Opening = { linked: string | undefined; entry: StoredChoices | undefined };

export function openingChoices<Sheet extends ChordSheetChoice>(sheets: Sheet[], { linked, entry }: Opening) {
  const byId = (chordSheetId: string | undefined) =>
    chordSheetId === undefined ? undefined : sheets.find((sheet) => sheet.chordSheetId === chordSheetId || sheet.replaces.includes(chordSheetId));
  const sheet = byId(linked) ?? byId(entry?.chordSheetId) ?? sheets[0];
  if (!sheet) return undefined;
  const view: View = { transpose: entry?.transpose ?? 0, capo: entry?.capos[sheet.chordSheetId] ?? writtenCapo(sheet) };
  return { sheet, view, speed: entry?.speed ?? startingSpeed };
}

function writtenCapo(sheet: ChordSheetChoice) {
  return parse(sheet.chordPro).meta.capo;
}
