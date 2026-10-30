import { SourceUnavailable, type Lyrics, type SongHit } from "..";

const getUrl = "https://lrclib.net/api/get";
const userAgent = "OpenChords/0.1 ( https://github.com/Silthus/openchords )";
const durationToleranceSec = 2;

type Fetch = (url: string, init: RequestInit) => Promise<Response>;
type Record = { id: number; duration: number; instrumental: boolean; plainLyrics: string | null };

export function lrclib({ fetch, appId, apiKey }: { fetch: Fetch; appId: string; apiKey: string }) {
  return {
    async lyricsFor(song: SongHit): Promise<Lyrics | null> {
      if (song.durationSec === undefined) return null;
      const query = new URLSearchParams({ track_name: song.title, artist_name: song.artist, duration: String(song.durationSec) });
      const response = await fetch(`${getUrl}?${query}`, {
        headers: { "User-Agent": userAgent, "Lrclib-App-Id": appId, "Lrclib-Api-Key": apiKey },
      });
      if (response.status === 404) return null;
      if (response.status === 429 || response.status >= 500) throw new SourceUnavailable("lrclib", retryAfterMs(response));
      if (!response.ok) throw new Error(`LRCLIB answered ${response.status}`);
      const record = (await response.json()) as Record;
      if (Math.abs(record.duration - song.durationSec) > durationToleranceSec) return null;
      const lines = linesOf(record);
      if (lines.length === 0) return null;
      return { lines, provenance: { source: "lrclib", recordId: String(record.id), licence: "lrclib-api", fetchedAt: Date.now() } };
    },
  };
}

function linesOf(record: Record) {
  if (record.instrumental || !record.plainLyrics) return [];
  return record.plainLyrics
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function retryAfterMs(response: Response) {
  const seconds = Number(response.headers.get("Retry-After"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000;
}
