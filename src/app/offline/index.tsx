import { useConvex, useConvexAuth, useConvexConnectionState } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { LibraryEntry } from "../../library";
import { isOffline } from "./connection";
import { offlineCopies, type FoundSong } from "./offlineCopies";

export type { FoundSong, OfflineCopy } from "./offlineCopies";

let copies: ReturnType<typeof offlineCopies> | undefined;
const onThePhone = () => (copies ??= offlineCopies(() => indexedDB));

export function useOffline() {
  return isOffline(useConvexConnectionState());
}

export function useKeepOffline(found: FoundSong, library: { entry: LibraryEntry | undefined } | undefined) {
  const loaded = library !== undefined;
  const entry = library?.entry;
  useEffect(() => {
    if (!loaded) return;
    onThePhone()
      .keep({ found, entry, openedAt: Date.now() })
      .catch(() => undefined);
  }, [found, entry, loaded]);
}

export function useDropOffline(songId: string) {
  useEffect(() => {
    onThePhone()
      .drop(songId)
      .catch(() => undefined);
  }, [songId]);
}

export function useDropRemovedSongs() {
  const convex = useConvex();
  const { isLoading } = useConvexAuth();
  const { isWebSocketConnected, connectionCount } = useConvexConnectionState();
  const ready = isWebSocketConnected && !isLoading;
  useEffect(() => {
    if (!ready) return;
    onThePhone()
      .dropRemoved((songId) => convex.query(api.catalog.index.song, { songId }))
      .catch(() => undefined);
  }, [convex, ready, connectionCount]);
}

export function forgetEverySongWhile(signOut: () => Promise<void>) {
  return onThePhone().forgetAllWhile(signOut);
}

export function useOfflineCopy(songId: string) {
  return useReadFromThePhone(songId, () => onThePhone().reopen(songId, Date.now()));
}

export function useSavedOffline() {
  return useReadFromThePhone("saved", () => onThePhone().saved());
}

type Reading<T> = { done: false } | { done: true; value: T | undefined };

function useReadFromThePhone<T>(key: string, read: () => Promise<T>): Reading<T> {
  const [answer, setAnswer] = useState<{ key: string; value: T | undefined }>();
  useEffect(() => {
    let wanted = true;
    read()
      .catch(() => undefined)
      .then((value) => wanted && setAnswer({ key, value }));
    return () => {
      wanted = false;
    };
  }, [key]);
  return answer !== undefined && answer.key === key ? { done: true, value: answer.value } : { done: false };
}

export function OfflineBadge() {
  if (!useOffline()) return null;
  return (
    <p role="status" className="inline-block rounded-full bg-panel px-3 py-1 text-sm font-semibold text-muted">
      Offline
    </p>
  );
}
