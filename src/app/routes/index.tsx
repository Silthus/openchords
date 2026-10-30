import { createFileRoute } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
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
  const { looking, moreComing } = useDiscovery(query.trim());

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
      {!searching && <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted uppercase">Built-in Songs</h2>}
      {songs?.length === 0 ? (
        !looking && <p className="mt-6 text-lg text-muted">No Songs found for “{query.trim()}”.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {songs?.map((song) => (
            <li key={song.songId}>
              <SongLink songId={song.songId} className="block py-3">
                <span className="block text-lg font-semibold">{song.title}</span>
                <span className="block text-muted">
                  {song.artist}
                  {"hasSheets" in song && !song.hasSheets && " · Words only"}
                </span>
              </SongLink>
            </li>
          ))}
        </ul>
      )}
      {looking && <p className="mt-4 text-base text-muted">Looking for more songs…</p>}
      {moreComing && <p className="mt-4 text-base text-muted">More results in a moment</p>}
    </main>
  );
}

function useSongsFor(query: string) {
  const searching = query.length >= 2;
  const builtIns = useQuery(api.catalog.index.builtIns, searching ? "skip" : {});
  const found = useQuery(api.catalog.index.search, searching ? { query } : "skip");
  return { searching, songs: useLastAnswer(searching ? found : builtIns) };
}

const typingPauseMs = 400;

function useDiscovery(query: string) {
  const discover = useAction(api.catalog.index.discover);
  const [answer, setAnswer] = useState<{ query: string; complete: boolean }>();
  const searching = query.length >= 2;

  useEffect(() => {
    if (!searching) return;
    let stale = false;
    let timer: ReturnType<typeof setTimeout>;
    const ask = async (isRepeat: boolean) => {
      const { complete, retryAt } = await discover({ query }).catch(() => ({ complete: true, retryAt: undefined }));
      if (stale) return;
      setAnswer({ query, complete });
      if (!complete && !isRepeat && retryAt) timer = setTimeout(() => void ask(true), retryAt - Date.now());
    };
    timer = setTimeout(() => void ask(false), typingPauseMs);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [discover, query, searching]);

  const answered = answer?.query === query;
  return { looking: searching && !answered, moreComing: searching && answered && !answer.complete };
}

function useLastAnswer<T>(answer: T | undefined) {
  const [last, setLast] = useState(answer);
  if (answer !== undefined && answer !== last) setLast(answer);
  return answer ?? last;
}
