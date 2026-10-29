// PROTOTYPE (throwaway). Variant B, "Stage": dark full-screen lyrics, every Chord diagram pinned on top, tap anywhere to pause, settings in one sheet.
import { useRef, useState } from "react";
import { ChordDiagram } from "./ChordDiagram";
import { ChordLine, PLAY_ICON, capoLabel, useAutoScroll, type SongScreenState } from "./shared";
import { song, songChords } from "./song";

export function VariantB({ state }: { state: SongScreenState }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [focusChord, setFocusChord] = useState<string>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  useAutoScroll(scroller, state.playing, state.speed, () => state.setPlaying(false));
  const chords = songChords(state.sheet).map(state.shape);

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      <div className="flex gap-1 overflow-x-auto border-b border-neutral-800 bg-neutral-900 px-2 pt-2 pb-1">
        {chords.map((chord) => (
          <button key={chord} className={`shrink-0 rounded-lg px-1 ${focusChord === chord ? "bg-amber-400/20" : ""}`} onClick={() => setFocusChord(focusChord === chord ? undefined : chord)}>
            <ChordDiagram chord={chord} size={64} dark />
          </button>
        ))}
      </div>
      {focusChord && (
        <div className="flex items-center gap-4 border-b border-neutral-800 bg-neutral-900 px-4 py-2" onClick={() => setFocusChord(undefined)}>
          <ChordDiagram chord={focusChord} size={130} dark />
          <p className="text-sm text-neutral-400">Dots: where your fingers go. Numbers: which finger. O: play open. X: skip. Tap to close.</p>
        </div>
      )}

      <div
        ref={scroller}
        className="relative flex-1 overflow-y-auto px-5 pt-5"
        style={{ fontSize: `${state.textSize * 24}px`, paddingBottom: "calc(var(--proto-bar) + 140px)" }}
        onClick={() => state.setPlaying(!state.playing)}
      >
        <h1 className="text-2xl font-bold">{song.title}</h1>
        <p className="mb-6 text-base text-neutral-400">
          {song.artist} · {state.sheet.name} · Key {state.key} · {capoLabel(state.capo)}
        </p>
        {state.sheet.sections.map((section) => (
          <section key={section.label} className="mb-8">
            {section.lines.map((line, i) => (
              <ChordLine key={i} line={line} shape={state.shape} onChord={setFocusChord} chordClass="font-bold text-amber-400" lyricClass="mb-2" />
            ))}
          </section>
        ))}
        <p className="text-center text-base text-neutral-500">End of song</p>
      </div>

      <div className="pointer-events-none fixed inset-x-0 z-10 flex items-center justify-center gap-6" style={{ bottom: "calc(var(--proto-bar) + 20px)" }}>
        <button className="pointer-events-auto h-12 w-12 rounded-full bg-neutral-800/90 text-xl" onClick={() => setSettingsOpen(true)} aria-label="Settings">⚙︎</button>
        <button className="pointer-events-auto h-20 w-20 rounded-full bg-amber-400 text-3xl text-neutral-950 shadow-xl" onClick={() => state.setPlaying(!state.playing)} aria-label={state.playing ? "Pause" : "Play"}>
          {state.playing ? "❚❚" : PLAY_ICON}
        </button>
        <div className="pointer-events-auto flex h-12 w-12 flex-col items-center justify-center rounded-full bg-neutral-800/90 text-xs leading-tight">
          <span className="text-neutral-400">speed</span>
          <span className="text-base font-bold">{state.speed}</span>
        </div>
      </div>
      {state.playing && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-10 text-center text-xs text-neutral-500">Tap the lyrics to pause</div>
      )}

      {settingsOpen && <SettingsSheet state={state} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function Stepper({ label, value, hint, onDown, onUp }: { label: string; value: string; hint: string; onDown: () => void; onUp: () => void }) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        <div className="flex items-center gap-3">
          <button className="h-11 w-11 rounded-full bg-neutral-800 text-2xl" onClick={onDown}>−</button>
          <span className="w-28 text-center text-lg font-bold">{value}</span>
          <button className="h-11 w-11 rounded-full bg-neutral-800 text-2xl" onClick={onUp}>+</button>
        </div>
      </div>
      <p className="mt-1 text-sm text-neutral-400">{hint}</p>
    </div>
  );
}

function SettingsSheet({ state, onClose }: { state: SongScreenState; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="max-h-[85%] w-full overflow-y-auto rounded-t-3xl bg-neutral-900 p-5 text-neutral-100" style={{ paddingBottom: "calc(var(--proto-bar) + 20px)" }} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-700" />
        <h2 className="mb-2 text-sm font-bold tracking-wide text-neutral-400 uppercase">Chord sheet</h2>
        <div className="flex flex-col gap-2">
          {song.sheets.map((s) => (
            <button key={s.id} onClick={() => state.pickSheet(s.id)} className={`rounded-xl border p-3 text-left ${s.id === state.sheet.id ? "border-amber-400 bg-amber-400/10" : "border-neutral-700"}`}>
              <div className="font-semibold">{s.name}</div>
              <div className="text-sm text-neutral-400">{s.description}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 divide-y divide-neutral-800">
          <Stepper label="Key" value={state.key} hint="Moves the whole song higher or lower to suit your voice." onDown={() => state.setTranspose(state.transpose - 1)} onUp={() => state.setTranspose(state.transpose + 1)} />
          <Stepper label="Capo" value={capoLabel(state.capo)} hint="A clamp across the neck: same key, easier finger shapes." onDown={() => state.setCapo(state.capo - 1)} onUp={() => state.setCapo(state.capo + 1)} />
          {state.suggestedCapo !== undefined && (
            <button className="mb-3 w-full rounded-xl bg-amber-400 py-2 font-semibold text-neutral-950" onClick={() => state.setCapo(state.suggestedCapo!)}>
              Make it easier: capo on fret {state.suggestedCapo}
            </button>
          )}
          <Stepper label="Scroll speed" value={String(state.speed)} hint="How fast the lyrics move while playing." onDown={() => state.setSpeed(state.speed - 1)} onUp={() => state.setSpeed(state.speed + 1)} />
          <Stepper label="Text size" value={`${Math.round(state.textSize * 100)}%`} hint="Bigger text to read from further away." onDown={() => state.setTextSize(state.textSize - 0.1)} onUp={() => state.setTextSize(state.textSize + 0.1)} />
        </div>
        <button className="mt-4 w-full rounded-xl bg-neutral-800 py-3 font-semibold" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
