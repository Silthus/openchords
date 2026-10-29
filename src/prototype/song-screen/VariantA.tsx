// PROTOTYPE (throwaway). Variant A, "Classic sheet": light page, controls in a header, diagram in a bottom sheet, play bar at the thumb.
import { useRef, useState } from "react";
import { ChordDiagram, findPositions } from "./ChordDiagram";
import { ChordLine, PLAY_ICON, capoLabel, useAutoScroll, type SongScreenState } from "./shared";
import { song } from "./song";

export function VariantA({ state }: { state: SongScreenState }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [openChord, setOpenChord] = useState<string>();
  useAutoScroll(scroller, state.playing, state.speed, () => state.setPlaying(false));

  return (
    <div className="flex h-full flex-col bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white px-4 pt-3 pb-2 shadow-sm">
        <div className="flex items-center gap-3">
          <button className="text-2xl text-gray-500" aria-label="Back">←</button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">{song.title}</h1>
            <p className="text-sm text-gray-500">{song.artist}</p>
          </div>
          <button className="rounded-lg border border-gray-300 px-2 py-1 text-sm" onClick={() => state.setTextSize(state.textSize >= 1.6 ? 0.9 : state.textSize + 0.2)}>
            A<span className="text-lg">A</span>
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <label className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5">
            <span className="text-gray-500">Version</span>
            <select className="bg-transparent font-semibold" value={state.sheet.id} onChange={(e) => state.pickSheet(e.target.value)}>
              {song.sheets.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-1 py-0.5">
            <button className="h-8 w-8 rounded-full text-lg" onClick={() => state.setTranspose(state.transpose - 1)} aria-label="Key lower">−</button>
            <span className="text-gray-500">Key</span>
            <span className="w-8 text-center font-semibold">{state.key}</span>
            <button className="h-8 w-8 rounded-full text-lg" onClick={() => state.setTranspose(state.transpose + 1)} aria-label="Key higher">+</button>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-1 py-0.5">
            <button className="h-8 w-8 rounded-full text-lg" onClick={() => state.setCapo(state.capo - 1)} aria-label="Capo lower">−</button>
            <span className="font-semibold">{capoLabel(state.capo)}</span>
            <button className="h-8 w-8 rounded-full text-lg" onClick={() => state.setCapo(state.capo + 1)} aria-label="Capo higher">+</button>
          </div>
        </div>
        {state.suggestedCapo !== undefined && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="flex-1">Hard chords? Put a capo on fret {state.suggestedCapo} and play easier shapes.</span>
            <button className="rounded-md bg-amber-500 px-2 py-1 font-semibold text-white" onClick={() => state.setCapo(state.suggestedCapo!)}>Use it</button>
          </div>
        )}
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto px-4 pt-4" style={{ fontSize: `${state.textSize * 18}px`, paddingBottom: "calc(var(--proto-bar) + 120px)" }}>
        <p className="mb-4 text-sm text-gray-500">{state.sheet.description}. Tap a chord to see how to play it.</p>
        {state.sheet.sections.map((section) => (
          <section key={section.label} className="mb-6">
            <h2 className="mb-1 text-xs font-bold tracking-wide text-gray-400 uppercase">{section.label}</h2>
            {section.lines.map((line, i) => (
              <ChordLine key={i} line={line} shape={state.shape} onChord={setOpenChord} chordClass="font-bold text-blue-600" lyricClass="mb-1" />
            ))}
          </section>
        ))}
      </div>

      <div className="fixed inset-x-0 z-10 flex justify-center px-4" style={{ bottom: "calc(var(--proto-bar) + 16px)" }}>
        <div className="flex items-center gap-2 rounded-full bg-gray-900 p-1.5 text-white shadow-lg">
          <button className="flex h-12 items-center gap-2 rounded-full bg-blue-600 px-5 text-lg font-semibold" onClick={() => state.setPlaying(!state.playing)}>
            {state.playing ? "❚❚ Pause" : `${PLAY_ICON} Play`}
          </button>
          <span className="pl-2 text-xs text-gray-400">Speed</span>
          <button className="h-10 w-10 rounded-full bg-gray-800 text-xl" onClick={() => state.setSpeed(state.speed - 1)} aria-label="Slower">−</button>
          <span className="w-5 text-center font-semibold">{state.speed}</span>
          <button className="h-10 w-10 rounded-full bg-gray-800 text-xl" onClick={() => state.setSpeed(state.speed + 1)} aria-label="Faster">+</button>
        </div>
      </div>

      {openChord && <ChordSheetDialog chord={openChord} onClose={() => setOpenChord(undefined)} />}
    </div>
  );
}

function ChordSheetDialog({ chord, onClose }: { chord: string; onClose: () => void }) {
  const [variation, setVariation] = useState(0);
  const count = findPositions(chord).length;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-white p-5" style={{ paddingBottom: "calc(var(--proto-bar) + 20px)" }} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
        <div className="flex items-start gap-4">
          <ChordDiagram chord={chord} variation={variation} size={170} />
          <div className="flex-1 text-sm text-gray-600">
            <p className="mb-2 text-2xl font-bold text-gray-900">{chord}</p>
            <p>Dots show where your fingers go. Numbers say which finger.</p>
            <p className="mt-1">O = play the string open. X = skip it.</p>
            {count > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <button className="h-9 w-9 rounded-full bg-gray-100" onClick={() => setVariation((variation + count - 1) % count)}>‹</button>
                <span>Way {variation + 1} of {count}</span>
                <button className="h-9 w-9 rounded-full bg-gray-100" onClick={() => setVariation((variation + 1) % count)}>›</button>
              </div>
            )}
          </div>
        </div>
        <button className="mt-4 w-full rounded-xl bg-gray-100 py-3 font-semibold" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
