import { PlainLyrics } from "./ChordLyrics";
import type { Origin } from "./describeChordSheet";

export function WordsOnly({ artist, lines, writingChords }: { artist: string; lines: string[]; writingChords: boolean }) {
  return (
    <>
      <p className="text-base text-muted">
        {artist} · {writingChords ? "Writing chords…" : "No chords yet"}
      </p>
      <PlainLyrics lines={lines} />
    </>
  );
}

export function UnverifiedMark({ origin }: { origin: Origin }) {
  if (origin !== "ai") return null;
  return (
    <p role="note" className="mt-2 inline-block rounded-full bg-panel px-3 py-1 text-sm text-muted">
      AI draft: unverified, chords may be wrong
    </p>
  );
}
