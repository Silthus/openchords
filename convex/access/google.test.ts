import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api } from "../_generated/api";
import { testBackendWith } from "../testing.helper";

const googleIssuer = "https://accounts.google.com";
const googleDiscovery = {
  issuer: googleIssuer,
  authorization_endpoint: `${googleIssuer}/o/oauth2/v2/auth`,
  token_endpoint: "https://oauth2.googleapis.com/token",
  userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
  jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
  code_challenge_methods_supported: ["S256"],
};
const realFetch = globalThis.fetch;

beforeAll(() => {
  globalThis.fetch = (async () => Response.json(googleDiscovery)) as unknown as typeof fetch;
  Object.assign(process.env, {
    AUTH_GOOGLE_ID: "openchords-test.apps.googleusercontent.com",
    AUTH_GOOGLE_SECRET: "test-secret",
    CONVEX_SITE_URL: "https://openchords.test",
    SITE_URL: "https://openchords.test",
  });
});

afterAll(() => {
  globalThis.fetch = realFetch;
});

async function googleSignInPage() {
  const backend = await testBackendWith({});
  const { redirect } = await backend.action(api.auth.signIn, { provider: "google", params: { redirectTo: "/sign-in" } });
  const toSignIn = new URL(redirect!);
  const toGoogle = await backend.fetch(`${toSignIn.pathname}${toSignIn.search}`, { method: "GET" });
  return new URL(toGoogle.headers.get("location")!);
}

describe("signing in with Google", () => {
  test("lets the visitor pick which Google account signs in", async () => {
    const google = await googleSignInPage();
    expect(google.href).toStartWith(googleDiscovery.authorization_endpoint);
    expect(google.searchParams.get("prompt")).toBe("select_account");
  });
});
