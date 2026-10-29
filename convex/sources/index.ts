import type { ChordLayer } from "../../src/sheet";
import * as builtIn from "./builtIn";

export type Provenance = { source: "builtIn"; recordId: string; licence: string; fetchedAt: number };
export type SongHit = { title: string; artist: string; builtInId?: string };
export type Lyrics = { lines: string[]; provenance: Provenance };
export type ChordDraft = { name: string; layer: ChordLayer; origin: "builtIn"; provenance: Provenance };

export const builtIns: Array<SongHit & { builtInId: string }> = builtIn.builtIns;
export const lyricsFor: (song: SongHit) => Promise<Lyrics | null> = builtIn.lyricsFor;
export const chordsFor: (song: SongHit, lyrics: Lyrics) => Promise<ChordDraft[]> = builtIn.chordsFor;
