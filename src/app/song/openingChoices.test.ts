import { describe, expect, test } from "bun:test";
import { openingChoices } from "./openingChoices";

const sheetWithCapo = (chordSheetId: string, capo: number) => ({
  chordSheetId,
  name: chordSheetId,
  origin: "builtIn" as const,
  chordPro: `{title: Song}\n{artist: Someone}\n{capo: ${capo}}\n\n[Am]words`,
});

const classic = sheetWithCapo("classic", 0);
const easy = sheetWithCapo("easy", 5);
const bluesy = sheetWithCapo("bluesy", 2);
const sheets = [classic, easy, bluesy];

const herEntry = { chordSheetId: "easy", transpose: 2, capo: 7, speed: 6 };

describe("how a Song opens", () => {
  test("opens on the first Chord sheet as written when she has no entry", () => {
    expect(openingChoices(sheets, { linked: undefined, entry: undefined })).toEqual({ sheet: classic, view: { transpose: 0, capo: 0 }, speed: 3 });
  });

  test("opens on her Chord sheet with her key, capo and speed", () => {
    expect(openingChoices(sheets, { linked: undefined, entry: herEntry })).toEqual({ sheet: easy, view: { transpose: 2, capo: 7 }, speed: 6 });
  });

  test("opens an exact Chord sheet link over her entry, at that sheet's own capo", () => {
    expect(openingChoices(sheets, { linked: "bluesy", entry: herEntry })).toEqual({ sheet: bluesy, view: { transpose: 2, capo: 2 }, speed: 6 });
  });

  test("falls back to the first Chord sheet when hers is gone", () => {
    const gone = { ...herEntry, chordSheetId: "removed" };
    expect(openingChoices(sheets, { linked: undefined, entry: gone })).toEqual({ sheet: classic, view: { transpose: 2, capo: 0 }, speed: 6 });
  });

  test("has nothing to open on a Song without Chord sheets", () => {
    expect(openingChoices([], { linked: undefined, entry: herEntry })).toBeUndefined();
  });
});
