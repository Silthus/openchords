import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { parse, transpose, type SheetMeta } from "../../sheet";
import { PageNotFound } from "../PageNotFound";
import { BackToSearch } from "./BackToSearch";
import { ChordSheetView } from "./ChordSheetView";
import { SettingsSheet } from "./SettingsSheet";

const startingSpeed = 3;

export function SongScreen({ songId, chordSheetId }: { songId: string; chordSheetId?: string }) {
  const found = useQuery(api.catalog.index.song, { songId });
  const [speed, setSpeed] = useState(startingSpeed);
  const [transposition, setTransposition] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  if (found === undefined) return null;
  if (found === null) return <PageNotFound />;

  const chosen = found.sheets.find((sheet) => sheet.chordSheetId === chordSheetId) ?? found.sheets[0];
  const sheet = chosen && transpose(parse(chosen.chordPro), transposition);
  return (
    <main className="mx-auto max-w-2xl px-5 pt-2 pb-24">
      <OpenSong songId={found.song.songId} />
      <BackToSearch />
      <h1 className="text-2xl font-bold">{found.song.title}</h1>
      {chosen && sheet ? (
        <>
          <p className="text-base text-muted">{headerLine(found.song.artist, chosen.name, sheet.meta)}</p>
          <ChordSheetView sheet={sheet} speed={speed} onOpenSettings={() => setSettingsOpen(true)} />
          {settingsOpen && (
            <SettingsSheet
              songId={found.song.songId}
              sheets={found.sheets}
              chosenId={chosen.chordSheetId}
              shownKey={sheet.meta.key}
              transposition={transposition}
              onTranspose={setTransposition}
              speed={speed}
              onSpeed={setSpeed}
              onClose={() => setSettingsOpen(false)}
            />
          )}
        </>
      ) : (
        <p className="text-base text-muted">Getting this Song ready…</p>
      )}
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
  const capo = meta.capo === 0 ? "No capo" : `Capo on fret ${meta.capo}`;
  return [artist, chordSheetName, ...key, capo].join(" · ");
}
