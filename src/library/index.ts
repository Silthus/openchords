import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type LibraryEntry = FunctionReturnType<typeof api.library.index.entries>[number];
export type Choices = Omit<LibraryEntry, "songId" | "updatedAt">;
type EntryForSong = { entry: LibraryEntry | undefined; save: (choices: Choices) => void };

export function useLibraryEntry(songId: Id<"songs">): EntryForSong | undefined {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const stored = useStoredEntry(songId, isAuthenticated);
  const inMemory = useEntryInMemory(songId);
  if (isLoading) return undefined;
  return isAuthenticated ? stored : inMemory;
}

function useStoredEntry(songId: Id<"songs">, signedIn: boolean): EntryForSong | undefined {
  const entries = useQuery(api.library.index.entries, signedIn ? {} : "skip");
  const save = useMutation(api.library.index.save).withOptimisticUpdate((store, saved) => {
    const current = store.getQuery(api.library.index.entries, {});
    if (current === undefined) return;
    const others = current.filter((entry) => entry.songId !== saved.songId);
    store.setQuery(api.library.index.entries, {}, [...others, { ...saved, updatedAt: Date.now() }]);
  });
  if (entries === undefined) return undefined;
  return { entry: entries.find((entry) => entry.songId === songId), save: (choices) => void save({ songId, ...choices }) };
}

function useEntryInMemory(songId: Id<"songs">): EntryForSong {
  const [entry, setEntry] = useState<LibraryEntry>();
  return {
    entry: entry?.songId === songId ? entry : undefined,
    save: (choices) => setEntry({ songId, ...choices, updatedAt: Date.now() }),
  };
}

export function useLibrary(): LibraryEntry[] | undefined {
  const { isAuthenticated } = useConvexAuth();
  const entries = useQuery(api.library.index.entries, isAuthenticated ? {} : "skip");
  return entries?.filter((entry) => entry.saved);
}
