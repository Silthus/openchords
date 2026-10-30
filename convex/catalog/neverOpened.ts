import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type QueryCtx } from "../_generated/server";
import { identityKeyOf } from "../sources";
import { deleteWordsAndChordsOf } from "./takedown";

export const reset = internalMutation({
  args: { title: v.string(), artist: v.string() },
  returns: v.null(),
  handler: async (ctx, song) => {
    if (process.env.OPENCHORDS_ENV === "production") throw new Error("Putting a Song back to never opened is for walks on dev, never on production.");
    const stored = await ctx.db
      .query("songs")
      .withIndex("by_identity", (q) => q.eq("identityKey", identityKeyOf(song)))
      .first();
    if (!stored) return null;
    if (await isBeingFilled(ctx, stored._id)) throw new Error(`${song.title} is still being filled. Run the walk again once its chords are written.`);
    await deleteWordsAndChordsOf(ctx, stored._id);
    await ctx.db.patch(stored._id, { hasSheets: false });
    return null;
  },
});

async function isBeingFilled(ctx: QueryCtx, songId: Id<"songs">) {
  const fill = await ctx.db
    .query("fills")
    .withIndex("by_song", (q) => q.eq("songId", songId))
    .unique();
  return fill?.state === "running";
}
