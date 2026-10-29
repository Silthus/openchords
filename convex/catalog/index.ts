import { ConvexError, v } from "convex/values";
import { compose } from "../../src/sheet";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "../_generated/server";
import { builtIns as builtInHits, chordsFor, lyricsFor } from "../sources";
import { origin } from "./schema";

export { catalogTables } from "./schema";

const songSummary = v.object({ songId: v.id("songs"), title: v.string(), artist: v.string() });

function summaryOf(song: Doc<"songs">) {
  return { songId: song._id, title: song.title, artist: song.artist };
}

export const builtIns = query({
  args: {},
  returns: v.array(songSummary),
  handler: async (ctx) => {
    const songs = await ctx.db
      .query("songs")
      .withIndex("by_builtIn", (q) => q.gt("builtInId", ""))
      .collect();
    return songs.map(summaryOf);
  },
});

export const search = query({
  args: { query: v.string() },
  returns: v.array(songSummary),
  handler: async (ctx, args) => {
    const query = args.query.trim();
    if (query.length < 2 || query.length > 100) return [];
    const songs = await ctx.db
      .query("songs")
      .withSearchIndex("search", (q) => q.search("searchText", query))
      .take(20);
    return songs.map(summaryOf);
  },
});

export const song = query({
  args: { songId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      song: songSummary,
      sheets: v.array(v.object({ chordSheetId: v.id("chordSheets"), name: v.string(), origin, chordPro: v.string() })),
    }),
  ),
  handler: async (ctx, args) => {
    const songId = ctx.db.normalizeId("songs", args.songId);
    const song = songId && (await ctx.db.get(songId));
    if (!song) return null;
    const sheets = await ctx.db
      .query("chordSheets")
      .withIndex("by_song", (q) => q.eq("songId", song._id))
      .collect();
    return {
      song: summaryOf(song),
      sheets: sheets.map((sheet) => ({ chordSheetId: sheet._id, name: sheet.name, origin: sheet.origin, chordPro: sheet.chordPro })),
    };
  },
});

export const open = mutation({
  args: { songId: v.id("songs") },
  returns: v.null(),
  handler: async (ctx, { songId }) => {
    await openSong(ctx, songId);
    return null;
  },
});

export const seed = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    for (const hit of builtInHits) await openSong(ctx, await storeBuiltIn(ctx, hit));
    return null;
  },
});

async function storeBuiltIn(ctx: MutationCtx, hit: (typeof builtInHits)[number]) {
  const song = { ...hit, searchText: `${hit.title} ${hit.artist}` };
  const existing = await ctx.db
    .query("songs")
    .withIndex("by_builtIn", (q) => q.eq("builtInId", hit.builtInId))
    .unique();
  if (!existing) return await ctx.db.insert("songs", song);
  await ctx.db.patch(existing._id, song);
  return existing._id;
}

async function openSong(ctx: MutationCtx, songId: Id<"songs">) {
  const song = await ctx.db.get(songId);
  if (!song) throw new ConvexError({ code: "NOT_FOUND" });
  const fill = await ctx.db
    .query("fills")
    .withIndex("by_song", (q) => q.eq("songId", songId))
    .unique();
  if (!fill) await fillSong(ctx, song);
}

async function fillSong(ctx: MutationCtx, song: Doc<"songs">) {
  const lyrics = await lyricsFor(song);
  if (!lyrics) {
    await ctx.db.insert("fills", { songId: song._id, state: "done", lyrics: "missing", chords: "none" });
    return;
  }
  const lyricsId = await ctx.db.insert("lyrics", { songId: song._id, ...lyrics });
  const drafts = await chordsFor(song, lyrics);
  for (const draft of drafts) {
    await ctx.db.insert("chordSheets", {
      songId: song._id,
      name: draft.name,
      origin: draft.origin,
      chordPro: compose(lyrics.lines, draft.layer, song),
      lyricsId,
      provenance: draft.provenance,
    });
  }
  await ctx.db.insert("fills", { songId: song._id, state: "done", lyrics: "ready", chords: drafts.length > 0 ? "ready" : "none" });
}
