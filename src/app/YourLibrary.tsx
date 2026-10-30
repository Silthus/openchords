import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLibrary } from "../library";
import { SongRow } from "./SongRow";

export function YourLibrary() {
  const saved = useLibrary();
  const songs = useQuery(api.catalog.index.summaries, saved?.length ? { songIds: saved.map((entry) => entry.songId) } : "skip");
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
