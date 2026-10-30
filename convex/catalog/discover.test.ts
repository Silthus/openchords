import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { api, internal } from "../_generated/api";
import ringOfFire from "../fixtures/musicbrainzRingOfFire.json";
import { testBackend } from "../testing.helper";

type Backend = ReturnType<typeof testBackend>;
type Reader = ReturnType<Backend["withIdentity"]>;

const realFetch = globalThis.fetch;
const anna = { email: "anna@example.com", name: "Anna Berg" };
let musicbrainzRequests = 0;

function musicbrainzAnswers(response: () => Response) {
  musicbrainzRequests = 0;
  globalThis.fetch = (async () => {
    musicbrainzRequests++;
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

async function ringsOfFire(reader: Reader) {
  const found = await reader.query(api.catalog.index.search, { query: "ring of fire" });
  return found.filter((song) => song.title === "Ring of Fire");
}

async function readerWithSongSearch() {
  const backend = testBackend();
  await backend.mutation(internal.catalog.index.seed, {});
  return await invitedReader(backend);
}

beforeEach(() => {
  process.env.OPENCHORDS_INVITES = "on";
  process.env.OPENCHORDS_SOURCES = "builtIn,musicbrainz";
  musicbrainzAnswers(() => Response.json(ringOfFire));
  setSystemTime(new Date("2026-10-30T08:00:00Z"));
});

afterEach(() => {
  delete process.env.OPENCHORDS_INVITES;
  delete process.env.OPENCHORDS_SOURCES;
  globalThis.fetch = realFetch;
  setSystemTime();
});

describe("searching beyond the built-in Songs", () => {
  test("she finds a song nobody searched before, as words only", async () => {
    const reader = await readerWithSongSearch();
    expect(await reader.action(api.catalog.index.discover, { query: "ring of fire johnny cash" })).toEqual({ complete: true });
    expect((await ringsOfFire(reader)).map(({ title, artist, hasSheets }) => ({ title, artist, hasSheets }))).toEqual([
      { title: "Ring of Fire", artist: "Johnny Cash", hasSheets: false },
    ]);
  });

  test("a built-in Song found by search has its Chord sheets", async () => {
    const reader = await readerWithSongSearch();
    const [risingSun] = await reader.query(api.catalog.index.search, { query: "rising sun" });
    expect(risingSun).toMatchObject({ title: "House of the Rising Sun", hasSheets: true });
  });

  test("a Song stored before Songs had an identity is still found, not stored twice", async () => {
    musicbrainzAnswers(() =>
      Response.json({ recordings: [{ title: "House of the Rising Sun", length: 270000, "artist-credit": [{ name: "Traditional" }] }] }),
    );
    const backend = testBackend();
    await backend.mutation(internal.catalog.index.seed, {});
    await backend.run(async (ctx) => {
      for (const song of await ctx.db.query("songs").collect()) await ctx.db.patch(song._id, { identityKey: undefined });
    });
    const reader = await invitedReader(backend);
    await reader.action(api.catalog.index.discover, { query: "house of the rising sun" });
    const found = await reader.query(api.catalog.index.search, { query: "rising sun" });
    expect(found.filter((song) => song.title === "House of the Rising Sun")).toEqual([
      expect.objectContaining({ artist: "Traditional", hasSheets: true }),
    ]);
  });

  test("searching the same song again keeps one Song for it", async () => {
    const reader = await readerWithSongSearch();
    await reader.action(api.catalog.index.discover, { query: "ring of fire johnny cash" });
    setSystemTime(new Date("2026-10-30T08:00:05Z"));
    await reader.action(api.catalog.index.discover, { query: "ring of fire johnny cash" });
    expect(await ringsOfFire(reader)).toHaveLength(1);
  });

  test("asks MusicBrainz at most once a second and says when more results come", async () => {
    const reader = await readerWithSongSearch();
    await reader.action(api.catalog.index.discover, { query: "ring of fire" });
    const second = await reader.action(api.catalog.index.discover, { query: "ring of fire johnny cash" });
    expect(second).toEqual({ complete: false, retryAt: expect.any(Number) });
    expect(second.retryAt! - Date.now()).toBeWithin(1, 1001);
    expect(musicbrainzRequests).toBe(1);
  });

  test("a busy MusicBrainz leaves the search incomplete until it is ready again", async () => {
    musicbrainzAnswers(() => new Response("busy", { status: 503, headers: { "Retry-After": "2" } }));
    const reader = await readerWithSongSearch();
    expect(await reader.action(api.catalog.index.discover, { query: "ring of fire" })).toEqual({
      complete: false,
      retryAt: Date.now() + 2000,
    });
  });

  test("a visitor who is not signed in cannot reach MusicBrainz", async () => {
    const backend = testBackend();
    await expect(backend.action(api.catalog.index.discover, { query: "ring of fire" })).rejects.toThrow(/SIGN_IN_REQUIRED/);
    expect(musicbrainzRequests).toBe(0);
  });

  test("with only the built-in Songs on, search asks nobody", async () => {
    delete process.env.OPENCHORDS_INVITES;
    delete process.env.OPENCHORDS_SOURCES;
    const backend = testBackend();
    expect(await backend.action(api.catalog.index.discover, { query: "ring of fire" })).toEqual({ complete: true });
    expect(musicbrainzRequests).toBe(0);
  });
});
