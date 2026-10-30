import { ActionRetrier, runIdValidator, runResultValidator } from "@convex-dev/action-retrier";
import { v } from "convex/values";
import { compose } from "../../src/sheet";
import { components, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction, internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "../_generated/server";
import { sourcesFor } from "../sources";
import { origin, provenance } from "./schema";

const threeAttemptsAboutOneAndFourSecondsApart = { initialBackoffMs: 250, base: 4, maxFailures: 2 };
const retryAfterFailureMs = 60 * 60 * 1000;

export async function startFill(ctx: MutationCtx, song: Doc<"songs">) {
  if (song.takenDownAt !== undefined) return;
  const songId = song._id;
  const fill = await fillOf(ctx, songId);
  if (fill && !mayRetry(fill) && !mayDraftChords(fill)) return;
  const retrier = new ActionRetrier(components.actionRetrier, threeAttemptsAboutOneAndFourSecondsApart);
  const runId = await retrier.run(ctx, internal.catalog.fill.run, { songId }, { onComplete: internal.catalog.fill.finished });
  if (fill) await ctx.db.patch(fill._id, { state: "running", chords: "pending", retryAt: undefined, error: undefined, runId });
  else await ctx.db.insert("fills", { songId, state: "running", lyrics: "pending", chords: "pending", runId });
}

function mayRetry(fill: Doc<"fills">) {
  const failedLongEnoughAgo = fill.state === "failed" && Date.now() >= (fill.retryAt ?? 0);
  const leftRunningByAnEarlierVersion = fill.state === "running" && fill.runId === undefined;
  return failedLongEnoughAgo || leftRunningByAnEarlierVersion;
}

function mayDraftChords(fill: Doc<"fills">) {
  if (fill.state !== "done" || fill.lyrics !== "ready" || fill.chords !== "none") return false;
  const asked = fill.chordSourcesAsked ?? ["builtIn"];
  return sourcesFor(process.env).chordSources.some((source) => !asked.includes(source));
}

export const run = internalAction({
  args: { songId: v.id("songs") },
  returns: v.null(),
  handler: async (ctx, { songId }) => {
    const toFill = await ctx.runQuery(internal.catalog.fill.songToFill, { songId });
    if (!toFill) return null;
    const { song, storedLyrics } = toFill;
    const { lyricsFor, chordsFor, chordSources } = sourcesFor(process.env);
    const lyrics = storedLyrics ?? (await lyricsFor(song));
    if (!lyrics) {
      await ctx.runMutation(internal.catalog.fill.noLyrics, { songId });
      return null;
    }
    const lyricsId = storedLyrics?._id ?? (await ctx.runMutation(internal.catalog.fill.storeLyrics, { songId, ...lyrics }));
    const drafts = await chordsFor(song, lyrics);
    const sheets = drafts.map(({ name, origin, provenance, layer }) => ({ name, origin, provenance, chordPro: compose(lyrics.lines, layer, song, lyrics.verseStarts) }));
    await ctx.runMutation(internal.catalog.fill.storeChordSheets, { songId, lyricsId, sheets, chordSourcesAsked: chordSources });
    return null;
  },
});

export const songToFill = internalQuery({
  args: { songId: v.id("songs") },
  handler: async (ctx, { songId }): Promise<{ song: Doc<"songs">; storedLyrics: Doc<"lyrics"> | null } | null> => {
    const song = await ctx.db.get(songId);
    if (!song || song.takenDownAt !== undefined || !(await fillOf(ctx, songId))) return null;
    const storedLyrics = await lyricsOf(ctx, songId);
    return { song, storedLyrics };
  },
});

export const finished = internalMutation({
  args: { runId: runIdValidator, result: runResultValidator },
  returns: v.null(),
  handler: async (ctx, { runId, result }) => {
    if (result.type === "success") return null;
    const fill = await ctx.db
      .query("fills")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .unique();
    const error = result.type === "failed" ? result.error : "canceled";
    if (fill) await ctx.db.patch(fill._id, { state: "failed", retryAt: Date.now() + retryAfterFailureMs, error });
    return null;
  },
});

export const noLyrics = internalMutation({
  args: { songId: v.id("songs") },
  returns: v.null(),
  handler: async (ctx, { songId }) => {
    if (await lyricsOf(ctx, songId)) return null;
    await patchFill(ctx, songId, { state: "done", lyrics: "missing", chords: "none" });
    return null;
  },
});

export const storeLyrics = internalMutation({
  args: { songId: v.id("songs"), lines: v.array(v.string()), verseStarts: v.optional(v.array(v.number())), provenance },
  returns: v.id("lyrics"),
  handler: async (ctx, lyrics) => {
    await patchFill(ctx, lyrics.songId, { lyrics: "ready" });
    const stored = await lyricsOf(ctx, lyrics.songId);
    return stored?._id ?? (await ctx.db.insert("lyrics", lyrics));
  },
});

export const storeChordSheets = internalMutation({
  args: {
    songId: v.id("songs"),
    lyricsId: v.id("lyrics"),
    sheets: v.array(v.object({ name: v.string(), origin, provenance, chordPro: v.string() })),
    chordSourcesAsked: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { songId, lyricsId, sheets, chordSourcesAsked }) => {
    const stored = await ctx.db
      .query("chordSheets")
      .withIndex("by_song", (q) => q.eq("songId", songId))
      .first();
    if (!stored) for (const sheet of sheets) await ctx.db.insert("chordSheets", { songId, lyricsId, ...sheet });
    if (sheets.length > 0) await ctx.db.patch(songId, { hasSheets: true });
    await patchFill(ctx, songId, { state: "done", chords: sheets.length > 0 ? "ready" : "none", chordSourcesAsked });
    return null;
  },
});

async function patchFill(ctx: MutationCtx, songId: Id<"songs">, changes: Partial<{ state: "done"; lyrics: "ready" | "missing"; chords: "ready" | "none"; chordSourcesAsked: string[] }>) {
  const fill = await fillOf(ctx, songId);
  if (!fill) throw new Error(`The fill of Song ${songId} is gone, so the Song was taken down while it ran`);
  await ctx.db.patch(fill._id, changes);
}

async function fillOf(ctx: QueryCtx, songId: Id<"songs">) {
  return await ctx.db
    .query("fills")
    .withIndex("by_song", (q) => q.eq("songId", songId))
    .unique();
}

async function lyricsOf(ctx: QueryCtx, songId: Id<"songs">) {
  return await ctx.db
    .query("lyrics")
    .withIndex("by_song", (q) => q.eq("songId", songId))
    .unique();
}
