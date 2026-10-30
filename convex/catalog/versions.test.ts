import { describe, expect, test } from "bun:test";
import { layerOf, parse, type ChordLayer } from "../../src/sheet";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { invitedReader, testBackend } from "../testing.helper";

type Backend = ReturnType<typeof testBackend>;
type Sheet = { chordSheetId: Id<"chordSheets">; name: string; origin: string; chordPro: string; replaces: Id<"chordSheets">[] };

const ben = { email: "ben@example.com", name: "Ben Ott" };

async function amazingGrace() {
  const backend = testBackend();
  await backend.mutation(internal.catalog.index.seed, {});
  await backend.finishAllScheduledFunctions(() => {});
  const songs = await backend.query(api.catalog.index.builtIns, {});
  const songId = songs.find((song) => song.title === "Amazing Grace")!.songId;
  return { backend, songId, classic: (await sheetsOf(backend, songId))[0]! };
}

async function sheetsOf(backend: Backend, songId: Id<"songs">): Promise<Sheet[]> {
  return (await backend.query(api.catalog.index.song, { songId }))!.sheets;
}

function withFirstChord(sheet: Sheet, chord: string): ChordLayer {
  const layer = layerOf(parse(sheet.chordPro));
  const [first, ...rest] = layer.lines;
  return { ...layer, lines: [{ ...first!, chords: [{ word: 0, chord }, ...first!.chords.slice(1)] }, ...rest] };
}

describe("her version of a Chord sheet", () => {
  test("is stored as one more Chord sheet named after her, with her chords over the same words", async () => {
    const { backend, songId, classic } = await amazingGrace();
    const her = await invitedReader(backend);
    const chordSheetId = await her.mutation(api.catalog.index.saveVersion, { from: classic.chordSheetId, layer: withFirstChord(classic, "D") });
    const sheets = await sheetsOf(backend, songId);
    expect(sheets.map((sheet) => [sheet.name, sheet.origin])).toEqual([
      ["Classic", "builtIn"],
      ["Anna's version", "person"],
    ]);
    const version = sheets[1]!;
    expect(version.chordSheetId).toBe(chordSheetId);
    expect(version.chordPro).toContain("[D]Amazing [G7]grace, how [C]sweet the [G]sound");
    expect(version.chordPro).toContain("{comment: Verse 2}");
    expect(sheets[0]).toEqual(classic);
  });

  test("fixed again, shows only her newest version", async () => {
    const { backend, songId, classic } = await amazingGrace();
    const her = await invitedReader(backend);
    const first = await her.mutation(api.catalog.index.saveVersion, { from: classic.chordSheetId, layer: withFirstChord(classic, "D") });
    const firstVersion = (await sheetsOf(backend, songId)).find((sheet) => sheet.chordSheetId === first)!;
    const newest = await her.mutation(api.catalog.index.saveVersion, { from: first, layer: withFirstChord(firstVersion, "Em") });
    const sheets = await sheetsOf(backend, songId);
    expect(sheets.map((sheet) => sheet.chordSheetId)).toEqual([classic.chordSheetId, newest]);
    expect(sheets[1]!.chordPro).toContain("[Em]Amazing");
    expect(sheets[1]!.replaces).toEqual([first]);
    expect(sheets[0]!.replaces).toEqual([]);
  });

  test("is one more Chord sheet for every other invited person, beside their own version", async () => {
    const { backend, songId, classic } = await amazingGrace();
    const her = await invitedReader(backend);
    const him = await invitedReader(backend, ben);
    await her.mutation(api.catalog.index.saveVersion, { from: classic.chordSheetId, layer: withFirstChord(classic, "D") });
    await him.mutation(api.catalog.index.saveVersion, { from: classic.chordSheetId, layer: withFirstChord(classic, "C") });
    const sheets = (await him.query(api.catalog.index.song, { songId }))!.sheets;
    expect(sheets.map((sheet) => sheet.name)).toEqual(["Classic", "Anna's version", "Ben's version"]);
  });

  test("with a chord that is no chord is refused, and nothing is stored", async () => {
    const { backend, songId, classic } = await amazingGrace();
    const her = await invitedReader(backend);
    await expect(her.mutation(api.catalog.index.saveVersion, { from: classic.chordSheetId, layer: withFirstChord(classic, "Xyz") })).rejects.toThrow(/INVALID_CHORDS/);
    expect(await sheetsOf(backend, songId)).toHaveLength(1);
  });

  test("with a chord past the words is refused", async () => {
    const { backend, classic } = await amazingGrace();
    const her = await invitedReader(backend);
    const pastTheWords = { ...layerOf(parse(classic.chordPro)), lines: [{ lyricLine: 0, chords: [{ word: 40, chord: "D" }] }] };
    await expect(her.mutation(api.catalog.index.saveVersion, { from: classic.chordSheetId, layer: pastTheWords })).rejects.toThrow(/INVALID_CHORDS/);
  });

  test("needs an invited sign-in, even while invites are off", async () => {
    const { backend, songId, classic } = await amazingGrace();
    await expect(backend.mutation(api.catalog.index.saveVersion, { from: classic.chordSheetId, layer: withFirstChord(classic, "D") })).rejects.toThrow(/SIGN_IN_REQUIRED/);
    expect(await sheetsOf(backend, songId)).toHaveLength(1);
  });
});
