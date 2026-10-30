import { describe, expect, test } from "bun:test";
import { compose } from "../../src/sheet";
import { builtIns, sourcesFor } from ".";

const { lyricsFor, chordsFor } = sourcesFor({});

const risingSun = builtIns.find((song) => song.builtInId === "house-of-the-rising-sun")!;

describe("the builtIn source", () => {
  test("offers six public-domain Songs", () => {
    expect(builtIns.map((song) => [song.title, song.artist])).toEqual([
      ["House of the Rising Sun", "Traditional"],
      ["Amazing Grace", "John Newton"],
      ["Scarborough Fair", "Traditional"],
      ["Wayfaring Stranger", "Traditional"],
      ["Shenandoah", "Traditional"],
      ["Red River Valley", "Traditional"],
    ]);
  });

  test("answers the words of a built-in Song as public domain", async () => {
    const lyrics = await lyricsFor(risingSun);
    expect(lyrics?.lines[0]).toBe("There is a house in New Orleans");
    expect(lyrics?.provenance).toMatchObject({ source: "builtIn", recordId: "house-of-the-rising-sun", licence: "public-domain" });
  });

  test("answers every Chord sheet of a built-in Song", async () => {
    const drafts = await chordsFor(risingSun, (await lyricsFor(risingSun))!);
    expect(drafts.map((draft) => [draft.name, draft.layer.key, draft.layer.capo])).toEqual([
      ["Classic", "Am", 0],
      ["Easy shapes", "Am", 5],
      ["Bluesy", "Am", 0],
    ]);
  });

  test("answers nothing for a Song that is not built in", async () => {
    const other = { title: "Ring of Fire", artist: "Johnny Cash" };
    expect(await lyricsFor(other)).toBeNull();
  });

  test.each(builtIns.map((song) => [song.title, song]))("every Chord sheet of %s fits its words", async (_, song) => {
    const lyrics = (await lyricsFor(song))!;
    for (const draft of await chordsFor(song, lyrics)) {
      expect(() => compose(lyrics.lines, draft.layer, song)).not.toThrow();
      expect(draft.layer.lines.length).toBe(lyrics.lines.length);
    }
  });
});

describe("sourcesFor", () => {
  test("refuses outside sources while invites are off, so a public link never reaches them", () => {
    expect(() => sourcesFor({ OPENCHORDS_SOURCES: "builtIn,musicbrainz" })).toThrow(/OPENCHORDS_INVITES/);
  });

  test("refuses a source it does not know", () => {
    expect(() => sourcesFor({ OPENCHORDS_SOURCES: "builtIn,musicbrianz", OPENCHORDS_INVITES: "on" })).toThrow(/musicbrianz/);
  });
});

describe("sourcesFor with the AI", () => {
  const withTheAi = { OPENCHORDS_SOURCES: "builtIn,ai", OPENCHORDS_INVITES: "on" };

  test("refuses the AI while invites are off, so a public link never spends on a draft", () => {
    expect(() => sourcesFor({ OPENCHORDS_SOURCES: "builtIn,ai" })).toThrow(/OPENCHORDS_INVITES/);
  });

  test("asks the AI for chords only while ai is in OPENCHORDS_SOURCES", () => {
    expect(sourcesFor({}).chordSources).toEqual(["builtIn"]);
    expect(sourcesFor(withTheAi).chordSources).toEqual(["builtIn", "ai"]);
  });

  test("a built-in Song keeps its own Chord sheets and never reaches the AI", async () => {
    const drafts = await sourcesFor(withTheAi).chordsFor(risingSun, (await lyricsFor(risingSun))!);
    expect(drafts.map((draft) => draft.origin)).toEqual(["builtIn", "builtIn", "builtIn"]);
  });
});

describe("sourcesFor with LRCLIB", () => {
  test("refuses LRCLIB without its app id and key", () => {
    expect(() => sourcesFor({ OPENCHORDS_SOURCES: "builtIn,lrclib", OPENCHORDS_INVITES: "on" })).toThrow(/LRCLIB_APP_ID/);
  });
});
