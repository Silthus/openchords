import { describe, expect, test } from "bun:test";
import { chordSuffixes, readChord, type Chord, type Notation } from "../../sheet";
import { barresOf, fingeringFor, playsChord } from "./fingerings";

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

  test("skips a chords-db position that plays another chord", () => {
    expect(fingeringOf("C#aug")).not.toEqual(fingeringOf("C#7sus4"));
    expect(fingeringOf("Emadd9")).not.toEqual(fingeringOf("Fmadd9"));
    expect(fingeringOf("C9")).toMatchObject({ frets: [3, 3, 2, 3, 3, 3], baseFret: 1 });
  });

  test("has nothing for a chord whose every chords-db position misses a tone that defines it", () => {
    expect(fingeringOf("Cm9/Bb")).toBeUndefined();
  });

  test("gives every chord a fingering that plays it", () => {
    for (const chord of everyChord()) {
      const fingering = fingeringFor(chord);
      if (fingering) expect({ chord, plays: playsChord(fingering, chord) }).toEqual({ chord, plays: true });
    }
  });
});

describe("playsChord", () => {
  const am = readChord("Am")!;

  test("is true when every sounding string plays a tone of the chord", () => {
    expect(playsChord({ frets: [-1, 0, 2, 2, 1, 0], fingers: [], barres: [], baseFret: 1 }, am)).toBe(true);
  });

  test("is false when a tone that defines the chord is missing", () => {
    const cAdd9 = { frets: [-1, 3, 2, 0, 3, 0], fingers: [], barres: [], baseFret: 1 };
    expect(playsChord(cAdd9, readChord("C9")!)).toBe(false);
  });

  test("is false when a string plays a tone outside the chord", () => {
    expect(playsChord({ frets: [-1, 0, 2, 2, 2, 0], fingers: [], barres: [], baseFret: 1 }, am)).toBe(false);
  });

  test("counts frets from the base fret", () => {
    expect(playsChord({ frets: [1, 3, 3, 1, 1, 1], fingers: [], barres: [1], baseFret: 5 }, am)).toBe(true);
  });

  test("needs the bass of a slash chord on the lowest sounding string", () => {
    const amOverE = readChord("Am/E")!;
    expect(playsChord({ frets: [0, 0, 2, 2, 1, 0], fingers: [], barres: [], baseFret: 1 }, amOverE)).toBe(true);
    expect(playsChord({ frets: [-1, 0, 2, 2, 1, 0], fingers: [], barres: [], baseFret: 1 }, amOverE)).toBe(false);
  });
});

describe("barresOf", () => {
  test("bars every string one finger holds at the barre fret", () => {
    expect(barresOf(fingeringOf("F")!)).toEqual([{ fret: 1, finger: 1, strings: [0, 4, 5] }]);
  });

  test("leaves a string another finger holds at the same fret out of the barre", () => {
    expect(barresOf(fingeringOf("F#add9")!)).toEqual([{ fret: 2, finger: 4, strings: [4, 5] }]);
  });

  test("bars nothing where no finger holds two strings", () => {
    expect(barresOf({ frets: [-1, 2, 2, 2, -1, -1], fingers: [0, 1, 2, 3, 0, 0], barres: [2], baseFret: 1 })).toEqual([]);
  });
});

function* everyChord(): Generator<Chord> {
  for (let root = 0; root < 12; root++) {
    for (const suffix of chordSuffixes) {
      yield { written: "", root, suffix };
      for (let bass = 0; bass < 12; bass++) yield { written: "", root, suffix, bass };
    }
  }
}
