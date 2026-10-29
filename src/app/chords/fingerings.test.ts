import { describe, expect, test } from "bun:test";
import { readChord, type Notation } from "../../sheet";
import { fingeringFor } from "./fingerings";

function fingeringOf(written: string, notation?: Notation) {
  return fingeringFor(readChord(written, notation)!);
}

describe("fingeringFor", () => {
  test("finds the first chords-db position of a chord", () => {
    expect(fingeringOf("Am")).toEqual({ frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], barres: [], baseFret: 1 });
  });

  test("finds a flat name under its sharp twin", () => {
    expect(fingeringOf("Db")).toEqual(fingeringOf("C#"));
    expect(fingeringOf("Ebm7")).toEqual(fingeringOf("D#m7"));
  });

  test("finds German names", () => {
    expect(fingeringOf("Fis", "german")).toEqual(fingeringOf("F#"));
    expect(fingeringOf("H7", "german")).toEqual(fingeringOf("B7"));
    expect(fingeringOf("B", "german")).toEqual(fingeringOf("Bb"));
  });

  test("finds a slash chord by its bass", () => {
    expect(fingeringOf("D/F#")).toMatchObject({ frets: [1, 4, 3, 1, 2, 1], baseFret: 2 });
  });

  test("has nothing for a chord chords-db does not draw", () => {
    expect(fingeringOf("Cmaj7/E")).toBeUndefined();
  });
});
