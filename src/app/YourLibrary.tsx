import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLibrary } from "../library";
import { useOffline, useSavedOffline } from "./offline";
import { SongRow } from "./SongRow";

type SongSummary = { songId: string; title: string; artist: string };

export function YourLibrary() {
  return useOffline() ? <LibraryOnThePhone /> : <LibraryOnline />;
}

function LibraryOnline() {
  const saved = useLibrary();
  const songs = useQuery(api.catalog.index.summaries, saved?.length ? { songIds: saved.map((entry) => entry.songId) } : "skip");
  return <LibraryList songs={songs} />;
}

function LibraryOnThePhone() {
  const kept = useSavedOffline();
  return <LibraryList songs={kept.done ? kept.value?.map((copy) => copy.found.song) : undefined} />;
}

function LibraryList({ songs }: { songs: SongSummary[] | undefined }) {
  if (!songs?.length) return null;
  return (
    <section aria-label="Your Library" className="mt-8">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Your Library</h2>
      <ul className="mt-4 divide-y divide-line">
        {songs.toSorted(byTitle).map((song) => (
          <SongRow key={song.songId} song={song} />
        ))}
      </ul>
    </section>
  );
}

function byTitle(a: { title: string }, b: { title: string }) {
  return a.title.localeCompare(b.title);
}
