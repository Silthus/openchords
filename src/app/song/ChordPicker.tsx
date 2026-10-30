import { useState } from "react";
import { readChord, type Notation } from "../../sheet";
import { useModalDialog } from "../useModalDialog";

const rootNames: Record<Notation, string[]> = {
  international: ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
  german: ["C", "Cis", "D", "Es", "E", "F", "Fis", "G", "As", "A", "B", "H"],
};

const qualities: Array<[suffix: string, label: string]> = [
  ["", "major"],
  ["m", "m"],
  ["7", "7"],
  ["m7", "m7"],
  ["maj7", "maj7"],
  ["sus2", "sus2"],
  ["sus4", "sus4"],
  ["dim", "dim"],
];

type Picked = { root: number; suffix: string; bass: number | undefined };

type ChordPickerProps = {
  word: string;
  current: string | undefined;
  notation: Notation;
  onPick: (chord: string) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function ChordPicker({ word, current, notation, onPick, onRemove, onClose }: ChordPickerProps) {
  const dialog = useModalDialog();
  const [picked, setPicked] = useState(() => pickedFrom(current, notation));
  const names = rootNames[notation];
  const chord = picked && nameOf(picked, names);
  const pick = (changed: Partial<Picked>) => setPicked({ root: 0, suffix: "", bass: undefined, ...picked, ...changed });
  const close = () => dialog.current?.close();
  return (
    <dialog
      ref={dialog}
      aria-label="Chord picker"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && close()}
      className="mx-auto mt-auto mb-0 w-full max-w-2xl bg-transparent text-ink backdrop:bg-black/50"
    >
      <div className="rounded-t-3xl bg-page p-5">
        <h2 className="mb-3 text-lg font-bold">Chord over “{word}”</h2>
        <Choices label="Root" options={names.map((name, root) => [root, name])} chosen={picked?.root} onChoose={(root) => pick({ root })} />
        <Choices label="Quality" options={qualities} chosen={picked?.suffix} onChoose={(suffix) => pick({ suffix })} />
        <Choices label="Bass" options={[[undefined, "none"], ...names.map((name, bass): [number, string] => [bass, `/${name}`])]} chosen={picked?.bass} onChoose={(bass) => pick({ bass })} />
        <button
          type="button"
          disabled={!chord}
          onClick={() => {
            onPick(chord!);
            close();
          }}
          className="mt-4 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-40"
        >
          {chord ? `Set ${chord}` : "Pick a root"}
        </button>
        {current !== undefined && (
          <button
            type="button"
            onClick={() => {
              onRemove();
              close();
            }}
            className="mt-2 w-full rounded-xl bg-panel py-3 font-semibold"
          >
            Remove chord
          </button>
        )}
        <button type="button" onClick={close} className="mt-2 w-full py-3 font-semibold text-muted">
          Back
        </button>
      </div>
    </dialog>
  );
}

function pickedFrom(current: string | undefined, notation: Notation): Picked | undefined {
  const chord = current === undefined ? null : readChord(current, notation);
  if (!chord) return undefined;
  return { root: chord.root, suffix: chord.suffix, bass: chord.bass };
}

function nameOf({ root, suffix, bass }: Picked, names: string[]) {
  return `${names[root]}${suffix}${bass === undefined ? "" : `/${names[bass]}`}`;
}

type ChoicesProps<Value> = { label: string; options: Array<[Value, string]>; chosen: Value | undefined; onChoose: (value: Value) => void };

function Choices<Value>({ label, options, chosen, onChoose }: ChoicesProps<Value>) {
  return (
    <fieldset className="mb-3">
      <legend className="mb-1 text-sm font-bold tracking-wide text-muted uppercase">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, name]) => (
          <button
            key={name}
            type="button"
            aria-pressed={chosen === value}
            onClick={() => onChoose(value)}
            className={`min-w-11 rounded-full px-3 py-2 font-semibold ${chosen === value ? "bg-orange-500 text-white" : "bg-panel"}`}
          >
            {name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
