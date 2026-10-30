import { defineTable } from "convex/server";
import { v } from "convex/values";

export const choices = {
  chordSheetId: v.id("chordSheets"),
  transpose: v.number(),
  capo: v.number(),
  speed: v.number(),
  saved: v.boolean(),
};

export const libraryTables = {
  libraryEntries: defineTable({ userId: v.id("users"), songId: v.id("songs"), ...choices, updatedAt: v.number() }).index("by_user_song", ["userId", "songId"]),
};
