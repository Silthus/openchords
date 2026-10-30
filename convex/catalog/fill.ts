import { v } from "convex/values";
import { compose } from "../../src/sheet";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, internalMutation, internalQuery, type MutationCtx } from "../_generated/server";
import { sourcesFor } from "../sources";
import { origin, provenance } from "./schema";

export async function startFill(ctx: MutationCtx, songId: Id<"songs">) {
  const fill = await ctx.db
    .query("fills")
    .withIndex("by_song", (q) => q.eq("songId", songId))
    .unique();
  if (fill) return;
  await ctx.db.insert("fills", { songId, state: "running", lyrics: "pending", chords: "pending" });
  await ctx.scheduler.runAfter(0, internal.catalog.fill.run, { songId });
}

export const run = internalAction({
  args: { songId: v.id("songs") },
  returns: v.null(),
  handler: async (ctx, { songId }) => {
    const song = await ctx.runQuery(internal.catalog.fill.songToFill, { songId });
    if (!song) return null;
    const { lyricsFor, chordsFor } = sourcesFor(process.env);
    const lyrics = await lyricsFor(song);
    if (!lyrics) {
      await ctx.runMutation(internal.catalog.fill.noLyrics, { songId });
      return null;
    }
    const lyricsId = await ctx.runMutation(internal.catalog.fill.storeLyrics, { songId, ...lyrics });
    const drafts = await chordsFor(song, lyrics);
    const sheets = drafts.map(({ name, origin, provenance, layer }) => ({ name, origin, provenance, chordPro: compose(lyrics.lines, layer, song) }));
    await ctx.runMutation(internal.catalog.fill.storeChordSheets, { songId, lyricsId, sheets });
    return null;
  },
});

export const songToFill = internalQuery({
  args: { songId: v.id("songs") },
  handler: async (ctx, { songId }) => await ctx.db.get(songId),
});

export const noLyrics = internalMutation({
  args: { songId: v.id("songs") },
  returns: v.null(),
  handler: async (ctx, { songId }) => {
    await patchFill(ctx, songId, { state: "done", lyrics: "missing", chords: "none" });
    return null;
  },
});

export const storeLyrics = internalMutation({
  args: { songId: v.id("songs"), lines: v.array(v.string()), provenance },
  returns: v.id("lyrics"),
  handler: async (ctx, lyrics) => {
    await patchFill(ctx, lyrics.songId, { lyrics: "ready" });
    return await ctx.db.insert("lyrics", lyrics);
  },
});

export const storeChordSheets = internalMutation({
  args: {
    songId: v.id("songs"),
    lyricsId: v.id("lyrics"),
    sheets: v.array(v.object({ name: v.string(), origin, provenance, chordPro: v.string() })),
  },
  returns: v.null(),
  handler: async (ctx, { songId, lyricsId, sheets }) => {
    for (const sheet of sheets) await ctx.db.insert("chordSheets", { songId, lyricsId, ...sheet });
    await patchFill(ctx, songId, { state: "done", chords: sheets.length > 0 ? "ready" : "none" });
    return null;
  },
});

async function patchFill(ctx: MutationCtx, songId: Id<"songs">, changes: Partial<{ state: "done"; lyrics: "ready" | "missing"; chords: "ready" | "none" }>) {
  const fill = await ctx.db
    .query("fills")
    .withIndex("by_song", (q) => q.eq("songId", songId))
    .unique();
  if (fill) await ctx.db.patch(fill._id, changes);
}
