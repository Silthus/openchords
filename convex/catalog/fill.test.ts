import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import amazingGrace from "../fixtures/lrclibAmazingGrace.json";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
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
    expect(song?.wordsOnly).toContain("{title: Amazing Grace}");
    expect(song?.wordsOnly).toContain("Amazing grace, how sweet the sound\nThat saved a wretch like me");
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
