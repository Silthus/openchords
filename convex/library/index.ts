import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireInvited } from "../access";
import { choices } from "./schema";

export { libraryTables } from "./schema";

const libraryEntry = v.object({ songId: v.id("songs"), ...choices, updatedAt: v.number() });

export const entries = query({
  args: {},
  returns: v.array(libraryEntry),
  handler: async (ctx) => {
    const { userId } = await requireInvited(ctx);
    const stored = await ctx.db
      .query("libraryEntries")
      .withIndex("by_user_song", (q) => q.eq("userId", userId))
      .collect();
    return stored.map(({ songId, chordSheetId, transpose, capos, speed, saved, updatedAt }) => ({ songId, chordSheetId, transpose, capos, speed, saved, updatedAt }));
  },
});

export const save = mutation({
  args: { songId: v.id("songs"), ...choices },
  returns: v.null(),
  handler: async (ctx, { songId, ...chosen }) => {
    const { userId } = await requireInvited(ctx);
    const entry = { ...chosen, updatedAt: Date.now() };
    const stored = await ctx.db
      .query("libraryEntries")
      .withIndex("by_user_song", (q) => q.eq("userId", userId).eq("songId", songId))
      .unique();
    if (stored) await ctx.db.patch(stored._id, entry);
    else await ctx.db.insert("libraryEntries", { userId, songId, ...entry });
    return null;
  },
});

