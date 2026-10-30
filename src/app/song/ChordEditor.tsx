import { useState } from "react";
import { layerOf, setChord, transpose, type ChordLayer, type ChordSpot, type ParsedSheet } from "../../sheet";
import { ChordPicker } from "./ChordPicker";
import { LyricsAtHerTextSize } from "./ChordLyrics";

const blank = " ";

type ChordEditorProps = { sheet: ParsedSheet; onSave: (layer: ChordLayer) => Promise<void>; onCancel: () => void };

export function ChordEditor({ sheet: shown, onSave, onCancel }: ChordEditorProps) {
  const [sheet, setSheet] = useState(shown);
  const [picking, setPicking] = useState<ChordSpot>();
  const [saving, setSaving] = useState<"no" | "yes" | "failed">("no");
  const save = async () => {
    setSaving("yes");
    try {
      await onSave(layerOf(sheet));
    } catch {
      setSaving("failed");
    }
  };
  return (
    <fieldset disabled={saving === "yes"}>
      <p className="mt-4 text-base text-muted">Tap a word to set its chord.</p>
      <EditableLyrics sheet={sheet} onPick={setPicking} />
      <div className="h-48" />
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-page px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl">
          {saving === "failed" && <p role="alert" className="mb-2 text-sm text-accent">Couldn't save your version. Try again.</p>}
          <div className="mb-3 flex items-center justify-center gap-3">
            <KeyButton label="Key −" onClick={() => setSheet(transpose(sheet, -1))}>
              −
            </KeyButton>
            <span className="w-28 text-center font-bold">Key {sheet.meta.key ?? ""}</span>
            <KeyButton label="Key +" onClick={() => setSheet(transpose(sheet, 1))}>
              +
            </KeyButton>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-panel py-3 font-semibold">
              Cancel
            </button>
            <button type="button" onClick={() => void save()} className="flex-1 rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-40">
              Save as my version
            </button>
          </div>
        </div>
      </div>
      {picking && (
        <ChordPicker
          word={wordAt(sheet, picking).text}
          current={wordAt(sheet, picking).chords[picking.chord]}
          notation={sheet.notation}
          onPick={(chord) => setSheet(setChord(sheet, picking, chord))}
          onClose={() => setPicking(undefined)}
        />
      )}
    </fieldset>
  );
}

function wordAt(sheet: ParsedSheet, { section, line, word }: ChordSpot) {
  return sheet.sections[section]!.lines[line]!.words[word]!;
}

function EditableLyrics({ sheet, onPick }: { sheet: ParsedSheet; onPick: (spot: ChordSpot) => void }) {
  return (
    <LyricsAtHerTextSize>
      {sheet.sections.map((section, sectionIndex) => (
        <section key={sectionIndex} aria-label={section.label || undefined} className="mb-8">
          {section.lines.map((line, lineIndex) => (
            <p key={lineIndex} className="mb-2 flex flex-wrap items-end gap-x-[0.3em]">
              {line.words.map((word, wordIndex) => {
                const spot = (chord: number) => ({ section: sectionIndex, line: lineIndex, word: wordIndex, chord });
                return (
                  <span key={wordIndex} className="inline-flex flex-col">
                    <span className="flex min-h-[1.3em] gap-x-[0.3em] leading-tight font-bold text-accent">
                      {word.chords.length === 0
                        ? blank
                        : word.chords.map((chord, chordIndex) => (
                            <button key={chordIndex} type="button" onClick={() => onPick(spot(chordIndex))}>
                              {chord}
                            </button>
                          ))}
                    </span>
                    <button type="button" onClick={() => onPick(spot(0))} className="rounded text-left leading-snug underline decoration-line decoration-dotted underline-offset-4">
                      {word.text || blank}
                    </button>
                  </span>
                );
              })}
            </p>
          ))}
        </section>
      ))}
    </LyricsAtHerTextSize>
  );
}

function KeyButton({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="size-11 rounded-full bg-panel text-2xl">
      {children}
    </button>
  );
}
