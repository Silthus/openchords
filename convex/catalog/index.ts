import { RateLimiter, SECOND } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { compose, InvalidChordLayer } from "../../src/sheet";
import { requireInvited, requireInvitedWhileInvitesOn } from "../access";
import { builtIns as builtInHits, identityKeyOf, SourceUnavailable, sourcesFor, wordsOf } from "../sources";
import { startFill } from "./fill";
import { chordLayer, origin } from "./schema";

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
    return songs.filter((song) => song.takenDownAt === undefined).map(summaryOf);
  },
});

export const summaries = query({
  args: { songIds: v.array(v.id("songs")) },
  returns: v.array(songSummary),
  handler: async (ctx, { songIds }) => {
    await requireInvitedWhileInvitesOn(ctx);
    const songs = await Promise.all(songIds.map((songId) => ctx.db.get(songId)));
    return songs.filter((song): song is Doc<"songs"> => song !== null && song.takenDownAt === undefined).map(summaryOf);
  },
});

export const search = query({
  args: { query: v.string() },
  returns: v.array(v.object({ ...songSummary.fields, hasSheets: v.boolean() })),
  handler: async (ctx, args) => {
    await requireInvitedWhileInvitesOn(ctx);
    const query = searchable(args.query);
    if (!query) return [];
    await answerAgainWhenSongsArrive(ctx);
    const songs = await rankedSongs(ctx, query);
    return await Promise.all(songs.map(async (song) => ({ ...summaryOf(song), hasSheets: await hasSheets(ctx, song._id) })));
  },
});

async function answerAgainWhenSongsArrive(ctx: QueryCtx) {
  await ctx.db.query("songs").order("desc").first();
}

const searchLimit = 20;
const candidateLimit = 100;

async function rankedSongs(ctx: QueryCtx, query: string) {
  const songs = await songsWithSheetsFirst(ctx, query);
  const words = wordsOf(query);
  return songs
    .map((song) => ({ song, rank: rankOf(song, words) }))
    .sort((a, b) => byRank(a.rank, b.rank))
    .slice(0, searchLimit)
    .map(({ song }) => song);
}

type Rank = { namesArtistAndTitle: boolean; namesEveryWord: boolean; isBuiltIn: boolean; titledAsTyped: boolean; takes: number };

function rankOf(song: Doc<"songs">, words: string[]): Rank {
  const placed = words.map((word) => ({ word, inTitle: startsAWordOf(song.title, word), inArtist: startsAWordOf(song.artist, word) }));
  return {
    namesArtistAndTitle: namesArtistAndTitle(placed),
    namesEveryWord: namesEveryWord(placed),
    isBuiltIn: song.builtInId !== undefined,
    titledAsTyped: titledAsTyped(song, placed),
    takes: song.takes ?? 0,
  };
}

function byRank(a: Rank, b: Rank) {
  return (
    Number(b.namesArtistAndTitle) - Number(a.namesArtistAndTitle) ||
    Number(b.namesEveryWord) - Number(a.namesEveryWord) ||
    Number(b.isBuiltIn) - Number(a.isBuiltIn) ||
    Number(b.titledAsTyped) - Number(a.titledAsTyped) ||
    b.takes - a.takes
  );
}

async function songsWithSheetsFirst(ctx: QueryCtx, query: string) {
  const withSheets = await ctx.db
    .query("songs")
    .withSearchIndex("search", (q) => q.search("searchText", query).eq("hasSheets", true))
    .take(searchLimit);
  const all = await ctx.db
    .query("songs")
    .withSearchIndex("search", (q) => q.search("searchText", query))
    .take(candidateLimit);
  const seen = new Set(withSheets.map((song) => song._id));
  return [...withSheets, ...all.filter((song) => !seen.has(song._id))];
}

type PlacedWord = { word: string; inTitle: boolean; inArtist: boolean };

function namesArtistAndTitle(placed: PlacedWord[]) {
  return (
    namesEveryWord(placed) &&
    placed.some(({ inTitle, inArtist }) => inTitle && !inArtist) &&
    placed.some(({ inTitle, inArtist }) => inArtist && !inTitle)
  );
}

function namesEveryWord(placed: PlacedWord[]) {
  return placed.every(({ inTitle, inArtist }) => inTitle || inArtist);
}

function titledAsTyped(song: Doc<"songs">, placed: PlacedWord[]) {
  const titleWords = wordsOf(song.title);
  return placed.some((_, start) => {
    const typedTitle = placed.slice(start, start + titleWords.length);
    const typedRest = [...placed.slice(0, start), ...placed.slice(start + titleWords.length)];
    return (
      typedTitle.length === titleWords.length &&
      typedTitle.every(({ word }, at) => word === titleWords[at]) &&
      typedRest.every(({ inArtist }) => inArtist)
    );
  });
}

function startsAWordOf(text: string, word: string) {
  return wordsOf(text).some((textWord) => textWord.startsWith(word));
}

const rateLimiter = new RateLimiter(components.rateLimiter, {
  musicbrainz: { kind: "token bucket", rate: 1, period: SECOND, capacity: 1 },
});

export const discover = action({
  args: { query: v.string() },
  returns: v.object({ complete: v.boolean(), found: v.optional(v.number()), retryAt: v.optional(v.number()) }),
  handler: async (ctx, args): Promise<{ complete: boolean; found?: number; retryAt?: number }> => {
    await ctx.runQuery(internal.catalog.index.mayRead, {});
    const { findSongs } = sourcesFor(process.env);
    const query = searchable(args.query);
    if (!findSongs || !query) return { complete: true, found: 0 };
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "musicbrainz");
    if (!ok) return { complete: false, retryAt: Date.now() + retryAfter };
    try {
      await ctx.runMutation(internal.catalog.index.storeHits, { hits: await findSongs(query) });
      return { complete: true, found: await ctx.runQuery(internal.catalog.index.listedFor, { query }) };
    } catch (error) {
      if (error instanceof SourceUnavailable) return { complete: false, retryAt: Date.now() + error.retryAfterMs };
      throw error;
    }
  },
});

export const listedFor = internalQuery({
  args: { query: v.string() },
  returns: v.number(),
  handler: async (ctx, { query }) => (await rankedSongs(ctx, query)).length,
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
  args: { hits: v.array(v.object({ title: v.string(), artist: v.string(), durationSec: v.optional(v.number()), takes: v.optional(v.number()) })) },
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
      else if ((hit.takes ?? 0) > (known.takes ?? 0)) await ctx.db.patch(known._id, { takes: hit.takes });
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
      sheets: v.array(v.object({ chordSheetId: v.id("chordSheets"), name: v.string(), origin, chordPro: v.string(), replaces: v.array(v.id("chordSheets")) })),
      lyrics: v.union(v.literal("pending"), v.literal("ready"), v.literal("missing"), v.literal("unreachable")),
      wordsOnly: v.union(v.null(), v.array(v.string())),
      writingChords: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireInvitedWhileInvitesOn(ctx);
    const songId = ctx.db.normalizeId("songs", args.songId);
    const song = songId && (await ctx.db.get(songId));
    if (!song) return null;
    const stored = await ctx.db
      .query("chordSheets")
      .withIndex("by_song", (q) => q.eq("songId", song._id))
      .collect();
    const sheets = newestVersionOfEachPerson(stored);
    const fill = await ctx.db
      .query("fills")
      .withIndex("by_song", (q) => q.eq("songId", song._id))
      .unique();
    const lyrics = lyricsStateOf(song, fill);
    return {
      song: summaryOf(song),
      sheets: sheets.map((sheet) => ({ chordSheetId: sheet._id, name: sheet.name, origin: sheet.origin, chordPro: sheet.chordPro, replaces: olderVersionsOf(sheet, stored) })),
      lyrics,
      wordsOnly: lyrics === "ready" && sheets.length === 0 ? await linesOf(ctx, song) : null,
      writingChords: fill?.state === "running" && fill.lyrics === "ready" && fill.chords === "pending",
    };
  },
});

function newestVersionOfEachPerson(sheets: Doc<"chordSheets">[]) {
  const newest = new Map(sheets.filter(isPersonVersion).map((sheet) => [sheet.provenance.recordId, sheet._id]));
  return sheets.filter((sheet) => !isPersonVersion(sheet) || newest.get(sheet.provenance.recordId) === sheet._id);
}

function olderVersionsOf(newest: Doc<"chordSheets">, stored: Doc<"chordSheets">[]) {
  if (!isPersonVersion(newest)) return [];
  return stored.filter((sheet) => isPersonVersion(sheet) && sheet.provenance.recordId === newest.provenance.recordId && sheet._id !== newest._id).map((sheet) => sheet._id);
}

function isPersonVersion(sheet: Doc<"chordSheets">) {
  return sheet.origin === "person";
}

export const saveVersion = mutation({
  args: { from: v.id("chordSheets"), layer: chordLayer },
  returns: v.id("chordSheets"),
  handler: async (ctx, { from, layer }) => {
    const { userId, firstName } = await requireInvited(ctx);
    const fixed = await ctx.db.get(from);
    const song = fixed && (await ctx.db.get(fixed.songId));
    const lyrics = fixed && (await ctx.db.get(fixed.lyricsId));
    if (!fixed || !song || !lyrics) throw new ConvexError({ code: "NOT_FOUND" });
    return await ctx.db.insert("chordSheets", {
      songId: song._id,
      name: `${firstName}'s version`,
      origin: "person",
      chordPro: playable(() => compose(lyrics.lines, layer, song, lyrics.verseStarts)),
      lyricsId: lyrics._id,
      provenance: { source: "person", recordId: userId, licence: "contributed", fetchedAt: Date.now() },
    });
  },
});

function playable(composed: () => string) {
  try {
    return composed();
  } catch (error) {
    if (error instanceof InvalidChordLayer) throw new ConvexError({ code: "INVALID_CHORDS", reason: error.message });
    throw error;
  }
}

function lyricsStateOf(song: Doc<"songs">, fill: Doc<"fills"> | null): Doc<"fills">["lyrics"] | "unreachable" {
  if (song.takenDownAt !== undefined) return "missing";
  if (!fill) return "pending";
  return fill.state === "failed" && fill.lyrics === "pending" ? "unreachable" : fill.lyrics;
}

async function linesOf(ctx: QueryCtx, song: Doc<"songs">) {
  const lyrics = await ctx.db
    .query("lyrics")
    .withIndex("by_song", (q) => q.eq("songId", song._id))
    .unique();
  return lyrics ? withVerseBreaks(lyrics) : null;
}

function withVerseBreaks({ lines, verseStarts = [] }: Doc<"lyrics">) {
  return lines.flatMap((line, index) => (verseStarts.includes(index) ? ["", line] : [line]));
}

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
  if (existing.takenDownAt === undefined) await ctx.db.patch(existing._id, song);
  return existing._id;
}

async function openSong(ctx: MutationCtx, songId: Id<"songs">) {
  const song = await ctx.db.get(songId);
  if (!song) throw new ConvexError({ code: "NOT_FOUND" });
  await startFill(ctx, song);
}
