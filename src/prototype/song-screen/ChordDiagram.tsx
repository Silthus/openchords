// PROTOTYPE (throwaway): renders a Chord diagram from chords-db with svguitar.
import { useEffect, useRef } from "react";
import { SVGuitarChord, type Barre, type Finger } from "svguitar";
import guitar from "@tombatossals/chords-db/lib/guitar.json";
import { splitChord } from "./song";

type Position = { frets: number[]; fingers: number[]; barres: number[]; baseFret: number };
type DbChord = { key: string; suffix: string; positions: Position[] };

const DB_KEYS: Record<string, string> = { "C#": "Csharp", "F#": "Fsharp" };
const DB_SUFFIXES: Record<string, string> = { "": "major", m: "minor" };

export function findPositions(chord: string): Position[] {
  const { root, suffix } = splitChord(chord);
  const list = (guitar.chords as Record<string, DbChord[]>)[DB_KEYS[root] ?? root] ?? [];
  return list.find((c) => c.suffix === (DB_SUFFIXES[suffix] ?? suffix))?.positions ?? [];
}

function toSvguitar(position: Position) {
  const stringOf = (index: number) => 6 - index;
  const barreFrets = new Set(position.barres);
  const fingers: Finger[] = [];
  position.frets.forEach((fret, i) => {
    if (fret === -1) fingers.push([stringOf(i), "x"]);
    else if (fret === 0) fingers.push([stringOf(i), 0]);
    else if (!barreFrets.has(fret)) fingers.push([stringOf(i), fret, String(position.fingers[i] || "")]);
  });
  const barres: Barre[] = position.barres.map((fret) => {
    const strings = position.frets.flatMap((f, i) => (f === fret ? [i] : []));
    return { fret, fromString: stringOf(strings[0]), toString: stringOf(strings[strings.length - 1]), text: "1" };
  });
  return { fingers, barres, position: position.baseFret };
}

type Props = { chord: string; variation?: number; size?: number; dark?: boolean; title?: boolean };

export function ChordDiagram({ chord, variation = 0, size = 160, dark = false, title = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const positions = findPositions(chord);
  const position = positions[variation % Math.max(positions.length, 1)];

  useEffect(() => {
    const el = ref.current;
    if (!el || !position) return;
    el.innerHTML = "";
    const color = dark ? "#f9fafb" : "#111827";
    new SVGuitarChord(el)
      .configure({
        title: title ? chord : undefined,
        frets: 4,
        color,
        titleColor: color,
        fingerTextColor: dark ? "#111827" : "#ffffff",
        fingerColor: color,
        fretLabelColor: color,
        backgroundColor: "none",
        fontFamily: "system-ui, sans-serif",
        noPosition: position.baseFret === 1,
      })
      .chord(toSvguitar(position))
      .draw();
  }, [chord, position, dark, title]);

  if (!position) return <div className="text-sm opacity-60" style={{ width: size }}>No diagram for {chord}</div>;
  return <div ref={ref} style={{ width: size }} aria-label={`Chord diagram for ${chord}`} />;
}
