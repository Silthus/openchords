const playIcon = "▶︎";

export function PlayBar({ playing, speed, onToggle }: { playing: boolean; speed: number; onToggle: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-10 grid grid-cols-[3rem_5rem_3rem] items-center justify-center gap-6">
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? "Pause" : "Play"}
        className="pointer-events-auto col-start-2 size-20 rounded-full bg-orange-500 text-3xl text-white shadow-xl"
      >
        {playing ? "❚❚" : playIcon}
      </button>
      <p className="flex size-12 flex-col items-center justify-center rounded-full bg-stone-100 text-xs leading-tight text-stone-500 shadow">
        <span className="sr-only">Scroll </span>
        <span>speed</span> <span className="text-base font-bold text-stone-900">{speed}</span>
      </p>
    </div>
  );
}
