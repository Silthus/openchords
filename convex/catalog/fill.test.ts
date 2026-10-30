import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import amazingGrace from "../fixtures/lrclibAmazingGrace.json";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { sourcesFor } from "../sources";
import { invitedReader, testBackend } from "../testing.helper";

type Backend = ReturnType<typeof testBackend>;
type Reader = ReturnType<Backend["withIdentity"]>;

const realFetch = globalThis.fetch;
let lrclibRequests = 0;

function lrclibAnswers(response: () => Response) {
  lrclibRequests = 0;
  globalThis.fetch = (async () => {
    lrclibRequests++;
    return response();
  }) as unknown as typeof fetch;
}

function lrclibThatAnswersEachRequestWhenTold() {
  const pending: Array<(response: Response) => void> = [];
  const askedFor: Array<() => void> = [];
  const asked = (times: number) => new Promise<void>((resolve) => (pending.length >= times ? resolve() : (askedFor[times] = resolve)));
  lrclibRequests = 0;
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => {
      lrclibRequests++;
      pending.push(resolve);
      askedFor[pending.length]?.();
    })) as unknown as typeof fetch;
  return { asked, answer: (request: number, response: Response) => pending[request - 1]!(response) };
}

async function lyricsRowsOf(backend: Backend, songId: Id<"songs">) {
  return await backend.run((ctx) => ctx.db.query("lyrics").withIndex("by_song", (q) => q.eq("songId", songId)).collect());
}

async function untilItsWordsAreStored(backend: Backend, songId: Id<"songs">) {
  while ((await lyricsRowsOf(backend, songId)).length === 0) await new Promise((resolve) => setTimeout(resolve, 5));
}

async function aSongWhoseEarlierFillStillFetchesWhenOpened() {
  const opened = await aSongNobodyOpened();
  const lrclib = lrclibThatAnswersEachRequestWhenTold();
  await opened.backend.run(async (ctx) => {
    await ctx.db.insert("fills", { songId: opened.songId, state: "running", lyrics: "pending", chords: "pending" });
    await ctx.scheduler.runAfter(0, internal.catalog.fill.run, { songId: opened.songId });
  });
  const bothFills = opened.backend.finishAllScheduledFunctions(() => {});
  await lrclib.asked(1);
  await opened.reader.mutation(api.catalog.index.open, { songId: opened.songId });
  await lrclib.asked(2);
  return { ...opened, lrclib, bothFills };
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

  test("opened while the fill an earlier version started still fetches, it stores its words once", async () => {
    const { backend, reader, songId, lrclib, bothFills } = await aSongWhoseEarlierFillStillFetchesWhenOpened();
    lrclib.answer(1, Response.json(amazingGrace));
    lrclib.answer(2, Response.json(amazingGrace));
    await bothFills;
    expect(await lyricsRowsOf(backend, songId)).toHaveLength(1);
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ lyrics: "ready" });
  });

  test("an earlier fill that finds no words keeps the words a newer fill stored", async () => {
    const { backend, reader, songId, lrclib, bothFills } = await aSongWhoseEarlierFillStillFetchesWhenOpened();
    lrclib.answer(2, Response.json(amazingGrace));
    await untilItsWordsAreStored(backend, songId);
    lrclib.answer(1, new Response("not found", { status: 404 }));
    await bothFills;
    const song = await reader.query(api.catalog.index.song, { songId });
    expect(song?.lyrics).toBe("ready");
    expect(song?.wordsOnly?.slice(0, 2)).toEqual(["Amazing grace, how sweet the sound", "That saved a wretch like me"]);
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

  test("a fill an earlier version left running without a run recovers on the next open", async () => {
    lrclibAnswers(() => Response.json(amazingGrace));
    const { backend, reader, songId } = await aSongNobodyOpened();
    await backend.run((ctx) => ctx.db.insert("fills", { songId, state: "running", lyrics: "pending", chords: "pending" }));
    await openAndRetry(backend, reader, songId);
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ lyrics: "ready" });
  });

  test("a run that is replayed after it stored everything adds no Chord sheets twice", async () => {
    const backend = testBackend();
    await backend.mutation(internal.catalog.index.seed, {});
    await backend.finishAllScheduledFunctions(() => jest.runAllTimers());
    const reader = await invitedReader(backend);
    const [risingSun] = await reader.query(api.catalog.index.search, { query: "rising sun" });
    await backend.action(internal.catalog.fill.run, { songId: risingSun!.songId });
    expect((await reader.query(api.catalog.index.song, { songId: risingSun!.songId }))?.sheets).toHaveLength(3);
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

describe("when the AI drafts chords", () => {
  const withTheAi = "builtIn,lrclib,ai";

  async function aSongWithWordsOnly(chordSourcesAsked?: string[]) {
    const opened = await aSongNobodyOpened();
    await opened.backend.run(async (ctx) => {
      await ctx.db.insert("lyrics", { songId: opened.songId, lines: ["Amazing grace, how sweet the sound"], provenance: { source: "lrclib", recordId: "19200992", licence: "lrclib-api", fetchedAt: Date.now() } });
      await ctx.db.insert("fills", { songId: opened.songId, state: "done", lyrics: "ready", chords: "none", chordSourcesAsked });
    });
    return opened;
  }

  test("she reads the words while the chords are written", async () => {
    const { backend, reader, songId } = await aSongNobodyOpened();
    await backend.run(async (ctx) => {
      await ctx.db.insert("lyrics", { songId, lines: ["Amazing grace, how sweet the sound"], provenance: { source: "lrclib", recordId: "19200992", licence: "lrclib-api", fetchedAt: Date.now() } });
      await ctx.db.insert("fills", { songId, state: "running", lyrics: "ready", chords: "pending", runId: "a-run" });
    });
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ wordsOnly: ["Amazing grace, how sweet the sound"], writingChords: true });
  });

  test("a song that got only its words before the AI drafted gets a draft when she opens it", async () => {
    const { backend, reader, songId } = await aSongNobodyOpened();
    await openAndWait(backend, reader, songId);
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ writingChords: false });
    process.env.OPENCHORDS_SOURCES = withTheAi;
    await reader.mutation(api.catalog.index.open, { songId });
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ lyrics: "ready", writingChords: true });
  });

  test("a song the AI could not draft for is not asked again", async () => {
    process.env.OPENCHORDS_SOURCES = withTheAi;
    const { reader, songId } = await aSongWithWordsOnly(["builtIn", "ai"]);
    await reader.mutation(api.catalog.index.open, { songId });
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ lyrics: "ready", writingChords: false });
  });

  test("taking ai out of OPENCHORDS_SOURCES stops new drafts", async () => {
    const { reader, songId } = await aSongWithWordsOnly();
    await reader.mutation(api.catalog.index.open, { songId });
    expect(await reader.query(api.catalog.index.song, { songId })).toMatchObject({ lyrics: "ready", writingChords: false });
  });
});
