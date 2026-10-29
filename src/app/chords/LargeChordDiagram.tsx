import type { Chord } from "../../sheet";
import { LazyChordDiagram } from "./LazyChordDiagram";

export function LargeChordDiagram({ chord, onClose }: { chord: Chord; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label={`${chord.written} large`}
      onClick={onClose}
      className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white/95 px-16"
    >
      <div className="w-full max-w-xs">
        <LazyChordDiagram chord={chord} />
      </div>
      <p className="text-base text-stone-500">Tap to close.</p>
    </div>
  );
}
