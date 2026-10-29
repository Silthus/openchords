import type { ParsedSheet } from "../../sheet";
import { useTextSize } from "../deviceSettings";

const lyricsRemAtFullSize = 1.5;

const blank = " ";

export function ChordLyrics({ sheet, onChord }: { sheet: ParsedSheet; onChord: (written: string) => void }) {
  const [textSize] = useTextSize();
  return (
    <div data-lyrics className="mt-6" style={{ fontSize: `${(lyricsRemAtFullSize * textSize) / 100}rem` }}>
      {sheet.sections.map((section, sectionIndex) => (
        <section key={sectionIndex} aria-label={section.label || undefined} className="mb-8">
          {section.lines.map((line, lineIndex) => (
            <p key={lineIndex} className="mb-2 flex flex-wrap items-end gap-x-[0.3em]">
              {line.words.map((word, wordIndex) => (
                <span key={wordIndex} className="inline-flex flex-col">
                  <span className="flex min-h-[1.3em] gap-x-[0.3em] leading-tight font-bold text-accent">
                    {word.chords.length === 0
                      ? blank
                      : word.chords.map((chord, chordIndex) => (
                          <button
                            key={chordIndex}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onChord(chord);
                            }}
                          >
                            {chord}
                          </button>
                        ))}
                  </span>
                  <span className="leading-snug">{word.text || blank}</span>
                </span>
              ))}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
