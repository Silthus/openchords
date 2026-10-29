import { authTables } from "@convex-dev/auth/server";
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const accessTables = {
  ...authTables,
  invites: defineTable({ email: v.string() }).index("by_email", ["email"]),
};
