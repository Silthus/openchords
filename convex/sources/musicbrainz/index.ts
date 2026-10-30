import { identityKeyOf, SourceUnavailable, type SongHit } from "..";

const searchUrl = "https://musicbrainz.org/ws/2/recording";
const userAgent = "OpenChords/0.1 ( https://github.com/Silthus/openchords )";

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

type Recording = {
  title: string;
  length?: number | null;
  video?: boolean | null;
  "artist-credit": Array<{ name: string; joinphrase?: string }>;
};

export function musicbrainz(fetch: Fetch) {
  return {
    async findSongs(query: string): Promise<SongHit[]> {
      const response = await fetch(`${searchUrl}?${new URLSearchParams({ query: titleOrArtist(query), fmt: "json", limit: "25" })}`, {
        headers: { "User-Agent": userAgent, Accept: "application/json" },
      });
      if (response.status === 503 || response.status === 429 || response.status >= 500) {
        throw new SourceUnavailable("musicbrainz", retryAfterMs(response));
      }
      if (!response.ok) throw new Error(`MusicBrainz answered ${response.status}`);
      const { recordings } = (await response.json()) as { recordings: Recording[] };
      return songsOf(recordings.filter((recording) => !recording.video));
    },
  };
}

function titleOrArtist(query: string) {
  const words = query.replace(/[+\-&|!(){}[\]^"~*?:\\/]+/g, " ").replace(/\s+/g, " ").trim();
  return `recording:(${words}) OR artist:(${words})`;
}

function retryAfterMs(response: Response) {
  const seconds = Number(response.headers.get("Retry-After"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000;
}

function songsOf(recordings: Recording[]): SongHit[] {
  const works = new Map<string, Array<SongHit>>();
  for (const recording of recordings) {
    const take = {
      title: recording.title,
      artist: recording["artist-credit"].map(({ name, joinphrase }) => name + (joinphrase ?? "")).join(""),
      durationSec: recording.length ? Math.round(recording.length / 1000) : undefined,
    };
    const work = identityKeyOf(take);
    works.set(work, [...(works.get(work) ?? []), take]);
  }
  return [...works.values()].map((takes) => ({
    title: takes[0]!.title,
    artist: takes[0]!.artist,
    durationSec: mostCommon(takes.flatMap((take) => take.durationSec ?? [])),
  }));
}

function mostCommon(durations: number[]) {
  const counts = new Map<number, number>();
  for (const duration of durations) counts.set(duration, (counts.get(duration) ?? 0) + 1);
  let most: number | undefined;
  for (const [duration, count] of counts) if (most === undefined || count > counts.get(most)!) most = duration;
  return most;
}
