import { describe, expect, test } from "bun:test";
import { chordsIn, isChord, notationOf, parse, readChord } from ".";

describe("readChord", () => {
  test.each([
    ["C", 0, ""],
    ["Am", 9, "m"],
    ["F#m7", 6, "m7"],
    ["Bb", 10, ""],
    ["Dbmaj7", 1, "maj7"],
    ["Asus4", 9, "sus4"],
    ["Bb5", 10, "5"],
    ["Cmin", 0, "m"],
    ["C-7", 0, "m7"],
    ["CM7", 0, "maj7"],
    ["CΔ", 0, "maj7"],
    ["Csus", 0, "sus4"],
    ["Co", 0, "dim"],
    ["C+", 0, "aug"],
    ["Cø", 0, "m7b5"],
  ])("reads the international name %s", (written, root, suffix) => {
    expect(readChord(written)).toEqual({ written, root, suffix });
  });

  test.each([
    ["H", 11, ""],
    ["Hm", 11, "m"],
    ["H7", 11, "7"],
    ["Fis", 6, ""],
    ["Fismoll", 6, "m"],
    ["Cis7", 1, "7"],
    ["Es", 3, ""],
    ["As", 8, ""],
    ["Des", 1, ""],
    ["Amoll", 9, "m"],
    ["Ddur", 2, ""],
  ])("reads the German name %s", (written, root, suffix) => {
    expect(readChord(written, "german")).toEqual({ written, root, suffix });
  });

  test("reads B as B flat on a German sheet and as B elsewhere", () => {
    expect(readChord("B", "german")?.root).toBe(10);
    expect(readChord("B")?.root).toBe(11);
  });

  test("reads the bass of a slash chord", () => {
    expect(readChord("D/F#")).toEqual({ written: "D/F#", root: 2, suffix: "", bass: 6 });
    expect(readChord("Am/E")).toEqual({ written: "Am/E", root: 9, suffix: "m", bass: 4 });
  });
});

describe("isChord", () => {
  test.each(["Am", "Fis", "Hm7", "D/F#", "Ebmaj7", "Gsus2"])("accepts %s", (text) => {
    expect(isChord(text)).toBe(true);
  });

  test.each(["", "Coda", "Hallo", "Verse", "N.C.", "x2", "Am I", "Cxyz", "C/Hallo", "c"])("refuses %p", (text) => {
    expect(isChord(text)).toBe(false);
  });
});

describe("notationOf", () => {
  test("is German when a chord uses H or a German sharp or flat", () => {
    expect(notationOf(["Am", "H7", "E"])).toBe("german");
    expect(notationOf(["Fis", "D"])).toBe("german");
    expect(notationOf(["Es", "B"])).toBe("german");
  });

  test("is German when a slash chord's bass is German", () => {
    expect(notationOf(["B", "C/H"])).toBe("german");
    expect(notationOf(["C/Fis"])).toBe("german");
  });

  test("is international otherwise", () => {
    expect(notationOf(["Am", "Bb", "F#"])).toBe("international");
    expect(notationOf(["B", "Em"])).toBe("international");
  });
});

describe("chordsIn", () => {
  test("lists each chord of a sheet once, in the order it first appears, read in the sheet's notation", () => {
    const sheet = parse("[Am]Here [C]comes the [Am]sun [N.C.]\n[B]and [H7]then [C]some");
    expect(chordsIn(sheet).map((chord) => [chord.written, chord.root])).toEqual([
      ["Am", 9],
      ["C", 0],
      ["B", 10],
      ["H7", 11],
    ]);
  });
});
