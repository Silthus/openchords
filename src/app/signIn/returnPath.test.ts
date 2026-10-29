import { describe, expect, test } from "bun:test";
import { returnPath } from "./returnPath";

describe("after sign-in the visitor returns", () => {
  test("to the link they came from", () => {
    expect(returnPath("/songs/abc/sheets/def")).toBe("/songs/abc/sheets/def");
    expect(returnPath("/?q=rising")).toBe("/?q=rising");
  });

  test("to the start when no link or another site is named", () => {
    expect(returnPath(undefined)).toBe("/");
    expect(returnPath("https://example.com/songs/abc")).toBe("/");
    expect(returnPath("//example.com/songs/abc")).toBe("/");
    expect(returnPath("/\\example.com")).toBe("/");
  });
});
