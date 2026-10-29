import { useState } from "react";
import { chordsIn, type Chord, type ParsedSheet } from "../../sheet";
import { ChordsInThisSong, LargeChordDiagram } from "../chords";
import { ChordLyrics } from "./ChordLyrics";
import { PlayBar } from "./PlayBar";
import { useAutoScroll } from "./useAutoScroll";
import { useWakeLock } from "./useWakeLock";

type ChordSheetViewProps = { sheet: ParsedSheet; speed: number; onOpenSettings: () => void };

export function ChordSheetView({ sheet, speed, onOpenSettings }: ChordSheetViewProps) {
  const chords = chordsIn(sheet);
  const [large, setLarge] = useState<Chord>();
  const [playing, setPlaying] = useState(false);
  const togglePlaying = () => setPlaying((was) => !was);
  const showLarge = (written: string) => setLarge(chords.find((chord) => chord.written === written));
  useAutoScroll(playing, speed, () => setPlaying(false));
  useWakeLock(playing);
  return (
    <>
      <ChordsInThisSong chords={chords} onPick={setLarge} />
      <div onClick={togglePlaying}>
        <ChordLyrics sheet={sheet} onChord={showLarge} />
        <p className="pb-12 text-center text-base text-muted">End of song</p>
      </div>
      {playing && (
        <p className="pointer-events-none fixed inset-x-0 top-2 z-10 mx-auto w-fit rounded-full bg-stone-900/80 px-3 py-1 text-xs text-white">
          Tap the lyrics to pause
        </p>
      )}
      <PlayBar playing={playing} speed={speed} onToggle={togglePlaying} onOpenSettings={onOpenSettings} />
      {large && <LargeChordDiagram chord={large} onClose={() => setLarge(undefined)} />}
    </>
  );
}
