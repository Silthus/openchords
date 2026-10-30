import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useLibraryEntry, type Choices } from "../../library";
import { easierCapo, parse, shapes, type ChordLayer, type SheetMeta, type View } from "../../sheet";
import { PageNotFound } from "../PageNotFound";
import { BackToSearch } from "./BackToSearch";
import { ChordEditor } from "./ChordEditor";
import { ChordSheetView } from "./ChordSheetView";
import { describeCapo } from "./describeChordSheet";
import { openingChoices } from "./openingChoices";
import { SaveToggle } from "./SaveToggle";
import { SettingsSheet } from "./SettingsSheet";
import { UnverifiedMark, WordsOnly } from "./SongStates";

export function SongScreen({ songId, chordSheetId }: { songId: string; chordSheetId?: string }) {
  const found = useQuery(api.catalog.index.song, { songId });
  if (found === undefined) return null;
  if (found === null) return <PageNotFound />;
  if (found.sheets.length === 0) {
    return (
      <SongPage songId={found.song.songId} title={found.song.title}>
        {found.wordsOnly ? (
          <WordsOnly artist={found.song.artist} lines={found.wordsOnly} writingChords={found.writingChords} />
        ) : (
          <p className="text-base text-muted">{lyricsMessages[found.lyrics]}</p>
        )}
      </SongPage>
    );
  }
  return <SongWithChords found={found} linked={chordSheetId} />;
}

type FoundSong = NonNullable<FunctionReturnType<typeof api.catalog.index.song>>;

function SongWithChords({ found, linked }: { found: FoundSong; linked: string | undefined }) {
  const library = useLibraryEntry(found.song.songId);
  const saveVersion = useMutation(api.catalog.index.saveVersion);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fixing, setFixing] = useState(false);
  const opening = library && openingChoices(found.sheets, { linked, entry: library.entry });
  if (!library || !opening) return null;

  const { sheet: chosen, view, speed } = opening;
  const written = parse(chosen.chordPro);
  const sheet = shapes(written, view);
  const stored = { chordSheetId: chosen.chordSheetId, transpose: view.transpose, capos: library.entry?.capos ?? {}, speed, saved: library.entry?.saved ?? false };
  const choose = (changed: Partial<Choices>) => library.save({ ...stored, ...changed });
  const changeView = ({ transpose, capo }: View) => choose({ transpose, capos: { ...stored.capos, [chosen.chordSheetId]: capo } });
  const saveFixed = async (layer: ChordLayer) => {
    const chordSheetId = await saveVersion({ from: chosen.chordSheetId, layer });
    choose({ chordSheetId, transpose: 0 });
    setFixing(false);
  };
  return (
    <SongPage songId={found.song.songId} title={found.song.title} save={<SaveToggle saved={stored.saved} onToggle={() => choose({ saved: !stored.saved })} />}>
      <p className="text-base text-muted">{headerLine(found.song.artist, chosen.name, sheet.meta)}</p>
      <UnverifiedMark origin={chosen.origin} />
      {fixing ? (
        <ChordEditor sheet={shapes(written, { transpose: view.transpose, capo: written.meta.capo })} onSave={saveFixed} onCancel={() => setFixing(false)} />
      ) : (
        <ChordSheetView sheet={sheet} speed={speed} onOpenSettings={() => setSettingsOpen(true)} />
      )}
      {settingsOpen && (
        <SettingsSheet
          songId={found.song.songId}
          sheets={found.sheets}
          chosenId={chosen.chordSheetId}
          onChordSheet={(picked) => choose({ chordSheetId: picked.chordSheetId })}
          shownKey={sheet.meta.key}
          view={view}
          easierCapo={easierCapo(written, view)}
          onView={changeView}
          speed={speed}
          onSpeed={(changed) => choose({ speed: changed })}
          onFixChords={() => {
            setSettingsOpen(false);
            setFixing(true);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </SongPage>
  );
}

const lyricsMessages = {
  pending: "Fetching the words…",
  ready: "Fetching the words…",
  missing: "No lyrics found for this song",
  unreachable: "Couldn't reach the lyrics service. Trying again soon.",
};

type SongPageProps = { songId: Id<"songs">; title: string; save?: ReactNode; children: ReactNode };

function SongPage({ songId, title, save, children }: SongPageProps) {
  return (
    <main className="mx-auto max-w-2xl px-5 pt-2 pb-24">
      <OpenSong songId={songId} />
      <BackToSearch />
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {save}
      </div>
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
