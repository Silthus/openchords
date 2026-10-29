import { useState } from "react";
import { chordsIn, type Chord, type ParsedSheet } from "../../sheet";
import { ChordsInThisSong, LargeChordDiagram } from "../chords";
import { ChordLyrics } from "./ChordLyrics";

export function ChordSheetView({ sheet }: { sheet: ParsedSheet }) {
  const chords = chordsIn(sheet);
  const [large, setLarge] = useState<Chord>();
  const showLarge = (written: string) => setLarge(chords.find((chord) => chord.written === written));
  return (
    <>
      <ChordsInThisSong chords={chords} onPick={setLarge} />
      <ChordLyrics sheet={sheet} onChord={showLarge} />
      {large && <LargeChordDiagram chord={large} onClose={() => setLarge(undefined)} />}
    </>
  );
}
