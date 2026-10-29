import { ConvexError } from "convex/values";
import type { DatabaseReader } from "../_generated/server";

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
  const invited = profile.emailVerified === true && profile.email !== undefined && (await inviteFor(db, profile.email));
  if (!invited) throw new ConvexError({ code: "NOT_INVITED" });
}
