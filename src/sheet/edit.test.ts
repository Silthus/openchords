import { describe, expect, test } from "bun:test";
import { clearChords, layerOf, parse, removeChord, setChord } from ".";

const sheet = parse(`{title: Amazing Grace}
{artist: John Newton}
{key: G}

{comment: Verse 1}
[G]Amazing [G7]grace, how [C]sweet the [G]sound
That saved a wretch like [D][D7]me
`);

function chordsOfLine(changed: typeof sheet, line: number) {
  return layerOf(changed).lines[line]!.chords;
}

describe("setChord", () => {
  test("changes the chord over a word", () => {
    const changed = setChord(sheet, { section: 0, line: 0, word: 0, chord: 0 }, "D");
    expect(chordsOfLine(changed, 0)).toEqual([
      { word: 0, chord: "D" },
      { word: 1, chord: "G7" },
      { word: 3, chord: "C" },
      { word: 5, chord: "G" },
    ]);
  });

  test("puts a chord over a word that had none", () => {
    const changed = setChord(sheet, { section: 0, line: 1, word: 2, chord: 0 }, "Em");
    expect(chordsOfLine(changed, 1)).toEqual([
      { word: 2, chord: "Em" },
      { word: 5, chord: "D" },
      { word: 5, chord: "D7" },
    ]);
  });

  test("changes one of two chords over a word and keeps the other", () => {
    const changed = setChord(sheet, { section: 0, line: 1, word: 5, chord: 1 }, "A7");
    expect(chordsOfLine(changed, 1)).toEqual([
      { word: 5, chord: "D" },
      { word: 5, chord: "A7" },
    ]);
  });

  test("leaves the sheet it was given as it was", () => {
    setChord(sheet, { section: 0, line: 0, word: 0, chord: 0 }, "D");
    expect(chordsOfLine(sheet, 0)[0]).toEqual({ word: 0, chord: "G" });
  });
});

describe("removeChord", () => {
  test("takes the chord off a word", () => {
    const changed = removeChord(sheet, { section: 0, line: 0, word: 1, chord: 0 });
    expect(chordsOfLine(changed, 0)).toEqual([
      { word: 0, chord: "G" },
      { word: 3, chord: "C" },
      { word: 5, chord: "G" },
    ]);
  });

  test("takes one of two chords off a word and keeps the other", () => {
    const changed = removeChord(sheet, { section: 0, line: 1, word: 5, chord: 0 });
    expect(chordsOfLine(changed, 1)).toEqual([{ word: 5, chord: "D7" }]);
  });
});

describe("clearChords", () => {
  test("takes every chord off every word and keeps the words, sections and key", () => {
    const cleared = clearChords(sheet);
    expect(layerOf(cleared).lines.flatMap((line) => line.chords)).toEqual([]);
    expect(cleared.sections.map((section) => section.label)).toEqual(["Verse 1"]);
    expect(cleared.meta.key).toBe("G");
    expect(cleared.sections[0]!.lines[1]!.words.map((word) => word.text)).toEqual(["That", "saved", "a", "wretch", "like", "me"]);
  });
});
