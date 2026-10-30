import { describe, expect, test } from "bun:test";
import { layerOf, parse, setChord } from ".";

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
