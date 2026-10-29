import { describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import { testBackend } from "../testing.helper";

async function seeded() {
  const backend = testBackend();
  await backend.mutation(internal.catalog.index.seed, {});
  return backend;
}

async function risingSunId(backend: ReturnType<typeof testBackend>) {
  const songs = await backend.query(api.catalog.index.builtIns, {});
  return songs.find((song) => song.title === "House of the Rising Sun")!.songId;
}

describe("Catalog", () => {
  test("the seed makes every built-in Song readable", async () => {
    const backend = await seeded();
    const songs = await backend.query(api.catalog.index.builtIns, {});
    expect(songs).toHaveLength(6);
    for (const { songId } of songs) {
      const song = await backend.query(api.catalog.index.song, { songId });
      expect(song?.sheets.length).toBeGreaterThan(0);
    }
  });

  test("a Song comes with its Chord sheets in order, composed over its words", async () => {
    const backend = await seeded();
    const song = await backend.query(api.catalog.index.song, { songId: await risingSunId(backend) });
    expect(song?.song).toMatchObject({ title: "House of the Rising Sun", artist: "Traditional" });
    expect(song?.sheets.map((sheet) => [sheet.name, sheet.origin])).toEqual([
      ["Classic", "builtIn"],
      ["Easy shapes", "builtIn"],
      ["Bluesy", "builtIn"],
    ]);
    expect(song?.sheets[1]?.chordPro).toContain("{capo: 5}");
    expect(song?.sheets[0]?.chordPro).toContain("There [Am]is a [C]house in [D]New [F]Orleans");
  });

  test("opening a Song fills it once, however often it is opened", async () => {
    const backend = testBackend();
    const songId = await backend.run((ctx) =>
      ctx.db.insert("songs", { title: "House of the Rising Sun", artist: "Traditional", builtInId: "house-of-the-rising-sun" }),
    );
    expect((await backend.query(api.catalog.index.song, { songId }))?.sheets).toHaveLength(0);
    await backend.mutation(api.catalog.index.open, { songId });
    await backend.mutation(api.catalog.index.open, { songId });
    const song = await backend.query(api.catalog.index.song, { songId });
    expect(song?.sheets.map((sheet) => sheet.name)).toEqual(["Classic", "Easy shapes", "Bluesy"]);
  });

  test("opening a seeded Song again stores nothing twice", async () => {
    const backend = await seeded();
    const songId = await risingSunId(backend);
    await backend.mutation(api.catalog.index.open, { songId });
    await backend.mutation(api.catalog.index.open, { songId });
    const song = await backend.query(api.catalog.index.song, { songId });
    expect(song?.sheets).toHaveLength(3);
  });

  test("seeding again keeps one copy of each built-in Song", async () => {
    const backend = await seeded();
    await backend.mutation(internal.catalog.index.seed, {});
    const songs = await backend.query(api.catalog.index.builtIns, {});
    expect(songs).toHaveLength(6);
    const song = await backend.query(api.catalog.index.song, { songId: await risingSunId(backend) });
    expect(song?.sheets).toHaveLength(3);
  });

  test("a link that names no Song finds nothing", async () => {
    const backend = await seeded();
    expect(await backend.query(api.catalog.index.song, { songId: "x" })).toBeNull();
  });
});

describe("Catalog search", () => {
  async function titlesFound(backend: ReturnType<typeof testBackend>, query: string) {
    const songs = await backend.query(api.catalog.index.search, { query });
    return songs.map((song) => song.title);
  }

  test("finds a Song from part of its title", async () => {
    const backend = await seeded();
    expect(await titlesFound(backend, "Rising")).toEqual(["House of the Rising Sun"]);
    expect(await titlesFound(backend, "shenan")).toEqual(["Shenandoah"]);
  });

  test("finds a Song by its artist", async () => {
    const backend = await seeded();
    expect(await titlesFound(backend, "John Newton")).toEqual(["Amazing Grace"]);
  });

  test("answers only queries of 2 to 100 characters", async () => {
    const backend = await seeded();
    expect(await titlesFound(backend, " S ")).toEqual([]);
    expect(await titlesFound(backend, `Shenandoah ${"x".repeat(90)}`)).toEqual([]);
  });

  test("finds built-in Songs stored before search existed once they are seeded again", async () => {
    const backend = testBackend();
    await backend.run((ctx) =>
      ctx.db.insert("songs", { title: "Shenandoah", artist: "Traditional", builtInId: "shenandoah" }),
    );
    await backend.mutation(internal.catalog.index.seed, {});
    expect(await titlesFound(backend, "Shenandoah")).toEqual(["Shenandoah"]);
  });
});
