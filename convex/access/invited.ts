import { ConvexError } from "convex/values";
import type { DatabaseReader } from "../_generated/server";
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
