const playIcon = "▶︎";

type PlayBarProps = { playing: boolean; speed: number; onToggle: () => void; onOpenSettings: () => void };

export function PlayBar({ playing, speed, onToggle, onOpenSettings }: PlayBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-10 grid grid-cols-[3rem_5rem_3rem] items-center justify-center gap-6">
      <button type="button" onClick={onOpenSettings} aria-label="Settings" className="pointer-events-auto size-12 justify-self-center rounded-full bg-panel text-xl shadow">
        ⚙︎
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? "Pause" : "Play"}
        className="pointer-events-auto size-20 rounded-full bg-orange-500 text-3xl text-white shadow-xl"
      >
        {playing ? "❚❚" : playIcon}
      </button>
      <p className="flex size-12 flex-col items-center justify-center rounded-full bg-panel text-xs leading-tight text-muted shadow">
        <span className="sr-only">Scroll </span>
        <span>speed</span> <span className="text-base font-bold text-ink">{speed}</span>
      </p>
    </div>
  );
}
