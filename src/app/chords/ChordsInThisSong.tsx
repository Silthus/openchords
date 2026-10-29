import type { Chord } from "../../sheet";
import { LazyChordDiagram } from "./LazyChordDiagram";

export function ChordsInThisSong({ chords, onPick }: { chords: Chord[]; onPick: (chord: Chord) => void }) {
  return (
    <section aria-labelledby="chords-in-this-song" className="mt-5 rounded-2xl bg-panel p-3">
      <h2 id="chords-in-this-song" className="mb-1 text-xs font-bold tracking-wide text-muted uppercase">
        Chords in this song
      </h2>
      <ul className="grid grid-cols-5 gap-1">
        {chords.map((chord) => (
          <li key={chord.written}>
            <button type="button" onClick={() => onPick(chord)} className="w-full">
              <LazyChordDiagram chord={chord} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-sm text-muted">Dots: where your fingers go. Numbers: which finger. O: play the string open. X: skip it.</p>
    </section>
  );
}
