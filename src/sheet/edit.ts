import type { ParsedSheet, Word } from ".";

export type ChordSpot = { section: number; line: number; word: number; chord: number };

export function setChord(sheet: ParsedSheet, spot: ChordSpot, chord: string): ParsedSheet {
  return changeWord(sheet, spot, (word) => ({ ...word, chords: [...word.chords.slice(0, spot.chord), chord, ...word.chords.slice(spot.chord + 1)] }));
}

export function removeChord(sheet: ParsedSheet, spot: ChordSpot): ParsedSheet {
  return changeWord(sheet, spot, (word) => ({ ...word, chords: word.chords.filter((_, index) => index !== spot.chord) }));
}

export function clearChords(sheet: ParsedSheet): ParsedSheet {
  return {
    ...sheet,
    sections: sheet.sections.map((section) => ({ ...section, lines: section.lines.map((line) => ({ words: line.words.map((word) => ({ ...word, chords: [] })) })) })),
  };
}

function changeWord(sheet: ParsedSheet, spot: ChordSpot, change: (word: Word) => Word): ParsedSheet {
  return {
    ...sheet,
    sections: sheet.sections.map((section, sectionIndex) =>
      sectionIndex !== spot.section
        ? section
        : {
            ...section,
            lines: section.lines.map((line, lineIndex) =>
              lineIndex !== spot.line ? line : { words: line.words.map((word, wordIndex) => (wordIndex === spot.word ? change(word) : word)) },
            ),
          },
    ),
  };
}
