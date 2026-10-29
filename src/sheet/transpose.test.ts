import { describe, expect, test } from "bun:test";
import { chordsIn, parse, transpose, type ParsedSheet } from ".";

function sheetIn(key: string | undefined, chords: string) {
  const keyLine = key === undefined ? "" : `{key: ${key}}\n`;
  return parse(`{title: A Song}\n{artist: Someone}\n${keyLine}{capo: 2}\n${chords.split(" ").map((chord) => `[${chord}]la`).join(" ")}\n`);
}

function chordsOf(sheet: ParsedSheet) {
  return sheet.sections.flatMap((section) => section.lines.flatMap((line) => line.words.flatMap((word) => word.chords))).join(" ");
}

describe("transpose", () => {
  test.each([
    ["Am", "Am C D F E", 2, "Bm", "Bm D E G F#"],
    ["Am", "Am C D F E", 1, "Bbm", "Bbm Db Eb Gb F"],
    ["Am", "Am C D F E", -2, "Gm", "Gm Bb C Eb D"],
    ["Am", "Am C D F E", 6, "D#m", "D#m F# G# B A#"],
    ["G", "G C D Em", 1, "Ab", "Ab Db Eb Fm"],
    ["G", "G C D Em", 4, "B", "B E F# G#m"],
    ["F", "F Bb C Dm", 2, "G", "G C D Em"],
    ["D", "D A#dim Bm G", 3, "F", "F Dbdim Dm Bb"],
  ])("moves a sheet in %s with %s by %i to %s", (key, chords, semitones, shownKey, shownChords) => {
    const shown = transpose(sheetIn(key, chords), semitones);
    expect(shown.meta.key).toBe(shownKey);
    expect(chordsOf(shown)).toBe(shownChords);
  });

  test("moves the bass of a slash chord with its root", () => {
    expect(chordsOf(transpose(sheetIn("G", "G D/F# Em"), 3))).toBe("Bb F/A Gm");
  });

  test("keeps each chord's quality as it is written", () => {
    expect(chordsOf(transpose(sheetIn("C", "Cmaj7 C-7 Csus Cø"), 2))).toBe("Dmaj7 D-7 Dsus Dø");
  });

  test.each([
    ["E", "E H Cis7 Fis/Ais", -1, "Es", "Es B C7 F/A"],
    ["E", "E H Cis7 Fis/Ais", 2, "Fis", "Fis Cis Dis7 Gis/C"],
    ["Fismoll", "Fismoll Cis H", 1, "Gmoll", "Gmoll D C"],
  ])("keeps a German sheet in %s German when moving it by %i", (key, chords, semitones, shownKey, shownChords) => {
    const shown = transpose(sheetIn(key, chords), semitones);
    expect(shown.meta.key).toBe(shownKey);
    expect(chordsOf(shown)).toBe(shownChords);
  });

  test("keeps reading a German sheet as German when its moved chords no longer show it", () => {
    const shown = transpose(sheetIn("Fis", "Fis H Cis"), -1);
    expect(chordsOf(shown)).toBe("F B C");
    expect(chordsIn(shown).map((chord) => chord.root)).toEqual([5, 10, 0]);
  });

  test("reads a sheet as German when only its key is German", () => {
    const shown = transpose(sheetIn("Hm", "Em G A"), -1);
    expect(shown.meta.key).toBe("Bm");
    expect(chordsOf(shown)).toBe("Esm Ges As");
  });

  test("spells by the first readable chord when the sheet names no key", () => {
    expect(chordsOf(transpose(sheetIn(undefined, "N.C. Em D"), 6))).toBe("N.C. Bbm Ab");
  });

  test("spells by the first chord when the sheet names no key", () => {
    const shown = transpose(sheetIn(undefined, "Em D"), 6);
    expect(shown.meta.key).toBeUndefined();
    expect(chordsOf(shown)).toBe("Bbm Ab");
  });

  test("leaves text that is no chord as it is", () => {
    expect(chordsOf(transpose(sheetIn("C", "C N.C. G"), 2))).toBe("D N.C. A");
  });

  test("keeps the words, the sections and the capo", () => {
    const sheet = sheetIn("Am", "Am C");
    const shown = transpose(sheet, 2);
    expect(shown.meta).toEqual({ ...sheet.meta, key: "Bm" });
    expect(shown.sections[0]?.lines[0]?.words.map((word) => word.text)).toEqual(["la", "la"]);
  });

  test("leaves a sheet moved by 0 exactly as it is written", () => {
    const sheet = sheetIn("Am", "Am A#");
    expect(transpose(sheet, 0)).toBe(sheet);
  });
});
