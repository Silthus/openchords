import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/")({
  component: StartScreen,
});

function StartScreen() {
  const songs = useQuery(api.catalog.index.builtIns);
  return (
    <main className="mx-auto max-w-xl px-5 pt-16">
      <h1 className="text-4xl font-bold tracking-tight">OpenChords</h1>
      <p className="mt-2 text-lg text-stone-600">Chords over the words, without the ads.</p>
      <ul className="mt-8 divide-y divide-stone-200">
        {songs?.map((song) => (
          <li key={song.songId}>
            <Link to="/songs/$songId" params={{ songId: song.songId }} className="block py-3">
              <span className="block text-lg font-semibold">{song.title}</span>
              <span className="block text-stone-500">{song.artist}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
