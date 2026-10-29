import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Logo } from "../Logo";
import { SongLink } from "../song/SongLink";

type StartSearch = { q?: string };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): StartSearch =>
    typeof search.q === "string" && search.q !== "" ? { q: search.q } : {},
  component: StartScreen,
});

function StartScreen() {
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(Route.useSearch().q ?? "");
  const { searching, songs } = useSongsFor(query.trim());

  const changeQuery = (next: string) => {
    setQuery(next);
    void navigate({ search: next === "" ? {} : { q: next }, replace: true });
  };

  return (
    <main className="mx-auto max-w-xl px-5 pt-16 pb-24">
      <Logo />
      <p className="mt-2 text-lg text-stone-600">Chords over the words, without the ads.</p>
      <input
        type="search"
        value={query}
        onChange={(event) => changeQuery(event.target.value)}
        maxLength={100}
        placeholder="Search a song or artist"
        aria-label="Search songs"
        className="mt-8 w-full rounded-xl border border-stone-300 px-4 py-3 text-lg outline-none focus:border-orange-600"
      />
      {!searching && <h2 className="mt-8 text-sm font-semibold tracking-wide text-stone-500 uppercase">Built-in Songs</h2>}
      {songs?.length === 0 ? (
        <p className="mt-6 text-lg text-stone-600">No Songs found for “{query.trim()}”.</p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-200">
          {songs?.map((song) => (
            <li key={song.songId}>
              <SongLink songId={song.songId} className="block py-3">
                <span className="block text-lg font-semibold">{song.title}</span>
                <span className="block text-stone-500">{song.artist}</span>
              </SongLink>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function useSongsFor(query: string) {
  const searching = query.length >= 2;
  const builtIns = useQuery(api.catalog.index.builtIns, searching ? "skip" : {});
  const found = useLastAnswer(useQuery(api.catalog.index.search, searching ? { query } : "skip"));
  return { searching, songs: searching ? found : builtIns };
}

function useLastAnswer<T>(answer: T | undefined) {
  const [last, setLast] = useState(answer);
  if (answer !== undefined && answer !== last) setLast(answer);
  return answer ?? last;
}
