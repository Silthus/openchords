import type { Chord } from "../../sheet";
import { useModalDialog } from "../useModalDialog";
import { LazyChordDiagram } from "./LazyChordDiagram";

export function LargeChordDiagram({ chord, onClose }: { chord: Chord; onClose: () => void }) {
  const dialog = useModalDialog();
  return (
    <dialog
      ref={dialog}
      aria-label={`${chord.written} large`}
      onClose={onClose}
      className="m-0 size-full max-h-none max-w-none bg-page/95 text-ink backdrop:bg-transparent"
    >
      <button
        type="button"
        onClick={() => dialog.current?.close()}
        className="flex size-full flex-col items-center justify-center gap-4 px-16"
      >
        <span className="block w-full max-w-xs">
          <LazyChordDiagram chord={chord} />
        </span>
        <span className="text-base text-muted">Tap to close.</span>
      </button>
    </dialog>
  );
}
