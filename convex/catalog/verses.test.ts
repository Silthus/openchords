import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import amazingGrace from "../fixtures/lrclibAmazingGrace.json";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { compose, layerOf, parse, type ChordLayer } from "../../src/sheet";
import { invitedReader, testBackend } from "../testing.helper";

type Backend = ReturnType<typeof testBackend>;

const realFetch = globalThis.fetch;
let lrclibRequests = 0;

function lrclibAnswers(record: typeof amazingGrace) {
  lrclibRequests = 0;
  globalThis.fetch = (async () => {
    lrclibRequests++;
    return Response.json(record);
  }) as unknown as typeof fetch;
}

const song = { title: "Amazing Grace", artist: "Judy Collins", durationSec: 234 };
const wordsAsStoredBeforeVerseBreaks = amazingGrace.plainLyrics
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line !== "");
const aiDraft: ChordLayer = {
  key: "G",
  capo: 0,
  sections: [{ label: "Verse", fromLine: 0 }],
  lines: [
    { lyricLine: 0, chords: [{ word: 0, chord: "G" }] },
    { lyricLine: 5, chords: [{ word: 1, chord: "C" }] },
  ],
};

async function aSongStoredBeforeVerseBreaks(sheets: string[] = []) {
  const backend = testBackend();
  const songId = await backend.run(async (ctx) => {
    const songId = await ctx.db.insert("songs", { ...song, searchText: "Amazing Grace Judy Collins", hasSheets: sheets.length > 0 });
    const lyricsId = await ctx.db.insert("lyrics", {
      songId,
      lines: wordsAsStoredBeforeVerseBreaks,
      provenance: { source: "lrclib", recordId: "19200992", licence: "lrclib-api", fetchedAt: Date.now() },
    });
    for (const chordPro of sheets) {
      await ctx.db.insert("chordSheets", { songId, lyricsId, name: "AI draft", origin: "ai", chordPro, provenance: { source: "ai", recordId: "a-draft", licence: "ai-draft", fetchedAt: Date.now() } });
    }
    await ctx.db.insert("fills", { songId, state: "done", lyrics: "ready", chords: sheets.length > 0 ? "ready" : "none" });
    return songId;
  });
  return { backend, songId };
}

async function songScreenOf(backend: Backend, songId: Id<"songs">) {
  const reader = await invitedReader(backend);
  return (await reader.query(api.catalog.index.song, { songId }))!;
}

beforeEach(() => {
  process.env.OPENCHORDS_INVITES = "on";
  process.env.OPENCHORDS_SOURCES = "builtIn,lrclib";
  process.env.LRCLIB_APP_ID = "openchords-test";
  process.env.LRCLIB_API_KEY = "secret-test-key";
  lrclibAnswers(amazingGrace);
});

afterEach(() => {
  for (const name of ["OPENCHORDS_INVITES", "OPENCHORDS_SOURCES", "LRCLIB_APP_ID", "LRCLIB_API_KEY"]) delete process.env[name];
  globalThis.fetch = realFetch;
});

describe("refetching the verse breaks of a Song stored before they were kept", () => {
  test("shows her its words with a gap between verses", async () => {
    const { backend, songId } = await aSongStoredBeforeVerseBreaks();
    expect(await backend.action(internal.catalog.verses.refetch, { songId })).toBe("stored");
    expect((await songScreenOf(backend, songId)).wordsOnly?.slice(3, 6)).toEqual(["Was blind but now I see", "", "Through many dangers, toils and snares"]);
  });

  test("keeps the same chords on the same words of its AI draft, with a gap between verses", async () => {
    const draft = compose(wordsAsStoredBeforeVerseBreaks, aiDraft, song);
    const { backend, songId } = await aSongStoredBeforeVerseBreaks([draft]);
    await backend.action(internal.catalog.verses.refetch, { songId });
    const [sheet] = (await songScreenOf(backend, songId)).sheets;
    const refetched = parse(sheet!.chordPro);
    expect(layerOf(refetched)).toEqual(layerOf(parse(draft)));
    expect(refetched.sections.slice(0, 2).map((section) => [section.label, section.lines.length])).toEqual([
      ["Verse", 4],
      ["", 4],
    ]);
  });

  test("leaves the Song as it is when LRCLIB's words changed since they were stored", async () => {
    lrclibAnswers({ ...amazingGrace, plainLyrics: amazingGrace.plainLyrics.replace("Amazing grace", "Amazing Grace") });
    const draft = compose(wordsAsStoredBeforeVerseBreaks, aiDraft, song);
    const { backend, songId } = await aSongStoredBeforeVerseBreaks([draft]);
    expect(await backend.action(internal.catalog.verses.refetch, { songId })).toBe("words changed");
    expect((await songScreenOf(backend, songId)).sheets[0]?.chordPro).toBe(draft);
  });

  test("leaves the Song as it is when a Chord sheet does not write its own words back the same", async () => {
    const handEdited = compose(wordsAsStoredBeforeVerseBreaks, aiDraft, song).replace("{capo: 0}", "{capo: 0}\n{comment: an aside}");
    const { backend, songId } = await aSongStoredBeforeVerseBreaks([handEdited]);
    expect(await backend.action(internal.catalog.verses.refetch, { songId })).toBe("sheet would change");
    expect((await songScreenOf(backend, songId)).sheets[0]?.chordPro).toBe(handEdited);
  });

  test("asks LRCLIB once, however often it runs", async () => {
    const { backend, songId } = await aSongStoredBeforeVerseBreaks();
    await backend.action(internal.catalog.verses.refetch, { songId });
    expect(await backend.action(internal.catalog.verses.refetch, { songId })).toBe("already has verses");
    expect(lrclibRequests).toBe(1);
  });

  test("lists the Songs from LRCLIB still without verse breaks", async () => {
    const { backend, songId } = await aSongStoredBeforeVerseBreaks();
    await backend.mutation(internal.catalog.index.seed, {});
    expect(await backend.query(internal.catalog.verses.pending, {})).toEqual([songId]);
    await backend.action(internal.catalog.verses.refetch, { songId });
    expect(await backend.query(internal.catalog.verses.pending, {})).toEqual([]);
  });
});
