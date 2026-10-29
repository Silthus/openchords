import type { Fingering } from "./fingerings";

export const handWritten: Record<string, Record<string, Fingering>> = {
  C: { "m9/A#": { frets: [1, 1, 0, 0, 3, 3], fingers: [1, 1, 0, 0, 3, 4], barres: [1], baseFret: 6 } },
  "C#": {
    "11": { frets: [-1, 4, 3, 4, 0, 2], fingers: [0, 3, 2, 4, 0, 1], barres: [], baseFret: 1 },
    "m9/B": { frets: [-1, 2, 1, 1, 2, 0], fingers: [0, 2, 1, 1, 3, 0], barres: [1], baseFret: 1 },
  },
  D: { "m9/C": { frets: [-1, 3, 3, 2, 3, 0], fingers: [0, 2, 3, 1, 4, 0], barres: [], baseFret: 1 } },
  "D#": { "m9/C#": { frets: [-1, 4, 3, -1, 4, 2], fingers: [0, 3, 2, 0, 4, 1], barres: [], baseFret: 1 } },
  E: {
    madd9: { frets: [0, 2, 4, 0, 0, 0], fingers: [0, 1, 3, 0, 0, 0], barres: [], baseFret: 1 },
    "m9/D": { frets: [-1, 2, 1, 0, 0, 0], fingers: [0, 2, 1, 0, 0, 0], barres: [], baseFret: 4 },
  },
  F: { "m9/D#": { frets: [-1, 1, 1, 0, 1, -1], fingers: [0, 1, 2, 0, 3, 0], barres: [], baseFret: 6 } },
  G: { "m9/F": { frets: [1, 0, 0, 3, 3, 3], fingers: [1, 0, 0, 2, 3, 4], barres: [], baseFret: 1 } },
  "G#": { "m9/F#": { frets: [2, 1, 1, 1, 0, -1], fingers: [2, 1, 1, 1, 0, 0], barres: [1], baseFret: 1 } },
  A: { "m9/G": { frets: [3, 3, 2, 2, 0, 0], fingers: [3, 4, 1, 2, 0, 0], barres: [], baseFret: 1 } },
  "A#": { "m9/G#": { frets: [4, 3, -1, 3, 2, -1], fingers: [4, 2, 0, 3, 1, 0], barres: [], baseFret: 1 } },
  B: { "m9/A": { frets: [-1, 0, 0, 4, 2, 2], fingers: [0, 0, 0, 3, 1, 1], barres: [2], baseFret: 1 } },
};
