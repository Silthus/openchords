import { v, type Infer } from "convex/values";
import { compose, InvalidChordLayer, layerOf, parse } from "../../src/sheet";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction, internalMutation, internalQuery, type QueryCtx } from "../_generated/server";
import { sourcesFor } from "../sources";

const outcome = v.union(
  v.literal("stored"),
  v.literal("already has verses"),
  v.literal("not from LRCLIB"),
  v.literal("no words from LRCLIB"),
  v.literal("words changed"),
  v.literal("fill running"),
  v.literal("sheet would change"),
);
type Outcome = Infer<typeof outcome>;

export const pending = internalQuery({
  args: {},
  returns: v.array(v.id("songs")),
  handler: async (ctx) => {
    const lyrics = await ctx.db.query("lyrics").collect();
    return lyrics.filter((words) => words.provenance.source === "lrclib" && words.verseStarts === undefined).map((words) => words.songId);
  },
});

export const refetch = internalAction({
  args: { songId: v.id("songs") },
  returns: outcome,
  handler: async (ctx, { songId }): Promise<Outcome> => {
    const stored = await ctx.runQuery(internal.catalog.verses.storedWords, { songId });
    if (!stored) return "not from LRCLIB";
    if (stored.lyrics.verseStarts !== undefined) return "already has verses";
    const fetched = await sourcesFor(process.env).lyricsFor(stored.song);
    if (fetched?.provenance.source !== "lrclib") return "no words from LRCLIB";
    return await ctx.runMutation(internal.catalog.verses.store, { songId, lines: fetched.lines, verseStarts: fetched.verseStarts ?? [] });
  },
});

export const storedWords = internalQuery({
  args: { songId: v.id("songs") },
  handler: async (ctx, { songId }): Promise<{ song: Doc<"songs">; lyrics: Doc<"lyrics"> } | null> => {
    const song = await ctx.db.get(songId);
    const lyrics = await lrclibWordsOf(ctx, songId);
    return song && lyrics ? { song, lyrics } : null;
  },
});

export const store = internalMutation({
  args: { songId: v.id("songs"), lines: v.array(v.string()), verseStarts: v.array(v.number()) },
  returns: outcome,
  handler: async (ctx, { songId, lines, verseStarts }) => {
    const song = await ctx.db.get(songId);
    const lyrics = await lrclibWordsOf(ctx, songId);
    if (!song || !lyrics) return "not from LRCLIB";
    if (lyrics.verseStarts !== undefined) return "already has verses";
    if (!sameWords(lyrics.lines, lines)) return "words changed";
    if (await fillIsRunning(ctx, songId)) return "fill running";
    const sheets = await ctx.db
      .query("chordSheets")
      .withIndex("by_song", (q) => q.eq("songId", songId))
      .collect();
    const recomposed = sheets.map((sheet) => ({ sheet, chordPro: withVerseBreaks(sheet, lyrics, song, verseStarts) }));
    if (recomposed.some(({ chordPro }) => chordPro === null)) return "sheet would change";
    for (const { sheet, chordPro } of recomposed) await ctx.db.patch(sheet._id, { chordPro: chordPro! });
    await ctx.db.patch(lyrics._id, { verseStarts });
    return "stored";
  },
});

function withVerseBreaks(sheet: Doc<"chordSheets">, lyrics: Doc<"lyrics">, song: Doc<"songs">, verseStarts: number[]) {
  try {
    const layer = layerOf(parse(sheet.chordPro));
    if (compose(lyrics.lines, layer, song) !== sheet.chordPro) return null;
    return compose(lyrics.lines, layer, song, verseStarts);
  } catch (error) {
    if (error instanceof InvalidChordLayer) return null;
    throw error;
  }
}

function sameWords(stored: string[], fetched: string[]) {
  return stored.length === fetched.length && stored.every((line, index) => line === fetched[index]);
}

async function fillIsRunning(ctx: QueryCtx, songId: Id<"songs">) {
  const fill = await ctx.db
    .query("fills")
    .withIndex("by_song", (q) => q.eq("songId", songId))
    .unique();
  return fill?.state === "running";
}

async function lrclibWordsOf(ctx: QueryCtx, songId: Id<"songs">) {
  const lyrics = await ctx.db
    .query("lyrics")
    .withIndex("by_song", (q) => q.eq("songId", songId))
    .unique();
  return lyrics?.provenance.source === "lrclib" ? lyrics : null;
}
