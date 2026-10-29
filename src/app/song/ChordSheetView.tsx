import { useState } from "react";
import { chordsIn, type Chord, type ParsedSheet } from "../../sheet";
import { ChordsInThisSong, LargeChordDiagram } from "../chords";
import { ChordLyrics } from "./ChordLyrics";
import { PlayBar } from "./PlayBar";
import { useAutoScroll } from "./useAutoScroll";
import { useWakeLock } from "./useWakeLock";

const startingSpeed = 3;

export function ChordSheetView({ sheet }: { sheet: ParsedSheet }) {
  const chords = chordsIn(sheet);
  const [large, setLarge] = useState<Chord>();
  const [playing, setPlaying] = useState(false);
  const togglePlaying = () => setPlaying((was) => !was);
  const showLarge = (written: string) => setLarge(chords.find((chord) => chord.written === written));
  useAutoScroll(playing, startingSpeed, () => setPlaying(false));
  useWakeLock(playing);
  return (
    <>
      <ChordsInThisSong chords={chords} onPick={setLarge} />
      <div onClick={togglePlaying}>
        <ChordLyrics sheet={sheet} onChord={showLarge} />
        <p className="pb-12 text-center text-base text-stone-500">End of song</p>
      </div>
      {playing && <p className="pointer-events-none fixed inset-x-0 top-2 z-10 text-center text-xs text-stone-500">Tap the lyrics to pause</p>}
      <PlayBar playing={playing} speed={startingSpeed} onToggle={togglePlaying} />
      {large && <LargeChordDiagram chord={large} onClose={() => setLarge(undefined)} />}
    </>
  );
}
