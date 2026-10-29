import { afterEach, describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import { testBackend } from "../testing.helper";
import { requireInvited } from ".";

type Backend = ReturnType<typeof testBackend>;

const anna = { email: "anna@example.com", name: "Anna Berg" };

afterEach(() => {
  delete process.env.OPENCHORDS_INVITES;
});

async function seeded() {
  const backend = testBackend();
  await backend.mutation(internal.catalog.index.seed, {});
  return backend;
}

async function signedIn(backend: Backend, person: { email: string; name: string }) {
  const subject = await backend.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { ...person, emailVerificationTime: Date.now() });
    const sessionId = await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 60 * 60 * 1000 });
    return `${userId}|${sessionId}`;
  });
  return backend.withIdentity({ subject });
}

async function invite(backend: Backend, email: string) {
  await backend.mutation(internal.access.invites.add, { email });
}

describe("reading while invites are on", () => {
  test("an invited reader reads the Songs", async () => {
    process.env.OPENCHORDS_INVITES = "on";
    const backend = await seeded();
    await invite(backend, anna.email);
    const reader = await signedIn(backend, anna);
    expect(await reader.query(api.catalog.index.builtIns, {})).toHaveLength(6);
  });

  test("a reader whose invite was taken back is refused", async () => {
    process.env.OPENCHORDS_INVITES = "on";
    const backend = await seeded();
    const reader = await signedIn(backend, anna);
    await expect(reader.query(api.catalog.index.builtIns, {})).rejects.toThrow(/NOT_INVITED/);
  });
});

describe("reading while invites are off", () => {
  test("a signed-out visitor reads the built-in Songs", async () => {
    const backend = await seeded();
    expect(await backend.query(api.catalog.index.builtIns, {})).toHaveLength(6);
  });
});

describe("requireInvited", () => {
  test("names the invited reader by first name", async () => {
    const backend = testBackend();
    await invite(backend, anna.email);
    const reader = await signedIn(backend, anna);
    const invited = await reader.run((ctx) => requireInvited(ctx));
    expect(invited.firstName).toBe("Anna");
    expect(await reader.run((ctx) => ctx.db.get(invited.userId))).toMatchObject({ email: anna.email });
  });

  test("asks for an invited sign-in even while invites are off", async () => {
    const backend = testBackend();
    await expect(backend.run((ctx) => requireInvited(ctx))).rejects.toThrow(/SIGN_IN_REQUIRED/);
  });
});
