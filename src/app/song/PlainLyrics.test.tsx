import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PlainLyrics } from "./ChordLyrics";

describe("words without chords", () => {
  test("show brackets and braces as she would sing them, with no chords to tap", () => {
    const words = ["[Chorus]", "I fell into a [burning] ring", "{spoken: come home}"];
    const markup = renderToStaticMarkup(<PlainLyrics lines={words} />);
    for (const line of words) expect(markup).toContain(`>${line}</p>`);
    expect(markup).not.toContain("<button");
  });
});
