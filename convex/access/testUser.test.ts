import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { api } from "../_generated/api";
import { testBackendWith } from "../testing.helper";

const testSignInAllowed = { OPENCHORDS_ALLOW_TEST_SIGNIN: "1" };
const walker = { email: "walker@test.openchords.invalid" };

beforeAll(async () => {
  const keys = await generateKeyPair("RS256", { extractable: true });
  process.env.JWT_PRIVATE_KEY = await exportPKCS8(keys.privateKey);
  process.env.JWKS = JSON.stringify({ keys: [{ use: "sig", ...(await exportJWK(keys.publicKey)) }] });
  process.env.CONVEX_SITE_URL = "https://openchords.test";
});

afterEach(() => {
  delete process.env.OPENCHORDS_ALLOW_TEST_SIGNIN;
  delete process.env.OPENCHORDS_ENV;
});

describe("the TestUser", () => {
  test("signs in where test sign-in is allowed", async () => {
    const backend = await testBackendWith(testSignInAllowed);
    const { tokens } = await backend.action(api.auth.signIn, { provider: "test-user", params: walker });
    expect(tokens?.token).toBeString();
  });

  test("signs in again as the same person", async () => {
    const backend = await testBackendWith(testSignInAllowed);
    await backend.action(api.auth.signIn, { provider: "test-user", params: walker });
    await backend.action(api.auth.signIn, { provider: "test-user", params: walker });
    expect(await backend.run((ctx) => ctx.db.query("users").take(2))).toHaveLength(1);
  });

  test("signs in only with an email of the test domain", async () => {
    const backend = await testBackendWith(testSignInAllowed);
    const { tokens } = await backend.action(api.auth.signIn, { provider: "test-user", params: { email: "anna@example.com" } });
    expect(tokens).toBeNull();
  });

  test("does not exist where test sign-in is off", async () => {
    const backend = await testBackendWith({});
    await expect(backend.action(api.auth.signIn, { provider: "test-user", params: walker })).rejects.toThrow();
  });

  test("stops production from loading when test sign-in is switched on there", async () => {
    await expect(testBackendWith({ ...testSignInAllowed, OPENCHORDS_ENV: "production" })).rejects.toThrow();
  });
});
