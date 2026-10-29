import { defineTable } from "convex/server";
import { v } from "convex/values";

export const provenance = v.object({
  source: v.literal("builtIn"),
  recordId: v.string(),
  licence: v.string(),
  fetchedAt: v.number(),
});

export const origin = v.literal("builtIn");

export const catalogTables = {
  songs: defineTable({
    title: v.string(),
    artist: v.string(),
    builtInId: v.optional(v.string()),
    searchText: v.optional(v.string()),
  })
    .index("by_builtIn", ["builtInId"])
    .searchIndex("search", { searchField: "searchText" }),

  lyrics: defineTable({
    songId: v.id("songs"),
    lines: v.array(v.string()),
    provenance,
  }).index("by_song", ["songId"]),

  chordSheets: defineTable({
    songId: v.id("songs"),
    name: v.string(),
    origin,
    chordPro: v.string(),
    lyricsId: v.id("lyrics"),
    provenance,
  }).index("by_song", ["songId"]),

  fills: defineTable({
    songId: v.id("songs"),
    state: v.union(v.literal("running"), v.literal("done"), v.literal("failed")),
    lyrics: v.union(v.literal("pending"), v.literal("ready"), v.literal("missing")),
    chords: v.union(v.literal("pending"), v.literal("ready"), v.literal("none")),
    retryAt: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_song", ["songId"]),
};
