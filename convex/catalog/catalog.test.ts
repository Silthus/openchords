import { describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { testBackend } from "../testing.helper";

async function seeded() {
  const backend = testBackend();
  await backend.mutation(internal.catalog.index.seed, {});
  await backend.finishAllScheduledFunctions(() => {});
  return backend;
}

async function openAndWait(backend: ReturnType<typeof testBackend>, songId: Id<"songs">) {
  await backend.mutation(api.catalog.index.open, { songId });
  await backend.finishAllScheduledFunctions(() => {});
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
      ctx.db.insert("songs", {
        title: "House of the Rising Sun",
        artist: "Traditional",
        builtInId: "house-of-the-rising-sun",
        searchText: "House of the Rising Sun Traditional",
      }),
    );
    expect((await backend.query(api.catalog.index.song, { songId }))?.sheets).toHaveLength(0);
    await backend.mutation(api.catalog.index.open, { songId });
    await openAndWait(backend, songId);
    const song = await backend.query(api.catalog.index.song, { songId });
    expect(song?.sheets.map((sheet) => sheet.name)).toEqual(["Classic", "Easy shapes", "Bluesy"]);
  });

  test("opening a seeded Song again stores nothing twice", async () => {
    const backend = await seeded();
    const songId = await risingSunId(backend);
    await openAndWait(backend, songId);
    await openAndWait(backend, songId);
    const song = await backend.query(api.catalog.index.song, { songId });
    expect(song?.sheets).toHaveLength(3);
  });

  test("seeding again keeps one copy of each built-in Song", async () => {
    const backend = await seeded();
    await backend.mutation(internal.catalog.index.seed, {});
    await backend.finishAllScheduledFunctions(() => {});
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

  test("the Song that matches her artist and her title comes first, however many songs share the title", async () => {
    const backend = await seeded();
    const otherZombies = Array.from({ length: 25 }, (_, n) => ({ title: "Zombie Zombie", artist: `Band ${n}` }));
    const cover = { title: "Zombie (Cranberries cover)", artist: "Elderdawn" };
    const hits = [...otherZombies, cover, { title: "Zombie", artist: "The Cranberries" }];
    await backend.mutation(internal.catalog.index.storeHits, { hits });
    const [first] = await backend.query(api.catalog.index.search, { query: "Cranberries Zombie" });
    expect(first).toMatchObject({ title: "Zombie", artist: "The Cranberries" });
  });

  test("the Song that matches her artist and her title comes before a Song with Chord sheets that matches only her title", async () => {
    const backend = await seeded();
    await backend.run(async (ctx) => {
      await ctx.db.insert("songs", { title: "Zombie Jamboree", artist: "Harry Belafonte", hasSheets: true, searchText: "Zombie Jamboree Harry Belafonte" });
    });
    await backend.mutation(internal.catalog.index.storeHits, { hits: [{ title: "Zombie", artist: "The Cranberries" }] });
    const titles = (await backend.query(api.catalog.index.search, { query: "Cranberries Zombie" })).map((song) => song.title);
    expect(titles).toEqual(["Zombie", "Zombie Jamboree"]);
  });

  test("the Song titled as she typed comes before the songs of a band named so", async () => {
    const backend = await seeded();
    const bandSongs = ["Saint Fire", "Face the Fire", "Land of Illusion", "King of Fools", "Circle of Time"].map((title) => ({ title, artist: "Ring of Fire" }));
    await backend.mutation(internal.catalog.index.storeHits, { hits: [...bandSongs, { title: "Ring of Fire", artist: "Johnny Cash" }] });
    const [first] = await backend.query(api.catalog.index.search, { query: "ring of fire" });
    expect(first).toMatchObject({ title: "Ring of Fire", artist: "Johnny Cash" });
  });

  test("the studio title comes before its live and remixed takes", async () => {
    const backend = await seeded();
    const takes = ["Philharmonics (live at DR Koncerthuset)", "Philharmonics (Tom Furse remix)", "Philharmonics"].map((title) => ({ title, artist: "Agnes Obel" }));
    await backend.mutation(internal.catalog.index.storeHits, { hits: takes });
    expect((await titlesFound(backend, "Agnes Obel Philharmonics"))[0]).toBe("Philharmonics");
  });

  test("among Songs titled as she typed, the one MusicBrainz knows most recordings of comes first", async () => {
    const backend = await seeded();
    const covers = Array.from({ length: 25 }, (_, n) => ({ title: "Ring of Fire", artist: `Cover Band ${n}`, takes: 2 }));
    await backend.mutation(internal.catalog.index.storeHits, { hits: [...covers, { title: "Ring of Fire", artist: "Johnny Cash", takes: 18 }] });
    const [first] = await backend.query(api.catalog.index.search, { query: "ring of fire" });
    expect(first).toMatchObject({ title: "Ring of Fire", artist: "Johnny Cash" });
  });

  test("a Song stored before keeps the most recordings MusicBrainz has shown of it since", async () => {
    const backend = await seeded();
    await backend.mutation(internal.catalog.index.storeHits, { hits: [{ title: "Ring of Fire", artist: "Johnny Cash" }] });
    await backend.mutation(internal.catalog.index.storeHits, { hits: [{ title: "Ring of Fire", artist: "Wall of Voodoo", takes: 3 }] });
    await backend.mutation(internal.catalog.index.storeHits, { hits: [{ title: "Ring of Fire", artist: "Johnny Cash", takes: 18 }] });
    await backend.mutation(internal.catalog.index.storeHits, { hits: [{ title: "Ring of Fire", artist: "Johnny Cash", takes: 1 }] });
    const [first] = await backend.query(api.catalog.index.search, { query: "ring of fire" });
    expect(first).toMatchObject({ title: "Ring of Fire", artist: "Johnny Cash" });
  });

  test("a Song with Chord sheets comes before however many songs are titled as she typed", async () => {
    const backend = await seeded();
    const risings = Array.from({ length: 25 }, (_, n) => ({ title: "Rising", artist: `Band ${n}`, takes: 5 }));
    await backend.mutation(internal.catalog.index.storeHits, { hits: risings });
    expect((await titlesFound(backend, "rising"))[0]).toBe("House of the Rising Sun");
  });

  test("a title that only starts with her words is no exact match", async () => {
    const backend = await seeded();
    await backend.mutation(internal.catalog.index.storeHits, { hits: [{ title: "Homes", artist: "Ola Gjeilo" }, { title: "Home", artist: "Phillip Phillips" }] });
    expect(await titlesFound(backend, "home")).toEqual(["Home", "Homes"]);
  });

  test("answers only queries of 2 to 100 characters", async () => {
    const backend = await seeded();
    expect(await titlesFound(backend, " S ")).toEqual([]);
    expect(await titlesFound(backend, `Shenandoah ${"x".repeat(90)}`)).toEqual([]);
  });
});
