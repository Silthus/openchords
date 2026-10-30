import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import type { LibraryEntry } from "../../library";

export type FoundSong = NonNullable<FunctionReturnType<typeof api.catalog.index.song>>;
export type OfflineCopy = { found: FoundSong; entry: LibraryEntry | undefined; openedAt: number };

const recentlyOpenedKept = 20;
const store = "songs";

export function offlineCopies(storage: () => IDBFactory) {
  const database = openDatabase(storage);
  let signingOut = false;

  const inStore = async <T>(mode: IDBTransactionMode, work: (songs: IDBObjectStore) => IDBRequest<T> | void) => {
    const transaction = (await database).transaction(store, mode);
    const request = work(transaction.objectStore(store));
    await done(transaction);
    return request?.result;
  };

  const keep = (copy: OfflineCopy) =>
    inStore("readwrite", (songs) => {
      if (signingOut) return;
      songs.put(copy, copy.found.song.songId);
      const all = songs.getAll();
      all.onsuccess = () => {
        for (const old of letGo([...(all.result as OfflineCopy[])])) songs.delete(old.found.song.songId);
      };
    });

  const markOpened = (songId: string, openedAt: number) =>
    inStore("readwrite", (songs) => {
      if (signingOut) return;
      const current = songs.get(songId);
      current.onsuccess = () => {
        if (current.result) songs.put({ ...current.result, openedAt }, songId);
      };
    });

  const reopen = async (songId: string, openedAt: number) => {
    const kept = await inStore<OfflineCopy | undefined>("readonly", (songs) => songs.get(songId));
    if (!kept) return undefined;
    await markOpened(songId, openedAt).catch(() => undefined);
    return { ...kept, openedAt };
  };

  const forgetAll = () => inStore("readwrite", (songs) => songs.clear()).catch(() => undefined);

  return {
    keep,
    reopen,
    forgetAllWhile: async (signOut: () => Promise<void>) => {
      signingOut = true;
      try {
        await forgetAll();
        await signOut();
      } finally {
        await forgetAll();
        signingOut = false;
      }
    },
    saved: async () => ((await inStore("readonly", (songs) => songs.getAll())) as OfflineCopy[]).filter(isSaved),
  };
}

function letGo(copies: OfflineCopy[]) {
  const recent = copies.toSorted((a, b) => b.openedAt - a.openedAt).slice(0, recentlyOpenedKept);
  return copies.filter((copy) => !isSaved(copy) && !recent.includes(copy));
}

function isSaved(copy: OfflineCopy) {
  return copy.entry?.saved === true;
}

function openDatabase(storage: () => IDBFactory) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const opening = storage().open("openchords-offline", 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore(store);
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
}

function done(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
