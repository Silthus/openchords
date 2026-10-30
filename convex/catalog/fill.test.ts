import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import amazingGrace from "../fixtures/lrclibAmazingGrace.json";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { sourcesFor } from "../sources";
import { testBackend } from "../testing.helper";

type Backend = ReturnType<typeof testBackend>;
type Reader = ReturnType<Backend["withIdentity"]>;

const realFetch = globalThis.fetch;
const anna = { email: "anna@example.com", name: "Anna Berg" };
let lrclibRequests = 0;

function lrclibAnswers(response: () => Response) {
  lrclibRequests = 0;
  globalThis.fetch = (async () => {
    lrclibRequests++;
    return response();
  }) as unknown as typeof fetch;
}

async function invitedReader(backend: Backend) {
  await backend.mutation(internal.access.invites.add, { email: anna.email });
  const subject = await backend.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { ...anna, emailVerificationTime: Date.now() });
    const sessionId = await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 60 * 60 * 1000 });
    return `${userId}|${sessionId}`;
  });
  return backend.withIdentity({ subject });
}

async function aSongNobodyOpened() {
  const backend = testBackend();
  await backend.mutation(internal.catalog.index.storeHits, { hits: [{ title: "Amazing Grace", artist: "Judy Collins", durationSec: 234 }] });
  const [song] = await backend.run((ctx) => ctx.db.query("songs").take(1));
  return { backend, reader: await invitedReader(backend), songId: song!._id };
}

async function openAndWait(backend: Backend, reader: Reader, songId: Id<"songs">) {
  await reader.mutation(api.catalog.index.open, { songId });
  await backend.finishAllScheduledFunctions(() => {});
}

beforeEach(() => {
  process.env.OPENCHORDS_INVITES = "on";
  process.env.OPENCHORDS_SOURCES = "builtIn,lrclib";
  process.env.LRCLIB_APP_ID = "openchords-test";
  process.env.LRCLIB_API_KEY = "secret-test-key";
  lrclibAnswers(() => Response.json(amazingGrace));
});

afterEach(() => {
  for (const name of ["OPENCHORDS_INVITES", "OPENCHORDS_SOURCES", "LRCLIB_APP_ID", "LRCLIB_API_KEY"]) delete process.env[name];
  globalThis.fetch = realFetch;
});

describe("opening a song nobody opened before", () => {
  test("says it is fetching the words until they arrive", async () => {
    const { reader, songId } = await aSongNobodyOpened();
    await reader.mutation(api.catalog.index.open, { songId });
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ lyrics: "pending", wordsOnly: null, sheets: [] });
  });

  test("shows her the words, without chords yet", async () => {
    const { backend, reader, songId } = await aSongNobodyOpened();
    await openAndWait(backend, reader, songId);
    const song = await reader.query(api.catalog.index.song, { songId });
    expect(song).toMatchObject({ lyrics: "ready", sheets: [] });
    expect(song?.wordsOnly?.slice(0, 2)).toEqual(["Amazing grace, how sweet the sound", "That saved a wretch like me"]);
  });

  test("shows words with brackets and braces as she would sing them, not as chords", async () => {
    const words = ["[Chorus]", "I fell into a [burning] ring", "{spoken: come home}"];
    lrclibAnswers(() => Response.json({ ...amazingGrace, plainLyrics: words.join("\n") }));
    const { backend, reader, songId } = await aSongNobodyOpened();
    await openAndWait(backend, reader, songId);
    expect((await reader.query(api.catalog.index.song, { songId }))?.wordsOnly).toEqual(words);
  });

  test("keeps where the words came from", async () => {
    const { backend, reader, songId } = await aSongNobodyOpened();
    await openAndWait(backend, reader, songId);
    const [lyrics] = await backend.run((ctx) => ctx.db.query("lyrics").collect());
    expect(lyrics?.provenance).toMatchObject({ source: "lrclib", recordId: "19200992", licence: "lrclib-api" });
  });

  test("asks LRCLIB once, however often she opens it", async () => {
    const { backend, reader, songId } = await aSongNobodyOpened();
    await openAndWait(backend, reader, songId);
    await openAndWait(backend, reader, songId);
    expect(lrclibRequests).toBe(1);
  });

  test("says when no lyrics exist for the song", async () => {
    lrclibAnswers(() => new Response(JSON.stringify({ name: "TrackNotFound" }), { status: 404 }));
    const { backend, reader, songId } = await aSongNobodyOpened();
    await openAndWait(backend, reader, songId);
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ lyrics: "missing", wordsOnly: null, sheets: [] });
  });

  test("a built-in Song gets its words and Chord sheets without asking LRCLIB", async () => {
    const backend = testBackend();
    await backend.mutation(internal.catalog.index.seed, {});
    await backend.finishAllScheduledFunctions(() => {});
    const reader = await invitedReader(backend);
    const [risingSun] = await reader.query(api.catalog.index.search, { query: "rising sun" });
    const song = await reader.query(api.catalog.index.song, { songId: risingSun!.songId });
    expect(song).toMatchObject({ lyrics: "ready", wordsOnly: null });
    expect(song?.sheets).toHaveLength(3);
    expect(lrclibRequests).toBe(0);
  });
});

describe("when the lyrics service cannot be reached", () => {
  const busy = () => new Response("busy", { status: 503 });
  const anHour = 60 * 60 * 1000;

  async function openAndRetry(backend: Backend, reader: Reader, songId: Id<"songs">) {
    await reader.mutation(api.catalog.index.open, { songId });
    await backend.finishAllScheduledFunctions(() => jest.runAllTimers());
  }

  async function aSongLrclibCouldNotServe() {
    lrclibAnswers(busy);
    const opened = await aSongNobodyOpened();
    await openAndRetry(opened.backend, opened.reader, opened.songId);
    return opened;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-30T08:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("a refused first try still brings the words", async () => {
    let answers = 0;
    lrclibAnswers(() => (answers++ === 0 ? busy() : Response.json(amazingGrace)));
    const { backend, reader, songId } = await aSongNobodyOpened();
    await openAndRetry(backend, reader, songId);
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ lyrics: "ready" });
    expect(lrclibRequests).toBe(2);
  });

  test("tries three times, then says it will try again soon", async () => {
    const { reader, songId } = await aSongLrclibCouldNotServe();
    expect(lrclibRequests).toBe(3);
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ lyrics: "unreachable", wordsOnly: null });
  });

  test("opening it again within the hour asks nobody", async () => {
    const { backend, reader, songId } = await aSongLrclibCouldNotServe();
    jest.setSystemTime(Date.now() + anHour / 2);
    await openAndRetry(backend, reader, songId);
    expect(lrclibRequests).toBe(3);
  });

  test("opening it after the hour starts a new run that brings the words", async () => {
    const { backend, reader, songId } = await aSongLrclibCouldNotServe();
    lrclibAnswers(() => Response.json(amazingGrace));
    jest.setSystemTime(Date.now() + anHour);
    await openAndRetry(backend, reader, songId);
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ lyrics: "ready" });
    expect(lrclibRequests).toBe(1);
  });

  test("a new run does not ask LRCLIB again for words it already stored", async () => {
    const { backend, reader, songId } = await aSongNobodyOpened();
    const stored = ["Amazing grace, how sweet the sound", "That saved a wretch like me"];
    await backend.run(async (ctx) => {
      await ctx.db.insert("lyrics", { songId, lines: stored, provenance: { source: "lrclib", recordId: "19200992", licence: "lrclib-api", fetchedAt: Date.now() } });
      await ctx.db.insert("fills", { songId, state: "failed", lyrics: "ready", chords: "pending", retryAt: Date.now() });
    });
    await openAndRetry(backend, reader, songId);
    expect((await reader.query(api.catalog.index.song, { songId }))?.wordsOnly).toEqual(stored);
    expect(lrclibRequests).toBe(0);
  });

  test("a new run keeps the words an earlier run stored and brings what is still missing", async () => {
    const backend = testBackend();
    const reader = await invitedReader(backend);
    const risingSun = { title: "House of the Rising Sun", artist: "Traditional", builtInId: "house-of-the-rising-sun" };
    const words = (await sourcesFor({}).lyricsFor(risingSun))!;
    const songId = await backend.run(async (ctx) => {
      const songId = await ctx.db.insert("songs", { ...risingSun, searchText: "House of the Rising Sun Traditional" });
      await ctx.db.insert("lyrics", { songId, ...words });
      await ctx.db.insert("fills", { songId, state: "failed", lyrics: "ready", chords: "pending", retryAt: Date.now() });
      return songId;
    });
    await openAndRetry(backend, reader, songId);
    expect((await reader.query(api.catalog.index.song, { songId }))?.sheets).toHaveLength(3);
    expect(await backend.run((ctx) => ctx.db.query("lyrics").collect())).toHaveLength(1);
  });
});
