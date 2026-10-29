import { Suspense, lazy } from "react";
import type { Chord } from "../../sheet";

const ChordDiagram = lazy(() => import("./ChordDiagram").then((module) => ({ default: module.ChordDiagram })));

export function LazyChordDiagram({ chord }: { chord: Chord }) {
  return (
    <Suspense fallback={<span className="block aspect-[72/88]" />}>
      <ChordDiagram chord={chord} />
    </Suspense>
  );
}
