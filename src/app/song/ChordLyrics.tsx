import type { ReactNode } from "react";
import type { ParsedSheet } from "../../sheet";
import { useTextSize } from "../deviceSettings";

const lyricsRemAtFullSize = 1.5;

const blank = " ";

export function PlainLyrics({ lines }: { lines: string[] }) {
  return (
    <LyricsAtHerTextSize>
      {versesOf(lines).map((verse, verseIndex) => (
        <section key={verseIndex} className="mb-8">
          {verse.map((line, lineIndex) => (
            <p key={lineIndex} className="mb-2 leading-snug">
              {line}
            </p>
          ))}
        </section>
      ))}
    </LyricsAtHerTextSize>
  );
}

function versesOf(lines: string[]) {
  const verses: string[][] = [[]];
  for (const line of lines) {
    if (line === "") verses.push([]);
    else verses[verses.length - 1]!.push(line);
  }
  return verses.filter((verse) => verse.length > 0);
}

function LyricsAtHerTextSize({ children }: { children: ReactNode }) {
  const [textSize] = useTextSize();
  return (
    <div data-lyrics className="mt-6" style={{ fontSize: `${(lyricsRemAtFullSize * textSize) / 100}rem` }}>
      {children}
    </div>
  );
}

export function ChordLyrics({ sheet, onChord }: { sheet: ParsedSheet; onChord: (written: string) => void }) {
  return (
    <LyricsAtHerTextSize>
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
    </LyricsAtHerTextSize>
  );
}
