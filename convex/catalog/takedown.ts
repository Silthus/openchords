import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";

export const song = internalMutation({
  args: { songId: v.id("songs") },
  returns: v.null(),
  handler: async (ctx, { songId }) => {
    await deleteWordsAndChordsOf(ctx, songId);
    await ctx.db.patch(songId, { takenDownAt: Date.now(), hasSheets: false, searchText: "" });
    return null;
  },
});

export async function deleteWordsAndChordsOf(ctx: MutationCtx, songId: Id<"songs">) {
  await deleteAllOf(ctx, "lyrics", songId);
  await deleteAllOf(ctx, "chordSheets", songId);
  await deleteAllOf(ctx, "fills", songId);
}

async function deleteAllOf(ctx: MutationCtx, table: "lyrics" | "chordSheets" | "fills", songId: Id<"songs">) {
  const rows = await ctx.db
    .query(table)
    .withIndex("by_song", (q) => q.eq("songId", songId))
    .collect();
  for (const row of rows) await ctx.db.delete(row._id);
}
