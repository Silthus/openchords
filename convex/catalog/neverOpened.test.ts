import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import amazingGrace from "../fixtures/lrclibAmazingGrace.json";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { invitedReader, testBackend } from "../testing.helper";

type Backend = ReturnType<typeof testBackend>;

const judyCollins = { title: "Amazing Grace", artist: "Judy Collins" };
const realFetch = globalThis.fetch;
let lrclibRequests = 0;

async function open(backend: Backend, songId: Id<"songs">) {
  await (await invitedReader(backend)).mutation(api.catalog.index.open, { songId });
  await backend.finishAllScheduledFunctions(() => {});
}

async function aSongWithWordsAndAnAiDraft() {
  const backend = testBackend();
  await backend.mutation(internal.catalog.index.storeHits, { hits: [{ ...judyCollins, durationSec: 234 }] });
  const [song] = await backend.run((ctx) => ctx.db.query("songs").take(1));
  const songId = song!._id;
  await open(backend, songId);
  const lyricsId = await backend.run(async (ctx) => (await ctx.db.query("lyrics").withIndex("by_song", (q) => q.eq("songId", songId)).unique())!._id);
  const provenance = { source: "ai" as const, recordId: "test-model#prompt", licence: "ai-generated", fetchedAt: Date.now() };
  const sheets = [{ name: "AI draft", origin: "ai" as const, provenance, chordPro: "{title: Amazing Grace}\n[G]Amazing grace" }];
  await backend.mutation(internal.catalog.fill.storeChordSheets, { songId, lyricsId, sheets, chordSourcesAsked: ["builtIn", "ai"] });
  return { backend, songId };
}

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

async function searchFor(backend: Backend, query: string) {
  return await (await invitedReader(backend)).query(api.catalog.index.search, { query });
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
  for (const name of ["OPENCHORDS_SOURCES", "OPENCHORDS_INVITES", "LRCLIB_APP_ID", "LRCLIB_API_KEY", "OPENCHORDS_ENV"]) delete process.env[name];
  globalThis.fetch = realFetch;
});

describe("putting a Song back to never opened, for walks on dev", () => {
  test("its link shows it as never opened, without words or Chord sheets", async () => {
    const { backend, songId } = await aSongWithWordsAndAnAiDraft();
    await backend.mutation(internal.catalog.neverOpened.reset, judyCollins);
    const reader = await invitedReader(backend);
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ sheets: [], lyrics: "pending", wordsOnly: null, writingChords: false });
  });

  test("search lists it as words only again", async () => {
    const { backend, songId } = await aSongWithWordsAndAnAiDraft();
    await backend.mutation(internal.catalog.neverOpened.reset, judyCollins);
    expect(await searchFor(backend, "amazing grace judy collins")).toContainEqual({ songId, ...judyCollins, hasSheets: false });
  });

  test("opening it again fetches its words again", async () => {
    const { backend, songId } = await aSongWithWordsAndAnAiDraft();
    await backend.mutation(internal.catalog.neverOpened.reset, judyCollins);
    await open(backend, songId);
    expect(lrclibRequests).toBe(2);
    expect((await (await invitedReader(backend)).query(api.catalog.index.song, { songId }))?.lyrics).toBe("ready");
  });

  test("a Song nobody found yet is left to be found", async () => {
    const backend = testBackend();
    await backend.mutation(internal.catalog.neverOpened.reset, judyCollins);
    expect(await searchFor(backend, "amazing grace judy collins")).toEqual([]);
  });

  test("a Song still being filled is refused, so the running fill finishes with what it stored", async () => {
    const backend = testBackend();
    await backend.mutation(internal.catalog.index.storeHits, { hits: [{ ...judyCollins, durationSec: 234 }] });
    const [song] = await backend.run((ctx) => ctx.db.query("songs").take(1));
    const lrclib = lrclibThatAnswersWhenReleased();
    await (await invitedReader(backend)).mutation(api.catalog.index.open, { songId: song!._id });
    const filling = backend.finishAllScheduledFunctions(() => {});
    await lrclib.asked;
    await expect(backend.mutation(internal.catalog.neverOpened.reset, judyCollins)).rejects.toThrow("still being filled");
    lrclib.release();
    await filling;
    expect((await (await invitedReader(backend)).query(api.catalog.index.song, { songId: song!._id }))?.lyrics).toBe("ready");
  });

  test("production refuses, and the Song keeps its words and Chord sheets", async () => {
    const { backend, songId } = await aSongWithWordsAndAnAiDraft();
    process.env.OPENCHORDS_ENV = "production";
    await expect(backend.mutation(internal.catalog.neverOpened.reset, judyCollins)).rejects.toThrow("never on production");
    delete process.env.OPENCHORDS_ENV;
    expect(await (await invitedReader(backend)).query(api.catalog.index.song, { songId })).toMatchObject({ lyrics: "ready", sheets: [{ name: "AI draft" }] });
  });
});
