import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
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
    await deleteWordsAndChordsOf(ctx, stored._id);
    await ctx.db.patch(stored._id, { hasSheets: false });
    return null;
  },
});
