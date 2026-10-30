import { isChord, notationOf, writtenChordsOf, type Notation } from "./chords";

export { chordSuffixes, chordsIn, chordTones, essentialTones, isChord, notationOf, readChord, type Chord, type Notation } from "./chords";
export { easierCapo, shapes, type View } from "./shapes";
export { setChord, type ChordSpot } from "./edit";
export { transpose } from "./transpose";

export type SheetMeta = { title: string; artist: string; key?: string; capo: number };
export type Word = { text: string; chords: string[] };
export type SheetLine = { words: Word[] };
export type SheetSection = { label: string; lines: SheetLine[] };
export type ParsedSheet = { meta: SheetMeta; notation: Notation; sections: SheetSection[] };

export type ChordLayer = {
  notation?: "german";
  key?: string;
  capo: number;
  sections: Array<{ label: string; fromLine: number }>;
  lines: Array<{ lyricLine: number; chords: Array<{ word: number; chord: string }> }>;
};

export class InvalidChordLayer extends Error {}

const directivePattern = /^\{(\w+):\s*(.*?)\s*\}$/;
const chordOrEscapePattern = /\\([\\[\]{}])|\[([^\]]*)\]/g;
const syntaxCharacter = /[\\[\]{}]/g;

export function parse(chordPro: string): ParsedSheet {
  const sheet: ParsedSheet = { meta: { title: "", artist: "", capo: 0 }, notation: "international", sections: [] };
  let writtenGerman = false;
  for (const line of chordPro.split("\n").map((raw) => raw.trim())) {
    if (line === "") continue;
    const directive = directivePattern.exec(line);
    if (directive?.[1] === "notation") writtenGerman = directive[2] === "german";
    else if (directive) applyDirective(sheet, directive[1]!, directive[2]!);
    else currentSection(sheet).lines.push(parseLyricLine(line));
  }
  const key = sheet.meta.key === undefined ? [] : [sheet.meta.key];
  return { ...sheet, notation: writtenGerman ? "german" : notationOf([...key, ...writtenChordsOf(sheet)]) };
}

function applyDirective(sheet: ParsedSheet, name: string, value: string) {
  if (name === "title") sheet.meta.title = value;
  if (name === "artist") sheet.meta.artist = value;
  if (name === "key") sheet.meta.key = value;
  if (name === "capo") sheet.meta.capo = Number(value);
  if (name === "comment") sheet.sections.push({ label: value, lines: [] });
}

function currentSection(sheet: ParsedSheet): SheetSection {
  if (sheet.sections.length === 0) sheet.sections.push({ label: "", lines: [] });
  return sheet.sections[sheet.sections.length - 1]!;
}

function parseLyricLine(line: string): SheetLine {
  const placements: Array<{ at: number; chord: string }> = [];
  let text = "";
  let consumed = 0;
  for (const mark of line.matchAll(chordOrEscapePattern)) {
    text += line.slice(consumed, mark.index);
    const [, escaped, chord] = mark;
    if (escaped !== undefined) text += escaped;
    else placements.push({ at: text.length, chord: chord! });
    consumed = mark.index + mark[0].length;
  }
  text += line.slice(consumed);

  const words = [...text.matchAll(/\S+/g)].map((match) => ({ text: match[0], end: match.index + match[0].length, chords: [] as string[] }));
  const afterLastWord: Word = { text: "", chords: [] };
  for (const { at, chord } of placements) (words.find((word) => word.end > at) ?? afterLastWord).chords.push(chord);

  const placed = words.map(({ text, chords }) => ({ text, chords }));
  return { words: afterLastWord.chords.length > 0 ? [...placed, afterLastWord] : placed };
}

export function lyricsOf(sheet: ParsedSheet): string[] {
  return linesOf(sheet).map((line) =>
    line.words
      .map((word) => word.text)
      .filter((text) => text !== "")
      .join(" "),
  );
}

export function layerOf(sheet: ParsedSheet): ChordLayer {
  const sections: ChordLayer["sections"] = [];
  let fromLine = 0;
  for (const section of sheet.sections) {
    if (section.label !== "") sections.push({ label: section.label, fromLine });
    fromLine += section.lines.length;
  }
  const lines = linesOf(sheet).map((line, lyricLine) => ({
    lyricLine,
    chords: line.words.flatMap((word, index) => word.chords.map((chord) => ({ word: index, chord }))),
  }));
  return {
    ...(sheet.notation === "german" ? { notation: "german" } : {}),
    ...(sheet.meta.key === undefined ? {} : { key: sheet.meta.key }),
    capo: sheet.meta.capo,
    sections,
    lines,
  };
}

function linesOf(sheet: ParsedSheet): SheetLine[] {
  return sheet.sections.flatMap((section) => section.lines);
}

export function compose(lyrics: readonly string[], layer: ChordLayer, meta: { title: string; artist: string }, verseStarts: readonly number[] = []): string {
  refuseUnplayable(layer);
  const chordsByLine = new Map(layer.lines.map((line) => [line.lyricLine, line.chords]));
  const outOfRange = layer.lines.find((line) => line.lyricLine < 0 || line.lyricLine >= lyrics.length);
  if (outOfRange) throw new InvalidChordLayer(`Line ${outOfRange.lyricLine} is past the ${lyrics.length} lyric lines`);

  const labels = new Map(layer.sections.map((section) => [section.fromLine, section.label]));
  const header = [
    `{title: ${meta.title}}`,
    `{artist: ${meta.artist}}`,
    ...(germanUnseen(layer) ? ["{notation: german}"] : []),
    ...(layer.key === undefined ? [] : [`{key: ${layer.key}}`]),
    `{capo: ${layer.capo}}`,
  ];
  const body = lyrics.flatMap((text, index) => {
    const line = placeChords(text, chordsByLine.get(index) ?? []);
    const label = labels.get(index) ?? (verseStarts.includes(index) ? "" : undefined);
    return label === undefined ? [line] : ["", `{comment: ${label}}`, line];
  });
  return [...header, ...body, ""].join("\n");
}

function germanUnseen({ notation, key, lines }: ChordLayer) {
  const written = [...(key === undefined ? [] : [key]), ...lines.flatMap((line) => line.chords.map(({ chord }) => chord))];
  return notation === "german" && notationOf(written) !== "german";
}

const highestCapo = 11;

function refuseUnplayable({ key, capo, sections, lines }: ChordLayer) {
  const chords = lines.flatMap((line) => line.chords);
  refuseUnless(key === undefined || isChord(key), `The key ${key} is no chord`);
  refuseUnless(Number.isInteger(capo) && capo >= 0 && capo <= highestCapo, `A capo on fret ${capo} is no fret`);
  refuseUnless(sections.every(({ label }) => !/[\r\n]/.test(label)), "A section label breaks its line");
  refuseUnless(lines.every(({ lyricLine }) => Number.isInteger(lyricLine)), "A line lies between two lyric lines");
  refuseUnless(chords.every(({ word }) => Number.isInteger(word)), "A chord lies between two words");
  refuseUnless(chords.every(({ chord }) => isChord(chord)), "A chord is no chord");
}

function refuseUnless(playable: boolean, reason: string) {
  if (!playable) throw new InvalidChordLayer(reason);
}

function placeChords(text: string, chords: ChordLayer["lines"][number]["chords"]): string {
  const words = text.split(/\s+/).filter((word) => word !== "");
  const misplaced = chords.find((chord) => chord.word < 0 || chord.word > words.length);
  if (misplaced) throw new InvalidChordLayer(`Word ${misplaced.word} is past the ${words.length} words of "${text}"`);

  const marksAt = (index: number) =>
    chords
      .filter((chord) => chord.word === index)
      .map((chord) => `[${chord.chord}]`)
      .join("");
  const afterLastWord = marksAt(words.length);
  return [...words.map((word, index) => marksAt(index) + escaped(word)), ...(afterLastWord === "" ? [] : [afterLastWord])].join(" ");
}

function escaped(word: string) {
  return word.replace(syntaxCharacter, (character) => `\\${character}`);
}
