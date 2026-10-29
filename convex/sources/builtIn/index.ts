import { layerOf, lyricsOf, parse } from "../../../src/sheet";
import type { ChordDraft, Lyrics, SongHit } from "..";
import { amazingGrace } from "./amazingGrace";
import { houseOfTheRisingSun } from "./houseOfTheRisingSun";
import { redRiverValley } from "./redRiverValley";
import { scarboroughFair } from "./scarboroughFair";
import { shenandoah } from "./shenandoah";
import { wayfaringStranger } from "./wayfaringStranger";

const songs = [houseOfTheRisingSun, amazingGrace, scarboroughFair, wayfaringStranger, shenandoah, redRiverValley].map(
  ({ builtInId, sheets }) => {
    const first = parse(sheets[0].chordPro);
    return {
      builtInId,
      title: first.meta.title,
      artist: first.meta.artist,
      lines: lyricsOf(first),
      sheets: sheets.map(({ name, chordPro }) => ({ name, layer: layerOf(parse(chordPro)) })),
    };
  },
);

export const builtIns = songs.map(({ builtInId, title, artist }) => ({ builtInId, title, artist }));

function songFor(hit: SongHit) {
  return songs.find((song) => song.builtInId === hit.builtInId);
}

function publicDomain(recordId: string) {
  return { source: "builtIn" as const, recordId, licence: "public-domain", fetchedAt: Date.now() };
}

export async function lyricsFor(hit: SongHit): Promise<Lyrics | null> {
  const song = songFor(hit);
  return song ? { lines: song.lines, provenance: publicDomain(song.builtInId) } : null;
}

export async function chordsFor(hit: SongHit): Promise<ChordDraft[]> {
  return (songFor(hit)?.sheets ?? []).map(({ name, layer }) => ({
    name,
    layer,
    origin: "builtIn",
    provenance: publicDomain(`${hit.builtInId}:${name}`),
  }));
}
