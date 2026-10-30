import { useMutation, useQuery } from "convex/react";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { easierCapo, parse, shapes, type SheetMeta, type View } from "../../sheet";
import { PageNotFound } from "../PageNotFound";
import { BackToSearch } from "./BackToSearch";
import { ChordLyrics } from "./ChordLyrics";
import { ChordSheetView } from "./ChordSheetView";
import { describeCapo } from "./describeChordSheet";
import { SettingsSheet } from "./SettingsSheet";

const startingSpeed = 3;

export function SongScreen({ songId, chordSheetId }: { songId: string; chordSheetId?: string }) {
  const found = useQuery(api.catalog.index.song, { songId });
  const [speed, setSpeed] = useState(startingSpeed);
  const [transposition, setTransposition] = useState(0);
  const [capoBySheet, setCapoBySheet] = useState<Record<string, number>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  if (found === undefined) return null;
  if (found === null) return <PageNotFound />;

  const chosen = found.sheets.find((sheet) => sheet.chordSheetId === chordSheetId) ?? found.sheets[0];
  if (!chosen) {
    return (
      <SongPage songId={found.song.songId} title={found.song.title}>
        {found.wordsOnly ? (
          <WordsOnly artist={found.song.artist} chordPro={found.wordsOnly} />
        ) : (
          <p className="text-base text-muted">{found.lyrics === "missing" ? "No lyrics found for this song" : "Fetching the words…"}</p>
        )}
      </SongPage>
    );
  }

  const written = parse(chosen.chordPro);
  const view = { transpose: transposition, capo: capoBySheet[chosen.chordSheetId] ?? written.meta.capo };
  const sheet = shapes(written, view);
  const changeView = (changed: View) => {
    setTransposition(changed.transpose);
    setCapoBySheet({ ...capoBySheet, [chosen.chordSheetId]: changed.capo });
  };
  return (
    <SongPage songId={found.song.songId} title={found.song.title}>
      <p className="text-base text-muted">{headerLine(found.song.artist, chosen.name, sheet.meta)}</p>
      <ChordSheetView sheet={sheet} speed={speed} onOpenSettings={() => setSettingsOpen(true)} />
      {settingsOpen && (
        <SettingsSheet
          songId={found.song.songId}
          sheets={found.sheets}
          chosenId={chosen.chordSheetId}
          shownKey={sheet.meta.key}
          view={view}
          easierCapo={easierCapo(written, view)}
          onView={changeView}
          speed={speed}
          onSpeed={setSpeed}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </SongPage>
  );
}

function WordsOnly({ artist, chordPro }: { artist: string; chordPro: string }) {
  return (
    <>
      <p className="text-base text-muted">{artist} · No chords yet</p>
      <ChordLyrics sheet={parse(chordPro)} onChord={() => {}} />
    </>
  );
}

function SongPage({ songId, title, children }: { songId: Id<"songs">; title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 pt-2 pb-24">
      <OpenSong songId={songId} />
      <BackToSearch />
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </main>
  );
}

function OpenSong({ songId }: { songId: Id<"songs"> }) {
  const open = useMutation(api.catalog.index.open);
  useEffect(() => {
    void open({ songId });
  }, [open, songId]);
  return null;
}

function headerLine(artist: string, chordSheetName: string, meta: SheetMeta) {
  const key = meta.key === undefined ? [] : [`Key ${meta.key}`];
  return [artist, chordSheetName, ...key, describeCapo(meta.capo)].join(" · ");
}
