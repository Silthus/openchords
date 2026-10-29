// PROTOTYPE (throwaway): hard-coded song data and chord maths for the song screen variants.

export type ChordSheet = {
  id: string;
  name: string;
  description: string;
  capo: number;
  sections: { label: string; lines: string[] }[];
};

export type Song = { title: string; artist: string; sheets: ChordSheet[] };

const verses = [
  ["There [Am]is a [C]house in [D]New Or[F]leans", "They [Am]call the [C]Rising [E]Sun", "And it's [Am]been the [C]ruin of [D]many a poor [F]girl", "And [Am]me, oh [E]Lord, for [Am]one [E]"],
  ["If [Am]I had [C]listened [D]what Mama [F]said", "I'd [Am]be at [C]home to[E]day", "Being [Am]so young and [C]foolish, [D]poor [F]girl", "Let a [Am]rambler [E]lead me a[Am]stray [E]"],
  ["Go [Am]tell my [C]baby [D]sister [F]dear", "To [Am]never [C]do like I [E]done", "To [Am]shun that [C]house in [D]New Or[F]leans", "They [Am]call the [E]Rising [Am]Sun [E]"],
  ["One [Am]foot is [C]on the [D]plat[F]form", "And the [Am]other [C]one on the [E]train", "I'm [Am]going [C]back to [D]New Or[F]leans", "To [Am]wear that [E]ball and [Am]chain [E]"],
];

const swap = (line: string, map: Record<string, string>) => line.replace(/\[([^\]]+)\]/g, (_, c: string) => `[${map[c] ?? c}]`);

const toSections = (map: Record<string, string> = {}) =>
  verses.map((lines, i) => ({ label: `Verse ${i + 1}`, lines: lines.map((l) => swap(l, map)) }));

export const song: Song = {
  title: "House of the Rising Sun",
  artist: "Traditional",
  sheets: [
    { id: "classic", name: "Classic", description: "The well-known version in A minor", capo: 0, sections: toSections() },
    {
      id: "easy",
      name: "Easy shapes",
      description: "Only beginner shapes, with a capo on fret 5",
      capo: 5,
      sections: toSections({ Am: "Em", C: "G", D: "A", F: "C", E: "B7" }),
    },
    {
      id: "sevenths",
      name: "Bluesy",
      description: "Adds seventh chords for a darker sound",
      capo: 0,
      sections: toSections({ Am: "Am7", F: "Fmaj7", E: "E7" }),
    },
  ],
};

export type Segment = { chord?: string; text: string };

export function parseLine(line: string): Segment[] {
  const segments: Segment[] = [];
  const parts = line.split(/\[([^\]]+)\]/);
  if (parts[0]) segments.push({ text: parts[0] });
  for (let i = 1; i < parts.length; i += 2) segments.push({ chord: parts[i], text: parts[i + 1] ?? "" });
  return segments;
}

const NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const ALIASES: Record<string, string> = { Db: "C#", "D#": "Eb", Gb: "F#", "G#": "Ab", "A#": "Bb", H: "B" };

export function splitChord(chord: string) {
  const match = /^([A-H](?:#|b)?)(.*)$/.exec(chord);
  if (!match) return { root: chord, suffix: "" };
  return { root: ALIASES[match[1]] ?? match[1], suffix: match[2] };
}

export function transposeChord(chord: string, semitones: number) {
  const { root, suffix } = splitChord(chord);
  const index = NOTES.indexOf(root);
  if (index < 0) return chord;
  return NOTES[(((index + semitones) % 12) + 12) % 12] + suffix;
}

const EASY = new Set(["C", "D", "E", "G", "A", "Am", "Dm", "Em", "A7", "B7", "C7", "D7", "E7", "G7", "Am7", "Dm7", "Em7", "Cmaj7", "Fmaj7", "Dsus2", "Dsus4", "Asus2", "Asus4", "Esus4"]);

export const isEasy = (chord: string) => EASY.has(chord);

export function songChords(sheet: ChordSheet) {
  const seen = new Set<string>();
  for (const section of sheet.sections)
    for (const line of section.lines) for (const s of parseLine(line)) if (s.chord) seen.add(s.chord);
  return [...seen];
}


export function bestCapo(shapes: string[]) {
  let best = { capo: 0, hard: Infinity };
  for (let capo = 0; capo <= 7; capo++) {
    const hard = shapes.filter((c) => !isEasy(transposeChord(c, -capo))).length;
    if (hard < best.hard) best = { capo, hard };
  }
  return best.capo;
}

export type PlayState = {
  sheet: ChordSheet;
  transpose: number;
  capo: number;
};

export function shapeFor(chord: string, { transpose, capo, sheet }: PlayState) {
  return transposeChord(chord, transpose + sheet.capo - capo);
}

const keyName = (chord: string) => {
  const { root, suffix } = splitChord(chord);
  return suffix.startsWith("m") && !suffix.startsWith("maj") ? `${root}m` : root;
};

export function soundingKey(state: PlayState) {
  return keyName(transposeChord(songChords(state.sheet)[0], state.transpose + state.sheet.capo));
}

export function capoSuggestion(state: PlayState) {
  const shapes = songChords(state.sheet).map((c) => shapeFor(c, state));
  const hard = shapes.filter((c) => !isEasy(c)).length;
  if (hard === 0) return undefined;
  const extra = bestCapo(shapes);
  if (extra === 0) return undefined;
  return state.capo + extra;
}
