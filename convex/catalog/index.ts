import { RateLimiter, SECOND } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";
import { compose } from "../../src/sheet";
import { components, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { requireInvitedWhileInvitesOn } from "../access";
import { builtIns as builtInHits, identityKeyOf, SourceUnavailable, sourcesFor } from "../sources";
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
    await requireInvitedWhileInvitesOn(ctx);
    const songs = await ctx.db
      .query("songs")
      .withIndex("by_builtIn", (q) => q.gt("builtInId", ""))
      .collect();
    return songs.map(summaryOf);
  },
});

export const search = query({
  args: { query: v.string() },
  returns: v.array(v.object({ ...songSummary.fields, hasSheets: v.boolean() })),
  handler: async (ctx, args) => {
    await requireInvitedWhileInvitesOn(ctx);
    const query = searchable(args.query);
    if (!query) return [];
    const songs = await songsWithSheetsFirst(ctx, query);
    return await Promise.all(songs.map(async (song) => ({ ...summaryOf(song), hasSheets: await hasSheets(ctx, song._id) })));
  },
});

const searchLimit = 20;

async function songsWithSheetsFirst(ctx: QueryCtx, query: string) {
  const withSheets = await ctx.db
    .query("songs")
    .withSearchIndex("search", (q) => q.search("searchText", query).eq("hasSheets", true))
    .take(searchLimit);
  const all = await ctx.db
    .query("songs")
    .withSearchIndex("search", (q) => q.search("searchText", query))
    .take(searchLimit);
  const seen = new Set(withSheets.map((song) => song._id));
  return [...withSheets, ...all.filter((song) => !seen.has(song._id))].slice(0, searchLimit);
}

const rateLimiter = new RateLimiter(components.rateLimiter, {
  musicbrainz: { kind: "token bucket", rate: 1, period: SECOND, capacity: 1 },
});

export const discover = action({
  args: { query: v.string() },
  returns: v.object({ complete: v.boolean(), retryAt: v.optional(v.number()) }),
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.catalog.index.mayRead, {});
    const { findSongs } = sourcesFor(process.env);
    const query = searchable(args.query);
    if (!findSongs || !query) return { complete: true };
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "musicbrainz");
    if (!ok) return { complete: false, retryAt: Date.now() + retryAfter };
    try {
      await ctx.runMutation(internal.catalog.index.storeHits, { hits: await findSongs(query) });
      return { complete: true };
    } catch (error) {
      if (error instanceof SourceUnavailable) return { complete: false, retryAt: Date.now() + error.retryAfterMs };
      throw error;
    }
  },
});

export const mayRead = internalQuery({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireInvitedWhileInvitesOn(ctx);
    return null;
  },
});

export const storeHits = internalMutation({
  args: { hits: v.array(v.object({ title: v.string(), artist: v.string(), durationSec: v.optional(v.number()) })) },
  returns: v.null(),
  handler: async (ctx, { hits }) => {
    await keySongsStoredWithoutIdentity(ctx);
    for (const hit of hits) {
      const identityKey = identityKeyOf(hit);
      const known = await ctx.db
        .query("songs")
        .withIndex("by_identity", (q) => q.eq("identityKey", identityKey))
        .first();
      if (!known) await ctx.db.insert("songs", { ...hit, identityKey, searchText: `${hit.title} ${hit.artist}` });
    }
    return null;
  },
});

async function keySongsStoredWithoutIdentity(ctx: MutationCtx) {
  const unkeyed = await ctx.db
    .query("songs")
    .withIndex("by_identity", (q) => q.eq("identityKey", undefined))
    .collect();
  for (const song of unkeyed) await ctx.db.patch(song._id, { identityKey: identityKeyOf(song) });
}

function searchable(query: string) {
  const trimmed = query.trim();
  return trimmed.length >= 2 && trimmed.length <= 100 ? trimmed : null;
}

async function hasSheets(ctx: QueryCtx, songId: Id<"songs">) {
  const sheet = await ctx.db
    .query("chordSheets")
    .withIndex("by_song", (q) => q.eq("songId", songId))
    .first();
  return sheet !== null;
}

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
    await requireInvitedWhileInvitesOn(ctx);
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
    await requireInvitedWhileInvitesOn(ctx);
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
  const song = { ...hit, identityKey: identityKeyOf(hit), hasSheets: true, searchText: `${hit.title} ${hit.artist}` };
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
  const { lyricsFor, chordsFor } = sourcesFor(process.env);
  const lyrics = await lyricsFor(song);
  if (!lyrics) return;
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
