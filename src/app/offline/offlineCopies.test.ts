import { describe, expect, test } from "bun:test";
import { IDBFactory } from "fake-indexeddb";
import type { Id } from "../../../convex/_generated/dataModel";
import { offlineCopies, type OfflineCopy } from "./offlineCopies";

const copyOf = (name: string, openedAt: number, saved = false): OfflineCopy => {
  const songId = name as Id<"songs">;
  const chordSheetId = `${name}-sheet` as Id<"chordSheets">;
  return {
    found: {
      song: { songId, title: name, artist: "Traditional" },
      sheets: [{ chordSheetId, name: "Classic", origin: "builtIn", chordPro: "[G]Oh Shenandoah", replaces: [] }],
      lyrics: "ready",
      wordsOnly: null,
      writingChords: false,
    },
    entry: { songId, chordSheetId, transpose: 2, capos: { [chordSheetId]: 3 }, speed: 4, saved, updatedAt: openedAt },
    openedAt,
  };
};

const openedOneAfterAnother = (count: number, from = 1) =>
  Array.from({ length: count }, (_, index) => copyOf(`song-${from + index}`, from + index));

const openedOffline = (copies: ReturnType<typeof offlineCopies>, songId: string) => copies.reopen(songId, 1000);

async function keepAll(copies: ReturnType<typeof offlineCopies>, opened: OfflineCopy[]) {
  for (const copy of opened) await copies.keep(copy);
}

describe("the Songs her phone keeps", () => {
  test("opens a Song she opened with her choices for it", async () => {
    const copies = offlineCopies(() => new IDBFactory());
    const shenandoah = copyOf("shenandoah", 1, true);
    await copies.keep(shenandoah);
    expect(await openedOffline(copies, shenandoah.found.song.songId)).toEqual({ ...shenandoah, openedAt: 1000 });
  });

  test("has no copy of a Song she never opened", async () => {
    const copies = offlineCopies(() => new IDBFactory());
    await copies.keep(copyOf("shenandoah", 1));
    expect(await openedOffline(copies, "amazing-grace")).toBeUndefined();
  });

  test("keeps her newest choices for a Song she opens again", async () => {
    const copies = offlineCopies(() => new IDBFactory());
    await copies.keep(copyOf("shenandoah", 1));
    await copies.keep(copyOf("shenandoah", 2, true));
    expect((await openedOffline(copies, "shenandoah"))?.entry?.saved).toBe(true);
  });

  test("keeps the last 20 Songs she opened and lets older ones go", async () => {
    const copies = offlineCopies(() => new IDBFactory());
    await keepAll(copies, openedOneAfterAnother(21));
    expect(await openedOffline(copies, "song-1")).toBeUndefined();
    expect(await openedOffline(copies, "song-2")).toBeDefined();
    expect(await openedOffline(copies, "song-21")).toBeDefined();
  });

  test("keeps a saved Song however long ago she opened it", async () => {
    const copies = offlineCopies(() => new IDBFactory());
    await copies.keep(copyOf("shenandoah", 0, true));
    await keepAll(copies, openedOneAfterAnother(21));
    expect(await openedOffline(copies, "shenandoah")).toBeDefined();
    expect(await openedOffline(copies, "song-1")).toBeUndefined();
  });

  test("counts a Song she opens offline as opened, so it stays among the last 20", async () => {
    const copies = offlineCopies(() => new IDBFactory());
    await keepAll(copies, openedOneAfterAnother(20));
    await copies.reopen("song-1", 21);
    await copies.keep(copyOf("song-22", 22));
    expect(await openedOffline(copies, "song-1")).toBeDefined();
    expect(await openedOffline(copies, "song-2")).toBeUndefined();
  });

  test("lists only her saved Songs as her Library", async () => {
    const copies = offlineCopies(() => new IDBFactory());
    await keepAll(copies, [copyOf("shenandoah", 1, true), copyOf("amazing-grace", 2), copyOf("wild-rover", 3, true)]);
    const titles = (await copies.saved()).map((copy) => copy.found.song.title);
    expect(titles.toSorted()).toEqual(["shenandoah", "wild-rover"]);
  });
});

describe("signing out", () => {
  test("takes every Song and her choices off the phone", async () => {
    const copies = offlineCopies(() => new IDBFactory());
    await keepAll(copies, [copyOf("shenandoah", 1, true), copyOf("amazing-grace", 2)]);
    await copies.forgetAll();
    expect(await copies.saved()).toEqual([]);
    expect(await openedOffline(copies, "amazing-grace")).toBeUndefined();
  });

  test("keeps nothing she opens while she signs out", async () => {
    const copies = offlineCopies(() => new IDBFactory());
    const forgetting = copies.forgetAll();
    await copies.keep(copyOf("shenandoah", 1, true));
    await forgetting;
    expect(await copies.saved()).toEqual([]);
  });
});

describe("a phone that cannot write", () => {
  test("still opens a kept Song with her choices", async () => {
    const factory = new IDBFactory();
    const shenandoah = copyOf("shenandoah", 1, true);
    await offlineCopies(() => factory).keep(shenandoah);
    const kept = await openedOffline(offlineCopies(() => refusingWrites(factory)), "shenandoah");
    expect(kept?.entry).toEqual(shenandoah.entry);
  });
});

describe("a phone that refuses storage", () => {
  test("keeps and opens nothing, without breaking the screen that asks", async () => {
    const copies = offlineCopies(() => {
      throw new DOMException("storage is off", "SecurityError");
    });
    await expect(copies.keep(copyOf("shenandoah", 1, true))).rejects.toThrow("storage is off");
    await expect(copies.reopen("shenandoah", 2)).rejects.toThrow("storage is off");
  });
});

function refusingWrites(factory: IDBFactory) {
  return {
    open: (name: string, version?: number) => {
      const opening = factory.open(name, version);
      opening.addEventListener("success", () => {
        const database = opening.result;
        const transaction = database.transaction.bind(database);
        database.transaction = (stores, mode) => {
          const started = transaction(stores, mode);
          if (mode === "readwrite") started.abort();
          return started;
        };
      });
      return opening;
    },
  } as IDBFactory;
}
