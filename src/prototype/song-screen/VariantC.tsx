// PROTOTYPE (throwaway). Variant C, "Follow along": the line she plays sits in a reading band, and its Chord diagrams wait in a dock below.
import { useEffect, useRef, useState } from "react";
import { ChordDiagram } from "./ChordDiagram";
import { ChordLine, PLAY_ICON, capoLabel, useAutoScroll, type SongScreenState } from "./shared";
import { isEasy, parseLine, song, songChords, transposeChord } from "./song";

const BAND_RATIO = 0.3;

export function VariantC({ state }: { state: SongScreenState }) {
  const scroller = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [pinned, setPinned] = useState<string>();
  const [keyPickerOpen, setKeyPickerOpen] = useState(false);
  useAutoScroll(scroller, state.playing, state.speed, () => state.setPlaying(false));

  const lines = state.sheet.sections.flatMap((section) => section.lines.map((line, i) => ({ section: i === 0 ? section.label : undefined, line })));
  const chordsOf = (index: number) => [...new Set(parseLine(lines[index]?.line ?? "").flatMap((s) => (s.chord ? [state.shape(s.chord)] : [])))];
  const dockChords = pinned ? [pinned] : chordsOf(current);
  const nextChord = chordsOf(current + 1)[0];

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const band = el.getBoundingClientRect().top + el.clientHeight * BAND_RATIO;
      const index = lineRefs.current.findIndex((line) => line && line.getBoundingClientRect().bottom > band);
      setCurrent(Math.max(0, index));
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [state.sheet]);

  return (
    <div className="flex h-full flex-col bg-stone-50 text-stone-900">
      <header className="bg-stone-50 px-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate font-bold">{song.title}</h1>
            <p className="text-xs text-stone-500">{song.artist}</p>
          </div>
          <button className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-left text-xs shadow-sm ring-1 ring-stone-200" onClick={() => setKeyPickerOpen(true)}>
            <div className="text-stone-500">Key · Capo</div>
            <div className="text-base font-bold">{state.key} · {state.capo === 0 ? "none" : state.capo}</div>
          </button>
        </div>
        <div className="mt-3 flex rounded-xl bg-stone-200 p-1 text-sm">
          {song.sheets.map((s) => (
            <button key={s.id} className={`flex-1 rounded-lg py-1.5 font-semibold ${s.id === state.sheet.id ? "bg-white shadow-sm" : "text-stone-600"}`} onClick={() => state.pickSheet(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 z-10 border-y-2 border-emerald-500/40 bg-emerald-500/5" style={{ top: `calc(${BAND_RATIO * 100}% - 0.5em)`, height: "4.2em", fontSize: `${state.textSize * 20}px` }} />
        <div ref={scroller} className="h-full overflow-y-auto px-4" style={{ fontSize: `${state.textSize * 20}px` }}>
          <div style={{ height: `${BAND_RATIO * 100}%` }} className="flex items-end pb-4 text-sm text-stone-500">{state.sheet.description}. The line in the green band is the one to play.</div>
          {lines.map((item, i) => (
            <div key={i} ref={(el) => { lineRefs.current[i] = el; }} className={`py-1 transition-opacity ${i === current ? "opacity-100" : "opacity-40"}`}>
              {item.section && <div className="mt-4 mb-1 text-xs font-bold tracking-wide text-stone-400 uppercase">{item.section}</div>}
              <ChordLine line={item.line} shape={state.shape} onChord={setPinned} chordClass="font-bold text-emerald-700" />
            </div>
          ))}
          <div style={{ height: "70%" }} />
        </div>
      </div>

      <div className="border-t border-stone-200 bg-white px-3 pt-2" style={{ paddingBottom: "calc(var(--proto-bar) + 8px)" }}>
        <div className="flex items-center gap-1">
          <div className="flex flex-1 gap-1 overflow-x-auto">
            {dockChords.map((chord) => (
              <ChordDiagram key={chord} chord={chord} size={84} />
            ))}
          </div>
          <div className="w-16 shrink-0 text-center text-xs text-stone-500">
            {pinned ? (
              <button className="rounded-lg bg-stone-100 px-2 py-1" onClick={() => setPinned(undefined)}>Back to song</button>
            ) : (
              nextChord && <>Next<div className="text-lg font-bold text-stone-800">{nextChord}</div></>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 pb-1">
          <button className="h-12 w-28 rounded-xl bg-emerald-600 text-lg font-semibold text-white" onClick={() => state.setPlaying(!state.playing)}>
            {state.playing ? "❚❚ Pause" : `${PLAY_ICON} Play`}
          </button>
          <label className="flex flex-1 flex-col text-xs text-stone-500">
            Scroll speed {state.speed}
            <input type="range" min={1} max={10} value={state.speed} onChange={(e) => state.setSpeed(Number(e.target.value))} className="accent-emerald-600" />
          </label>
        </div>
      </div>

      {keyPickerOpen && <KeyPicker state={state} onClose={() => setKeyPickerOpen(false)} />}
    </div>
  );
}

function KeyPicker({ state, onClose }: { state: SongScreenState; onClose: () => void }) {
  const shapesAt = (transpose: number) => songChords(state.sheet).map((c) => transposeChord(c, transpose + state.sheet.capo - state.capo));
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-white p-5" style={{ paddingBottom: "calc(var(--proto-bar) + 20px)" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold">Key</h2>
        <p className="mb-3 text-sm text-stone-500">Pick a higher or lower key to suit your voice. ★ = only easy chords with this capo.</p>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => i - 5).map((t) => {
            const name = transposeChord(state.key, t - state.transpose);
            const easy = shapesAt(t).every(isEasy);
            return (
              <button key={t} onClick={() => state.setTranspose(t)} className={`rounded-xl py-2 font-semibold ${t === state.transpose ? "bg-emerald-600 text-white" : "bg-stone-100"}`}>
                {name}{easy && " ★"}
                <div className="text-[10px] font-normal opacity-70">{t === 0 ? "original" : t > 0 ? `+${t}` : t}</div>
              </button>
            );
          })}
        </div>
        <h2 className="mt-5 font-bold">Capo</h2>
        <p className="mb-2 text-sm text-stone-500">A clamp across the neck. Same key, easier finger shapes.</p>
        <div className="flex items-center gap-3">
          <button className="h-11 w-11 rounded-full bg-stone-100 text-2xl" onClick={() => state.setCapo(state.capo - 1)}>−</button>
          <span className="flex-1 text-center text-lg font-bold">{capoLabel(state.capo)}</span>
          <button className="h-11 w-11 rounded-full bg-stone-100 text-2xl" onClick={() => state.setCapo(state.capo + 1)}>+</button>
        </div>
        {state.suggestedCapo !== undefined && (
          <button className="mt-3 w-full rounded-xl bg-amber-100 py-2 font-semibold text-amber-900" onClick={() => state.setCapo(state.suggestedCapo!)}>
            Easier: capo on fret {state.suggestedCapo}
          </button>
        )}
        <button className="mt-4 w-full rounded-xl bg-stone-100 py-3 font-semibold" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
