// PROTOTYPE (throwaway). Variant B, "Stage" (round 2): big lyrics with the song's Chord diagrams above them, light or dark, tap anywhere to pause, settings in one sheet.
import { useRef, useState } from "react";
import { ChordDiagram } from "./ChordDiagram";
import { ChordLine, PLAY_ICON, capoLabel, useAutoScroll, type SongScreenState, type Theme } from "./shared";
import { song, songChords } from "./song";

const THEMES = {
  light: {
    page: "bg-white text-stone-900",
    muted: "text-stone-500",
    chord: "text-orange-600",
    panel: "bg-stone-100",
    sheet: "bg-white text-stone-900",
    control: "bg-stone-200",
    border: "border-stone-200",
    divide: "divide-stone-200",
    floating: "bg-white/95 shadow-lg ring-1 ring-stone-200",
  },
  dark: {
    page: "bg-neutral-950 text-neutral-100",
    muted: "text-neutral-400",
    chord: "text-amber-400",
    panel: "bg-neutral-900",
    sheet: "bg-neutral-900 text-neutral-100",
    control: "bg-neutral-800",
    border: "border-neutral-700",
    divide: "divide-neutral-800",
    floating: "bg-neutral-800/95 shadow-lg",
  },
};

type Look = (typeof THEMES)[Theme];

export function VariantB({ state }: { state: SongScreenState }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [focusChord, setFocusChord] = useState<string>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  useAutoScroll(scroller, state.playing, state.speed, () => state.setPlaying(false));
  const look = THEMES[state.theme];
  const dark = state.theme === "dark";
  const chords = songChords(state.sheet).map(state.shape);

  return (
    <div className={`flex h-full flex-col ${look.page}`}>
      <div
        ref={scroller}
        className="relative flex-1 overflow-y-auto px-5 pt-5"
        style={{ fontSize: `${state.textSize * 24}px`, paddingBottom: "calc(var(--proto-bar) + 140px)" }}
        onClick={() => state.setPlaying(!state.playing)}
      >
        <h1 className="text-2xl font-bold">{song.title}</h1>
        <p className={`text-base ${look.muted}`}>
          {song.artist} · {state.sheet.name} · Key {state.key} · {capoLabel(state.capo)}
        </p>

        <section className={`my-5 rounded-2xl p-3 ${look.panel}`}>
          <h2 className={`mb-1 text-xs font-bold tracking-wide uppercase ${look.muted}`}>Chords in this song</h2>
          <div className="grid grid-cols-5 gap-1">
            {chords.map((chord) => (
              <button key={chord} onClick={(e) => { e.stopPropagation(); setFocusChord(chord); }}>
                <ChordDiagram chord={chord} size="100%" dark={dark} />
              </button>
            ))}
          </div>
          <p className={`text-sm ${look.muted}`}>Dots: where your fingers go. Numbers: which finger. O: play the string open. X: skip it.</p>
        </section>

        {state.sheet.sections.map((section) => (
          <section key={section.label} className="mb-8">
            {section.lines.map((line, i) => (
              <ChordLine key={i} line={line} shape={state.shape} onChord={setFocusChord} chordClass={`font-bold ${look.chord}`} lyricClass="mb-2" />
            ))}
          </section>
        ))}
        <p className={`text-center text-base ${look.muted}`}>End of song</p>
      </div>

      {focusChord && (
        <div className={`fixed inset-x-4 top-4 z-20 flex items-center gap-4 rounded-2xl p-4 ${look.floating}`} onClick={() => setFocusChord(undefined)}>
          <ChordDiagram chord={focusChord} size={130} dark={dark} />
          <p className={`text-sm ${look.muted}`}>Tap to close.</p>
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 z-10 flex items-center justify-center gap-6" style={{ bottom: "calc(var(--proto-bar) + 20px)" }}>
        <button className={`pointer-events-auto h-12 w-12 rounded-full text-xl ${look.floating}`} onClick={() => setSettingsOpen(true)} aria-label="Settings">⚙︎</button>
        <button className="pointer-events-auto h-20 w-20 rounded-full bg-amber-400 text-3xl text-neutral-950 shadow-xl" onClick={() => state.setPlaying(!state.playing)} aria-label={state.playing ? "Pause" : "Play"}>
          {state.playing ? "❚❚" : PLAY_ICON}
        </button>
        <div className={`pointer-events-auto flex h-12 w-12 flex-col items-center justify-center rounded-full text-xs leading-tight ${look.floating}`}>
          <span className={look.muted}>speed</span>
          <span className="text-base font-bold">{state.speed}</span>
        </div>
      </div>
      {state.playing && (
        <div className={`pointer-events-none fixed inset-x-0 top-2 z-10 text-center text-xs ${look.muted}`}>Tap the lyrics to pause</div>
      )}

      {settingsOpen && <SettingsSheet state={state} look={look} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function Stepper({ label, value, hint, look, onDown, onUp }: { label: string; value: string; hint: string; look: Look; onDown: () => void; onUp: () => void }) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        <div className="flex items-center gap-3">
          <button className={`h-11 w-11 rounded-full text-2xl ${look.control}`} onClick={onDown}>−</button>
          <span className="w-28 text-center text-lg font-bold">{value}</span>
          <button className={`h-11 w-11 rounded-full text-2xl ${look.control}`} onClick={onUp}>+</button>
        </div>
      </div>
      <p className={`mt-1 text-sm ${look.muted}`}>{hint}</p>
    </div>
  );
}

function SettingsSheet({ state, look, onClose }: { state: SongScreenState; look: Look; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div className={`max-h-[85%] w-full overflow-y-auto rounded-t-3xl p-5 ${look.sheet}`} style={{ paddingBottom: "calc(var(--proto-bar) + 20px)" }} onClick={(e) => e.stopPropagation()}>
        <div className={`mx-auto mb-4 h-1 w-10 rounded-full ${look.control}`} />
        <h2 className={`mb-2 text-sm font-bold tracking-wide uppercase ${look.muted}`}>Chord sheet</h2>
        <div className="flex flex-col gap-2">
          {song.sheets.map((s) => (
            <button key={s.id} onClick={() => state.pickSheet(s.id)} className={`rounded-xl border p-3 text-left ${s.id === state.sheet.id ? "border-amber-400 bg-amber-400/10" : look.border}`}>
              <div className="font-semibold">{s.name}</div>
              <div className={`text-sm ${look.muted}`}>{s.description}</div>
            </button>
          ))}
        </div>
        <div className={`mt-4 divide-y ${look.divide}`}>
          <div className="flex items-center justify-between py-3">
            <span className="font-semibold">Look</span>
            <div className={`flex rounded-full p-1 ${look.control}`}>
              {(["light", "dark"] as const).map((theme) => (
                <button key={theme} onClick={() => state.setTheme(theme)} className={`rounded-full px-4 py-1.5 font-semibold ${state.theme === theme ? "bg-amber-400 text-neutral-950" : ""}`}>
                  {theme === "light" ? "☀︎ Light" : "☾ Dark"}
                </button>
              ))}
            </div>
          </div>
          <Stepper label="Key" value={state.key} look={look} hint="Moves the whole song higher or lower to suit your voice." onDown={() => state.setTranspose(state.transpose - 1)} onUp={() => state.setTranspose(state.transpose + 1)} />
          <Stepper label="Capo" value={capoLabel(state.capo)} look={look} hint="A clamp across the neck: same key, easier finger shapes." onDown={() => state.setCapo(state.capo - 1)} onUp={() => state.setCapo(state.capo + 1)} />
          {state.suggestedCapo !== undefined && (
            <button className="mb-3 w-full rounded-xl bg-amber-400 py-2 font-semibold text-neutral-950" onClick={() => state.setCapo(state.suggestedCapo!)}>
              Make it easier: capo on fret {state.suggestedCapo}
            </button>
          )}
          <Stepper label="Scroll speed" value={String(state.speed)} look={look} hint="How fast the lyrics move while playing." onDown={() => state.setSpeed(state.speed - 1)} onUp={() => state.setSpeed(state.speed + 1)} />
          <Stepper label="Text size" value={`${Math.round(state.textSize * 100)}%`} look={look} hint="Bigger text to read from further away." onDown={() => state.setTextSize(state.textSize - 0.1)} onUp={() => state.setTextSize(state.textSize + 0.1)} />
        </div>
        <button className={`mt-4 w-full rounded-xl py-3 font-semibold ${look.control}`} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
