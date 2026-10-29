import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { createAccount } from "@convex-dev/auth/server";
import type { DataModel } from "../_generated/dataModel";

const testDomain = "@test.openchords.invalid";

export function testSignInAllowed() {
  return process.env.OPENCHORDS_ALLOW_TEST_SIGNIN === "1";
}

export function isTestEmail(email: string) {
  return email.endsWith(testDomain);
}

export function testUserProviders() {
  if (!testSignInAllowed()) return [];
  if (process.env.OPENCHORDS_ENV === "production") throw new Error("Test sign-in must never be allowed on production.");
  return [TestUser];
}

const TestUser = ConvexCredentials<DataModel>({
  id: "test-user",
  authorize: async (params, ctx) => {
    const email = String(params.email);
    if (!isTestEmail(email)) return null;
    const { user } = await createAccount<DataModel>(ctx, {
      provider: "test-user",
      account: { id: email },
      profile: { email, name: "Test User" },
    });
    return { userId: user._id };
  },
});
