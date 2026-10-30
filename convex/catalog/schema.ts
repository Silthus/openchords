import { defineTable } from "convex/server";
import { v } from "convex/values";

export const provenance = v.object({
  source: v.union(v.literal("builtIn"), v.literal("lrclib"), v.literal("ai")),
  recordId: v.string(),
  licence: v.string(),
  fetchedAt: v.number(),
});

const chordSheetProvenance = v.object({ ...provenance.fields, source: v.union(provenance.fields.source, v.literal("person")) });

export const origin = v.union(v.literal("builtIn"), v.literal("ai"), v.literal("person"));

export const chordLayer = v.object({
  notation: v.optional(v.literal("german")),
  key: v.optional(v.string()),
  capo: v.number(),
  sections: v.array(v.object({ label: v.string(), fromLine: v.number() })),
  lines: v.array(v.object({ lyricLine: v.number(), chords: v.array(v.object({ word: v.number(), chord: v.string() })) })),
});

export const catalogTables = {
  songs: defineTable({
    title: v.string(),
    artist: v.string(),
    durationSec: v.optional(v.number()),
    takes: v.optional(v.number()),
    identityKey: v.optional(v.string()),
    builtInId: v.optional(v.string()),
    hasSheets: v.optional(v.boolean()),
    takenDownAt: v.optional(v.number()),
    searchText: v.string(),
  })
    .index("by_identity", ["identityKey"])
    .index("by_builtIn", ["builtInId"])
    .searchIndex("search", { searchField: "searchText", filterFields: ["hasSheets"] }),

  lyrics: defineTable({
    songId: v.id("songs"),
    lines: v.array(v.string()),
    verseStarts: v.optional(v.array(v.number())),
    provenance,
  }).index("by_song", ["songId"]),

  chordSheets: defineTable({
    songId: v.id("songs"),
    name: v.string(),
    origin,
    chordPro: v.string(),
    lyricsId: v.id("lyrics"),
    provenance: chordSheetProvenance,
  }).index("by_song", ["songId"]),

  fills: defineTable({
    songId: v.id("songs"),
    state: v.union(v.literal("running"), v.literal("done"), v.literal("failed")),
    lyrics: v.union(v.literal("pending"), v.literal("ready"), v.literal("missing")),
    chords: v.union(v.literal("pending"), v.literal("ready"), v.literal("none")),
    retryAt: v.optional(v.number()),
    error: v.optional(v.string()),
    runId: v.optional(v.string()),
    chordSourcesAsked: v.optional(v.array(v.string())),
    draftRetried: v.optional(v.boolean()),
  })
    .index("by_song", ["songId"])
    .index("by_run", ["runId"]),
};
