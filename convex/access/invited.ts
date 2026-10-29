import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { DatabaseReader, QueryCtx } from "../_generated/server";
import { isTestEmail, testSignInAllowed } from "./testUser";

export function emailKey(email: string) {
  return email.trim().toLowerCase();
}

export async function inviteFor(db: DatabaseReader, email: string) {
  return await db
    .query("invites")
    .withIndex("by_email", (q) => q.eq("email", emailKey(email)))
    .unique();
}

type SignInProfile = { email?: string; emailVerified?: boolean };

export async function refuseUninvited(db: DatabaseReader, profile: SignInProfile) {
  if (!(await mayEnter(db, profile))) throw new ConvexError({ code: "NOT_INVITED" });
}

async function mayEnter(db: DatabaseReader, { email, emailVerified }: SignInProfile) {
  if (email === undefined) return false;
  if (isTestEmail(email)) return testSignInAllowed();
  return emailVerified === true && (await inviteFor(db, email)) !== null;
}

export async function requireInvited(ctx: QueryCtx): Promise<{ userId: Id<"users">; firstName: string }> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError({ code: "SIGN_IN_REQUIRED" });
  const user = await ctx.db.get(userId);
  const profile = { email: user?.email, emailVerified: user?.emailVerificationTime !== undefined };
  if (!user || !(await mayEnter(ctx.db, profile))) throw new ConvexError({ code: "NOT_INVITED" });
  return { userId, firstName: firstNameOf(user.name) };
}

export async function requireInvitedWhileInvitesOn(ctx: QueryCtx) {
  if (process.env.OPENCHORDS_INVITES === "on") await requireInvited(ctx);
}

function firstNameOf(name: string | undefined) {
  return name?.split(" ")[0] ?? "";
}
