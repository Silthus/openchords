import { describe, expect, test } from "bun:test";
import { describeChordSheet } from "./describeChordSheet";

describe("describeChordSheet", () => {
  test("names the origin, the key and the capo", () => {
    expect(describeChordSheet("builtIn", { key: "Am", capo: 5 })).toBe("Built in · Am · capo 5");
  });

  test("leaves out a capo of 0", () => {
    expect(describeChordSheet("builtIn", { key: "Am", capo: 0 })).toBe("Built in · Am");
  });

  test("leaves out a key the sheet does not name", () => {
    expect(describeChordSheet("builtIn", { capo: 2 })).toBe("Built in · capo 2");
  });
});
