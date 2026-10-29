import { test, type Browser } from "@e2e-dev/web";
import { expect, type App, type Screen } from "e2e";
import { openAsReader } from "./reader";

test("A signed-out visitor signs in and lands on the shared Song", async ({ agent, app, browser, screen }) => {
  const sharedLink = await risingSunLinkThenSignOut(app, browser, screen);

  await app.open(sharedLink);
  await agent.waitFor("a sign-in screen is shown");
  await expect(screen.getByRole("button", "Sign in as the test user")).toBeVisible();
  expect(new URL(await browser.url()).searchParams.get("to")).toBe(sharedLink);
  await app.screenshot("A shared link asks a signed-out visitor to sign in");

  await agent.act("Sign in as the test user");
  await agent.waitFor("the Song's title is shown");
  await expect(screen.getByRole("heading", "House of the Rising Sun")).toBeVisible();
  expect(new URL(await browser.url()).pathname).toBe(sharedLink);
  await app.screenshot("After sign-in the visitor lands on the shared Song");
});

async function risingSunLinkThenSignOut(app: App, browser: Browser, screen: Screen) {
  await openAsReader(app, screen, "/?q=rising");
  await screen.getByRole("link").filter({ hasText: "House of the Rising Sun" }).click();
  await expect(screen.getByRole("heading", "House of the Rising Sun")).toBeVisible();
  const link = new URL(await browser.url()).pathname;
  await screen.getByRole("button", "Settings").click();
  await screen.getByRole("button", "Sign out").click();
  await expect(screen.getByRole("button", "Sign in with Google")).toBeVisible();
  return link;
}
