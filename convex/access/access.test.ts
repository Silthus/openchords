import { describe, expect, test } from "bun:test";
import { internal } from "../_generated/api";
import { testBackend } from "../testing.helper";
import { profileFromGoogle, type GoogleClaims } from "./google";

type Backend = ReturnType<typeof testBackend>;

async function returnFromGoogle(backend: Backend, claims: Pick<GoogleClaims, "email" | "email_verified">) {
  const { id, ...profile } = profileFromGoogle({ sub: `google-${claims.email}`, name: "Anna Berg", picture: "", ...claims });
  const signature = crypto.randomUUID();
  const verifier = await backend.run((ctx) => ctx.db.insert("authVerifiers", { signature }));
  const code = await backend.mutation(internal.auth.store, {
    args: { type: "userOAuth", provider: "google", providerAccountId: id, profile, signature },
  });
  return await backend.mutation(internal.auth.store, {
    args: { type: "verifyCodeAndSignIn", params: { code }, verifier, generateTokens: false, allowExtraProviders: false },
  });
}

async function sessions(backend: Backend) {
  return await backend.run((ctx) => ctx.db.query("authSessions").collect());
}

async function invite(backend: Backend, email: string) {
  await backend.mutation(internal.access.invites.add, { email });
}

describe("signing in with Google", () => {
  test("an invited email gets a session", async () => {
    const backend = testBackend();
    await invite(backend, "anna@example.com");
    await returnFromGoogle(backend, { email: "anna@example.com", email_verified: true });
    expect(await sessions(backend)).toHaveLength(1);
  });

  test("an uninvited email gets no session and leaves no account behind", async () => {
    const backend = testBackend();
    await invite(backend, "anna@example.com");
    await expect(returnFromGoogle(backend, { email: "stranger@example.com", email_verified: true })).rejects.toThrow();
    expect(await sessions(backend)).toHaveLength(0);
    expect(await backend.run((ctx) => ctx.db.query("users").collect())).toHaveLength(0);
  });

  test("a returning email whose invite was deleted gets no new session", async () => {
    const backend = testBackend();
    await invite(backend, "anna@example.com");
    await returnFromGoogle(backend, { email: "anna@example.com", email_verified: true });
    await backend.run(async (ctx) => {
      for (const invite of await ctx.db.query("invites").take(10)) await ctx.db.delete(invite._id);
    });
    await expect(returnFromGoogle(backend, { email: "anna@example.com", email_verified: true })).rejects.toThrow();
    expect(await sessions(backend)).toHaveLength(1);
  });

  test("the invite matches whatever case Google sends the email in", async () => {
    const backend = testBackend();
    await invite(backend, " Anna@Example.com ");
    await returnFromGoogle(backend, { email: "ANNA@example.COM", email_verified: true });
    expect(await sessions(backend)).toHaveLength(1);
  });

  test("an invited email that Google has not verified gets no session", async () => {
    const backend = testBackend();
    await invite(backend, "anna@example.com");
    await expect(returnFromGoogle(backend, { email: "anna@example.com", email_verified: false })).rejects.toThrow();
    expect(await sessions(backend)).toHaveLength(0);
  });
});
