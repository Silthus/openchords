import { describe, expect, test } from "bun:test";
import { describeChordSheet } from "./describeChordSheet";

describe("describeChordSheet", () => {
  test("names the origin, the key and the capo", () => {
    expect(describeChordSheet("builtIn", { key: "Am", capo: 5 })).toBe("Built in · Am · capo 5");
  });

  test("leaves out a capo of 0", () => {
    expect(describeChordSheet("builtIn", { key: "Am", capo: 0 })).toBe("Built in · Am");
  });

  test("marks an AI draft as unverified", () => {
    expect(describeChordSheet("ai", { key: "G", capo: 0 })).toBe("AI draft · unverified · G");
  });

  test("says a person's version was fixed by hand", () => {
    expect(describeChordSheet("person", { key: "C", capo: 0 })).toBe("Fixed by hand · C");
  });

  test("leaves out a key the sheet does not name", () => {
    expect(describeChordSheet("builtIn", { capo: 2 })).toBe("Built in · capo 2");
  });
});
