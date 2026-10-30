import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchStatus } from "./SearchStatus";

const statusOf = (props: Parameters<typeof SearchStatus>[0]) => renderToStaticMarkup(<SearchStatus {...props} />);

describe("what the search screen says while new songs are found", () => {
  test("keeps looking while found songs have not reached the list yet", () => {
    const status = statusOf({ query: "Riverside", discovery: "found", listIsEmpty: true, offline: false });
    expect(status).toContain("Looking for more songs…");
    expect(status).not.toContain("No Songs found");
  });

  test("stops looking once the found songs are in the list", () => {
    expect(statusOf({ query: "Riverside", discovery: "found", listIsEmpty: false, offline: false })).toBe("");
  });

  test("says no Songs were found only when discovery found none", () => {
    const status = statusOf({ query: "qzxv", discovery: "nothingFound", listIsEmpty: true, offline: false });
    expect(status).toContain("No Songs found for “qzxv”.");
    expect(status).not.toContain("Looking for more songs…");
  });

  test("looks while discovery runs, without saying nothing was found", () => {
    const status = statusOf({ query: "Riverside", discovery: "looking", listIsEmpty: true, offline: false });
    expect(status).toContain("Looking for more songs…");
    expect(status).not.toContain("No Songs found");
  });
});

describe("what the search screen says with no connection", () => {
  test("says search needs a connection instead of looking", () => {
    const status = statusOf({ query: "Riverside", discovery: "looking", listIsEmpty: true, offline: true });
    expect(status).toContain("Search needs a connection");
    expect(status).not.toContain("Looking for more songs…");
    expect(status).not.toContain("No Songs found");
  });
});
