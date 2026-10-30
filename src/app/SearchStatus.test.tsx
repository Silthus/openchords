import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchStatus } from "./SearchStatus";

const statusOf = (props: Parameters<typeof SearchStatus>[0]) => renderToStaticMarkup(<SearchStatus {...props} />);

describe("what the search screen says while new songs are found", () => {
  test("keeps looking while found songs have not reached the list yet", () => {
    const status = statusOf({ query: "Riverside", discovery: "found", listIsEmpty: true });
    expect(status).toContain("Looking for more songs…");
    expect(status).not.toContain("No Songs found");
  });

  test("stops looking once the found songs are in the list", () => {
    expect(statusOf({ query: "Riverside", discovery: "found", listIsEmpty: false })).toBe("");
  });

  test("says no Songs were found only when discovery found none", () => {
    const status = statusOf({ query: "qzxv", discovery: "nothingFound", listIsEmpty: true });
    expect(status).toContain("No Songs found for “qzxv”.");
    expect(status).not.toContain("Looking for more songs…");
  });

  test("looks while discovery runs, without saying nothing was found", () => {
    const status = statusOf({ query: "Riverside", discovery: "looking", listIsEmpty: true });
    expect(status).toContain("Looking for more songs…");
    expect(status).not.toContain("No Songs found");
  });
});
