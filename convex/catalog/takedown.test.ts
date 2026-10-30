import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import amazingGrace from "../fixtures/lrclibAmazingGrace.json";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { invitedReader, testBackend } from "../testing.helper";

type Backend = ReturnType<typeof testBackend>;

const realFetch = globalThis.fetch;
let lrclibRequests = 0;

async function open(backend: Backend, songId: Id<"songs">) {
  await (await invitedReader(backend)).mutation(api.catalog.index.open, { songId });
  await backend.finishAllScheduledFunctions(() => {});
}

async function aSongWithItsWords() {
  const backend = testBackend();
  await backend.mutation(internal.catalog.index.storeHits, { hits: [{ title: "Amazing Grace", artist: "Judy Collins", durationSec: 234 }] });
  const [song] = await backend.run((ctx) => ctx.db.query("songs").take(1));
  await open(backend, song!._id);
  return { backend, songId: song!._id };
}

async function aSeededBuiltIn() {
  const backend = testBackend();
  await backend.mutation(internal.catalog.index.seed, {});
  await backend.finishAllScheduledFunctions(() => {});
  const songs = await (await invitedReader(backend)).query(api.catalog.index.builtIns, {});
  return { backend, songId: songs.find((song) => song.title === "House of the Rising Sun")!.songId };
}

beforeEach(() => {
  process.env.OPENCHORDS_SOURCES = "builtIn,lrclib";
  process.env.OPENCHORDS_INVITES = "on";
  process.env.LRCLIB_APP_ID = "openchords-test";
  process.env.LRCLIB_API_KEY = "secret-test-key";
  lrclibRequests = 0;
  globalThis.fetch = (async () => {
    lrclibRequests++;
    return Response.json(amazingGrace);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  for (const name of ["OPENCHORDS_SOURCES", "OPENCHORDS_INVITES", "LRCLIB_APP_ID", "LRCLIB_API_KEY"]) delete process.env[name];
  globalThis.fetch = realFetch;
});

function lrclibThatAnswersWhenReleased() {
  let markAsked = () => {};
  let release = () => {};
  const asked = new Promise<void>((resolve) => (markAsked = resolve));
  const released = new Promise<void>((resolve) => (release = resolve));
  globalThis.fetch = (async () => {
    markAsked();
    await released;
    return Response.json(amazingGrace);
  }) as unknown as typeof fetch;
  return { asked, release };
}

async function songAfterTakedown(backend: Backend, songId: Id<"songs">) {
  return await backend.run(async (ctx) => {
    const song = await ctx.db.get(songId);
    const lyrics = await ctx.db.query("lyrics").withIndex("by_song", (q) => q.eq("songId", songId)).collect();
    const sheets = await ctx.db.query("chordSheets").withIndex("by_song", (q) => q.eq("songId", songId)).collect();
    const fills = await ctx.db.query("fills").withIndex("by_song", (q) => q.eq("songId", songId)).collect();
    return { takenDown: song?.takenDownAt !== undefined, lyrics: lyrics.length, sheets: sheets.length, fills: fills.length };
  });
}

describe("taking a Song down", () => {
  test("removes its words, Chord sheets and fill, and marks it taken down", async () => {
    const { backend, songId } = await aSeededBuiltIn();
    await backend.mutation(internal.catalog.takedown.song, { songId });
    expect(await songAfterTakedown(backend, songId)).toEqual({ takenDown: true, lyrics: 0, sheets: 0, fills: 0 });
  });

  test("keeps the Song's link working, without words or Chord sheets", async () => {
    const { backend, songId } = await aSongWithItsWords();
    await backend.mutation(internal.catalog.takedown.song, { songId });
    const reader = await invitedReader(backend);
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ sheets: [], lyrics: "missing", wordsOnly: null });
  });

  test("search no longer lists it", async () => {
    const { backend, songId } = await aSeededBuiltIn();
    await backend.mutation(internal.catalog.takedown.song, { songId });
    const found = await (await invitedReader(backend)).query(api.catalog.index.search, { query: "rising sun" });
    expect(found.map((song) => song.songId)).not.toContain(songId);
  });

  test("opening it again never fetches its words again", async () => {
    const { backend, songId } = await aSongWithItsWords();
    await backend.mutation(internal.catalog.takedown.song, { songId });
    await open(backend, songId);
    expect(lrclibRequests).toBe(1);
    expect(await songAfterTakedown(backend, songId)).toMatchObject({ lyrics: 0, fills: 0 });
  });

  test("a fill still fetching when the Song is taken down stores nothing", async () => {
    const backend = testBackend();
    await backend.mutation(internal.catalog.index.storeHits, { hits: [{ title: "Amazing Grace", artist: "Judy Collins", durationSec: 234 }] });
    const [song] = await backend.run((ctx) => ctx.db.query("songs").take(1));
    const lrclib = lrclibThatAnswersWhenReleased();
    await (await invitedReader(backend)).mutation(api.catalog.index.open, { songId: song!._id });
    const filling = backend.finishAllScheduledFunctions(() => {});
    await lrclib.asked;
    await backend.mutation(internal.catalog.takedown.song, { songId: song!._id });
    lrclib.release();
    await filling;
    expect(await songAfterTakedown(backend, song!._id)).toEqual({ takenDown: true, lyrics: 0, sheets: 0, fills: 0 });
  });

  test("a built-in Song taken down stays down when the seed runs again", async () => {
    const { backend, songId } = await aSeededBuiltIn();
    await backend.mutation(internal.catalog.takedown.song, { songId });
    await backend.mutation(internal.catalog.index.seed, {});
    await backend.finishAllScheduledFunctions(() => {});
    expect((await (await invitedReader(backend)).query(api.catalog.index.song, { songId }))?.sheets).toEqual([]);
  });
});
