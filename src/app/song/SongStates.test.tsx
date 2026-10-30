import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { UnverifiedMark, WordsOnly } from "./SongStates";

const lines = ["Love is a burning thing"];

describe("a song with words and no chords", () => {
  test("says chords are being written while the AI drafts them", () => {
    const markup = renderToStaticMarkup(<WordsOnly artist="Johnny Cash" lines={lines} writingChords />);
    expect(markup).toContain("Johnny Cash · Writing chords…");
    expect(markup).toContain(">Love is a burning thing</p>");
  });

  test("says it has no chords yet once no draft is coming", () => {
    expect(renderToStaticMarkup(<WordsOnly artist="Johnny Cash" lines={lines} writingChords={false} />)).toContain("Johnny Cash · No chords yet");
  });
});

describe("the unverified mark", () => {
  test("warns that an AI draft's chords may be wrong", () => {
    expect(renderToStaticMarkup(<UnverifiedMark origin="ai" />)).toContain("AI draft: unverified, chords may be wrong");
  });

  test("stays off a built-in Chord sheet", () => {
    expect(renderToStaticMarkup(<UnverifiedMark origin="builtIn" />)).toBe("");
  });
});
