import { getServiceToken } from "convex/server";
import type { ChordLayer } from "../../src/sheet";
import { ai } from "./ai";
import * as builtIn from "./builtIn";
import { lrclib } from "./lrclib";
import { musicbrainz } from "./musicbrainz";

export type Provenance = { source: "builtIn" | "lrclib" | "ai"; recordId: string; licence: string; fetchedAt: number };
export type SongHit = { title: string; artist: string; durationSec?: number; builtInId?: string };
export type Lyrics = { lines: string[]; verseStarts?: number[]; provenance: Provenance };
export type ChordDraft = { name: string; layer: ChordLayer; origin: "builtIn" | "ai"; provenance: Provenance };

export type Sources = {
  findSongs?: (query: string) => Promise<SongHit[]>;
  lyricsFor: (song: SongHit) => Promise<Lyrics | null>;
  chordsFor: (song: SongHit, lyrics: Lyrics) => Promise<ChordDraft[]>;
  chordSources: string[];
};

type SourcesEnv = Record<string, string | undefined>;

export class SourceUnavailable extends Error {
  constructor(
    readonly source: string,
    readonly retryAfterMs: number,
  ) {
    super(`${source} is unavailable, try again in ${retryAfterMs} ms`);
  }
}

export const builtIns: Array<SongHit & { builtInId: string }> = builtIn.builtIns;

const outsideSources = ["musicbrainz", "lrclib", "ai"];

export function sourcesFor(env: SourcesEnv): Sources {
  const enabled = (env.OPENCHORDS_SOURCES ?? "builtIn").split(",").map((name) => name.trim());
  const unknown = enabled.filter((name) => name !== "builtIn" && !outsideSources.includes(name));
  if (unknown.length > 0) throw new Error(`OPENCHORDS_SOURCES names unknown sources: ${unknown.join(", ")}`);
  if (enabled.some((name) => outsideSources.includes(name)) && env.OPENCHORDS_INVITES !== "on") {
    throw new Error("Outside sources need OPENCHORDS_INVITES=on, so only invited readers reach them");
  }
  const lyricSources = [builtIn.lyricsFor, ...(enabled.includes("lrclib") ? [lrclibFrom(env).lyricsFor] : [])];
  const chordSources = { builtIn: builtIn.chordsFor, ...(enabled.includes("ai") ? { ai: aiDraftsFromTheGateway().chordsFor } : {}) };
  return {
    findSongs: enabled.includes("musicbrainz") ? musicbrainz(fetch).findSongs : undefined,
    lyricsFor: async (song) => {
      for (const lyricsFrom of lyricSources) {
        const lyrics = await lyricsFrom(song);
        if (lyrics) return lyrics;
      }
      return null;
    },
    chordsFor: async (song, lyrics) => {
      for (const chordsFrom of Object.values(chordSources)) {
        const drafts = await chordsFrom(song, lyrics);
        if (drafts.length > 0) return drafts;
      }
      return [];
    },
    chordSources: Object.keys(chordSources),
  };
}

function aiDraftsFromTheGateway() {
  return ai({ fetch, token: () => getServiceToken("ai-gateway") });
}

function lrclibFrom(env: SourcesEnv) {
  const { LRCLIB_APP_ID: appId, LRCLIB_API_KEY: apiKey } = env;
  if (!appId || !apiKey) throw new Error("LRCLIB needs LRCLIB_APP_ID and LRCLIB_API_KEY");
  return lrclib({ fetch, appId, apiKey });
}

export function identityKeyOf(song: { title: string; artist: string }) {
  return `${normalised(song.artist)}|${normalised(song.title)}`;
}

export function wordsOf(text: string) {
  return normalised(text).split(" ").filter(Boolean);
}

function normalised(text: string) {
  return text
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}
