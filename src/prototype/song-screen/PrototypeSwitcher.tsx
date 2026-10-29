// PROTOTYPE (throwaway): floating variant switcher, only in builds with VITE_PROTOTYPE=1.
import { useEffect } from "react";

type Props = { variants: { key: string; name: string }[]; current: string; onChange: (key: string) => void; state: string };

export function PrototypeSwitcher({ variants, current, onChange, state }: Props) {
  const index = Math.max(0, variants.findIndex((v) => v.key === current));
  const step = (delta: number) => onChange(variants[(index + delta + variants.length) % variants.length].key);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center bg-fuchsia-700 pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-2px_8px_rgba(0,0,0,0.3)]">
      <div className="flex h-10 w-full max-w-md items-center justify-between px-2 text-sm font-semibold">
        <button className="h-10 w-12 text-xl" onClick={() => step(-1)} aria-label="Previous variant">‹</button>
        <span>
          Variant {variants[index].key} · {variants[index].name}
        </span>
        <button className="h-10 w-12 text-xl" onClick={() => step(1)} aria-label="Next variant">›</button>
      </div>
      <div className="w-full truncate px-3 pb-1 text-center font-mono text-[10px] opacity-80">{state}</div>
    </div>
  );
}
