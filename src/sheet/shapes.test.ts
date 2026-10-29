import { describe, expect, test } from "bun:test";
import { easierCapo, parse, shapes, type ParsedSheet } from ".";

function sheetIn(key: string, chords: string, capo = 0) {
  return parse(`{title: A Song}\n{artist: Someone}\n{key: ${key}}\n{capo: ${capo}}\n${chords.split(" ").map((chord) => `[${chord}]la`).join(" ")}\n`);
}

function chordsOf(sheet: ParsedSheet) {
  return sheet.sections.flatMap((section) => section.lines.flatMap((line) => line.words.flatMap((word) => word.chords))).join(" ");
}

describe("shapes", () => {
  test.each([
    ["Am C D F E", 0, 0, 0, "Am", "Am C D F E"],
    ["Am C D F E", 0, 2, 2, "Bm", "Am C D F E"],
    ["Am C D F E", 0, 2, 0, "Bm", "Bm D E G F#"],
    ["Am C D F E", 0, 0, 3, "Am", "F#m A B D C#"],
    ["Em G A C B7", 5, 0, 5, "Am", "Em G A C B7"],
    ["Em G A C B7", 5, 0, 0, "Am", "Am C D F E7"],
    ["Em G A C B7", 5, 2, 5, "Bm", "F#m A B D C#7"],
  ])("plays %s written for capo %i at Key %i with capo %i in %s as %s", (chords, writtenCapo, transpose, capo, key, played) => {
    const shown = shapes(sheetIn("Am", chords, writtenCapo), { transpose, capo });
    expect(shown.meta.key).toBe(key);
    expect(shown.meta.capo).toBe(capo);
    expect(chordsOf(shown)).toBe(played);
  });
});

describe("easierCapo", () => {
  test.each([
    ["F#m", "F#m A E D", 0, 2],
    ["Bb", "Bb F Gm Eb", 0, 3],
    ["Am", "Am C D F E", 2, 2],
  ])("finds the capo with the fewest barre chords for %s with %s at Key %i: fret %i", (key, chords, transpose, capo) => {
    expect(easierCapo(sheetIn(key, chords), { transpose, capo: 0 })).toBe(capo);
  });

  test("suggests no capo when none makes the Song easier", () => {
    expect(easierCapo(sheetIn("Am", "Am C D F E"), { transpose: 0, capo: 0 })).toBeNull();
  });

  test("suggests no capo when hers is already the easiest", () => {
    expect(easierCapo(sheetIn("F#m", "F#m A E D"), { transpose: 0, capo: 2 })).toBeNull();
  });

  test("suggests the lowest of equally easy capos", () => {
    expect(easierCapo(sheetIn("F", "F C"), { transpose: 0, capo: 0 })).toBe(3);
  });

  test("looks at capos up to fret 7 only", () => {
    expect(easierCapo(sheetIn("Cm", "Cm Ab"), { transpose: 0, capo: 0 })).toBe(1);
  });

  test("judges a slash chord by the chord over its bass", () => {
    expect(easierCapo(sheetIn("C", "C/G Bb"), { transpose: 0, capo: 0 })).toBe(3);
  });

  test("suggests the written capo again when she took it off", () => {
    expect(easierCapo(sheetIn("Am", "Em G A C B7", 5), { transpose: 0, capo: 0 })).toBe(5);
  });
});
