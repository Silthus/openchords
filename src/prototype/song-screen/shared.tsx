// PROTOTYPE (throwaway): state and small building blocks the song screen variants share.
import { useEffect, useRef, useState, type RefObject } from "react";
import { capoSuggestion, parseLine, shapeFor, song, soundingKey, type ChordSheet, type PlayState } from "./song";

export type SongScreenState = PlayState & {
  speed: number;
  playing: boolean;
  textSize: number;
  suggestedCapo?: number;
  key: string;
  shape: (chord: string) => string;
  pickSheet: (id: string) => void;
  setTranspose: (value: number) => void;
  setCapo: (value: number) => void;
  setSpeed: (value: number) => void;
  setPlaying: (value: boolean) => void;
  setTextSize: (value: number) => void;
};

export function useSongScreenState(): SongScreenState {
  const [sheet, setSheet] = useState<ChordSheet>(song.sheets[0]);
  const [transpose, setTranspose] = useState(0);
  const [capo, setCapo] = useState(sheet.capo);
  const [speed, setSpeed] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [textSize, setTextSize] = useState(1);
  const play: PlayState = { sheet, transpose, capo };

  const pickSheet = (id: string) => {
    const next = song.sheets.find((s) => s.id === id)!;
    setSheet(next);
    setTranspose(0);
    setCapo(next.capo);
  };

  return {
    ...play,
    speed,
    playing,
    textSize,
    suggestedCapo: capoSuggestion(play),
    key: soundingKey(play),
    shape: (chord) => shapeFor(chord, play),
    pickSheet,
    setTranspose: (v) => setTranspose(Math.max(-11, Math.min(11, v))),
    setCapo: (v) => setCapo(Math.max(0, Math.min(9, v))),
    setSpeed: (v) => setSpeed(Math.max(1, Math.min(10, v))),
    setPlaying,
    setTextSize: (v) => setTextSize(Math.max(0.8, Math.min(1.8, Math.round(v * 10) / 10))),
  };
}

const PIXELS_PER_SECOND_PER_LEVEL = 7;

export function useAutoScroll(ref: RefObject<HTMLElement | null>, playing: boolean, speed: number, onEnd: () => void) {
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    const el = ref.current;
    if (!playing || !el) return;
    let frame = 0;
    let last = performance.now();
    let carry = el.scrollTop;
    const tick = (now: number) => {
      carry += ((now - last) / 1000) * speed * PIXELS_PER_SECOND_PER_LEVEL;
      last = now;
      el.scrollTop = carry;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) return onEndRef.current();
      frame = requestAnimationFrame(tick);
    };
    const resync = () => (carry = el.scrollTop);
    el.addEventListener("touchend", resync);
    el.addEventListener("wheel", resync);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("touchend", resync);
      el.removeEventListener("wheel", resync);
    };
  }, [ref, playing, speed]);
}

type Token = { chord?: string; text: string };

function wordsOf(text: string) {
  const words = text.match(/\S*\s*/g)?.filter(Boolean) ?? [];
  return words.length > 0 ? words : [""];
}

function wordGroups(line: string): Token[][] {
  const tokens = parseLine(line).flatMap((segment) =>
    wordsOf(segment.text).map((text, i) => ({ chord: i === 0 ? segment.chord : undefined, text })),
  );
  const groups: Token[][] = [[]];
  for (const token of tokens) {
    groups[groups.length - 1].push(token);
    if (/\s$/.test(token.text)) groups.push([]);
  }
  return groups.filter((g) => g.length > 0);
}

type ChordLineProps = {
  line: string;
  shape: (chord: string) => string;
  onChord: (chord: string) => void;
  chordClass: string;
  lyricClass?: string;
};

export function ChordLine({ line, shape, onChord, chordClass, lyricClass = "" }: ChordLineProps) {
  return (
    <div className="flex flex-wrap items-end">
      {wordGroups(line).map((group, g) => (
        <span key={g} className="inline-flex">
          {group.map((token, i) => (
            <span key={i} className="inline-flex flex-col">
              <button
                type="button"
                disabled={!token.chord}
                onClick={(e) => {
                  e.stopPropagation();
                  if (token.chord) onChord(shape(token.chord));
                }}
                className={`text-left leading-tight min-h-[1.3em] ${token.chord ? "pr-2" : ""} ${chordClass}`}
              >
                {token.chord ? shape(token.chord) : "\u00a0"}
              </button>
              <span className={`whitespace-pre leading-snug ${lyricClass}`}>{token.text || "\u00a0"}</span>
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

export const PLAY_ICON = "\u25B6\uFE0E";

export const capoLabel = (capo: number) => (capo === 0 ? "No capo" : `Capo on fret ${capo}`);
