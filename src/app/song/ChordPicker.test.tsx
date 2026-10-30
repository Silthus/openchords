import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ChordPicker } from "./ChordPicker";

function pickerFor(current: string | undefined) {
  return renderToStaticMarkup(<ChordPicker word="grace" current={current} notation="international" onPick={() => {}} onRemove={() => {}} onClose={() => {}} />);
}

describe("the chord picker", () => {
  test("starts on the chord over the word", () => {
    expect(pickerFor("G7/B")).toContain(">Set G7/B</button>");
  });

  test("keeps a chord the quality buttons do not offer", () => {
    expect(pickerFor("Cdim7")).toContain(">Set Cdim7</button>");
  });

  test("asks for a root over a word with no chord", () => {
    expect(pickerFor(undefined)).toContain(">Pick a root</button>");
  });

  test("offers to remove the chord over the word", () => {
    expect(pickerFor("G7")).toContain(">Remove chord</button>");
  });

  test("offers no removal over a word with no chord", () => {
    expect(pickerFor(undefined)).not.toContain("Remove chord");
  });
});
