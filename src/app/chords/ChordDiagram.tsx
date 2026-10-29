import type { Chord } from "../../sheet";
import { barresOf, fingeringFor, type Barre, type Fingering } from "./fingerings";

const strings = [0, 1, 2, 3, 4, 5];
const fretRows = [0, 1, 2, 3, 4];
const left = 14;
const top = 26;
const stringGap = 10;
const fretHeight = 14;
const right = left + stringGap * 5;
const bottom = top + fretHeight * 4;
const center = left + stringGap * 2.5;

const xOf = (string: number) => left + string * stringGap;
const yOf = (fret: number) => top + (fret - 0.5) * fretHeight;

export function ChordDiagram({ chord }: { chord: Chord }) {
  const fingering = fingeringFor(chord);
  if (!fingering) return <NoDiagram written={chord.written} />;
  return (
    <svg viewBox={`0 0 ${right + 8} ${bottom + 6}`} role="img" aria-label={`${chord.written} chord diagram`} className="w-full">
      <text x={center} y={10} textAnchor="middle" fontSize={11} fontWeight="bold" fill="currentColor">
        {chord.written}
      </text>
      <Fingers fingering={fingering} />
    </svg>
  );
}

function NoDiagram({ written }: { written: string }) {
  return (
    <p className="flex aspect-[72/88] flex-col items-center justify-center gap-1 text-center text-xs leading-tight">
      <span className="text-sm font-bold">{written}</span>
      <span className="opacity-70">No diagram for {written}</span>
    </p>
  );
}

function Fingers({ fingering }: { fingering: Fingering }) {
  const barres = barresOf(fingering);
  const barred = (string: number) => barres.some((barre) => barre.strings.includes(string));
  return (
    <g stroke="currentColor" fill="currentColor">
      <Neck baseFret={fingering.baseFret} />
      {fingering.frets.map((fret, string) => (
        <StringMark key={string} string={string} fret={fret} finger={fingering.fingers[string]} barred={barred(string)} />
      ))}
      {barres.map((barre) => (
        <BarreMark key={`${barre.fret}-${barre.finger}`} barre={barre} />
      ))}
    </g>
  );
}

function Neck({ baseFret }: { baseFret: number }) {
  return (
    <>
      {strings.map((string) => (
        <line key={string} x1={xOf(string)} y1={top} x2={xOf(string)} y2={bottom} strokeWidth={1} />
      ))}
      {fretRows.map((row) => (
        <line key={row} x1={left} y1={top + row * fretHeight} x2={right} y2={top + row * fretHeight} strokeWidth={row === 0 && baseFret === 1 ? 3 : 1} />
      ))}
      {baseFret > 1 && (
        <text x={left - 4} y={yOf(1) + 3} textAnchor="end" fontSize={8} stroke="none">
          {baseFret}fr
        </text>
      )}
    </>
  );
}

function StringMark({ string, fret, finger, barred }: { string: number; fret: number; finger?: number; barred: boolean }) {
  if (fret === -1) return <Muted string={string} />;
  if (fret === 0) return <circle cx={xOf(string)} cy={top - 6} r={2.8} fill="none" strokeWidth={1} />;
  if (barred) return null;
  return <Dot x={xOf(string)} y={yOf(fret)} finger={finger} />;
}

function Muted({ string }: { string: number }) {
  return (
    <text x={xOf(string)} y={top - 3} textAnchor="middle" fontSize={9} stroke="none">
      ×
    </text>
  );
}

function BarreMark({ barre: { fret, finger, strings: barred } }: { barre: Barre }) {
  const first = barred[0]!;
  const last = barred[barred.length - 1]!;
  return (
    <>
      <rect x={xOf(first) - 4.5} y={yOf(fret) - 4.5} width={xOf(last) - xOf(first) + 9} height={9} rx={4.5} stroke="none" />
      <FingerNumber x={(xOf(first) + xOf(last)) / 2} y={yOf(fret)} finger={finger} />
    </>
  );
}

function Dot({ x, y, finger }: { x: number; y: number; finger?: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={4.5} stroke="none" />
      <FingerNumber x={x} y={y} finger={finger} />
    </>
  );
}

function FingerNumber({ x, y, finger }: { x: number; y: number; finger?: number }) {
  if (!finger) return null;
  return (
    <text x={x} y={y + 2.5} textAnchor="middle" fontSize={7} fontWeight="bold" stroke="none" className="fill-white">
      {finger}
    </text>
  );
}
