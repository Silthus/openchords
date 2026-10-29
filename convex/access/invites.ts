import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { emailKey, inviteFor } from "./invited";

export const add = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const email = emailKey(args.email);
    if (!(await inviteFor(ctx.db, email))) await ctx.db.insert("invites", { email });
    return null;
  },
});
