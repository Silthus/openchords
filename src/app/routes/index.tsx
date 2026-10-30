import { createFileRoute } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { discoveryOf, type Discovery } from "../discovery";
import { Logo } from "../Logo";
import { SearchStatus } from "../SearchStatus";
import { YourLibrary } from "../YourLibrary";
import { SongRow } from "../SongRow";

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
  const discovery = useDiscovery(query.trim());

  const changeQuery = (next: string) => {
    setQuery(next);
    void navigate({ search: next === "" ? {} : { q: next }, replace: true });
  };

  return (
    <main className="mx-auto max-w-xl px-5 pt-16 pb-24">
      <Logo />
      <p className="mt-2 text-lg text-muted">Chords over the words, without the ads.</p>
      <input
        type="search"
        value={query}
        onChange={(event) => changeQuery(event.target.value)}
        maxLength={100}
        placeholder="Search a song or artist"
        aria-label="Search songs"
        className="mt-8 w-full rounded-xl border border-line bg-page px-4 py-3 text-lg outline-none focus:border-accent"
      />
      {!searching && <YourLibrary />}
      {!searching && <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted uppercase">Built-in Songs</h2>}
      {songs?.length !== 0 && (
        <ul className="mt-4 divide-y divide-line">
          {songs?.map((song) => (
            <SongRow key={song.songId} song={song} />
          ))}
        </ul>
      )}
      <SearchStatus query={query.trim()} discovery={discovery} listIsEmpty={songs?.length === 0} />
    </main>
  );
}

function useSongsFor(query: string) {
  const searching = query.length >= 2;
  const builtIns = useQuery(api.catalog.index.builtIns, searching ? "skip" : {});
  const found = useQuery(api.catalog.index.search, searching ? { query } : "skip");
  return { searching, songs: useLastAnswer(searching ? found : builtIns) };
}

function useDiscovery(query: string): Discovery {
  const discover = useAction(api.catalog.index.discover);
  const [shown, setShown] = useState<{ query: string; discovery: Discovery }>();
  const searching = query.length >= 2;

  useEffect(() => {
    if (!searching) return;
    return discoveryOf({
      discover: () => discover({ query }),
      show: (discovery) => setShown({ query, discovery }),
      later: (run, delayMs) => {
        const timer = setTimeout(run, delayMs);
        return () => clearTimeout(timer);
      },
    });
  }, [discover, query, searching]);

  if (!searching) return "found";
  return shown?.query === query ? shown.discovery : "looking";
}

function useLastAnswer<T>(answer: T | undefined) {
  const [last, setLast] = useState(answer);
  if (answer !== undefined && answer !== last) setLast(answer);
  return answer ?? last;
}
