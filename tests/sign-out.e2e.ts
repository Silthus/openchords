import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { openAsReader } from "./reader";

const productionOffersNoTestUser = process.env.APP_URL?.startsWith("https://judicious-falcon-175.") && "production has no test user";

test("Signed in, she signs out from the settings sheet and is asked to sign in again", { skip: productionOffersNoTestUser }, async ({ app, browser, screen }) => {
  await openAsReader(app, screen, "/?q=rising");
  await screen.getByRole("link").filter({ hasText: "House of the Rising Sun" }).click();
  await screen.getByRole("button", "Settings").click();
  await screen.getByRole("dialog", "Settings").getByRole("button", "Sign out").click();
  await expect(screen.getByRole("button", "Sign in with Google")).toBeVisible();

  await browser.reload();
  await expect(screen.getByRole("button", "Sign in with Google")).toBeVisible();
  await expect(screen.getByRole("heading", "House of the Rising Sun")).toBeHidden();
});
