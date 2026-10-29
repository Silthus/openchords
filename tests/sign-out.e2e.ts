import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { openAsReader } from "./reader";

const productionOffersNoTestUser = process.env.APP_URL?.startsWith("https://judicious-falcon-175.") && "production has no test user";

test("Signed in, she signs out from the settings sheet and stays signed out", { skip: productionOffersNoTestUser }, async ({ app, browser, screen }) => {
  await openAsReader(app, screen, "/?q=rising");
  await screen.getByRole("link").filter({ hasText: "House of the Rising Sun" }).click();
  await screen.getByRole("button", "Settings").click();
  const sheet = screen.getByRole("dialog", "Settings");
  await sheet.getByRole("button", "Sign out").click();
  await expect(sheet.getByRole("button", "Sign out")).toBeHidden();

  await browser.reload();
  await screen.getByRole("button", "Settings").click();
  await expect(sheet.getByRole("button", "Done")).toBeVisible();
  await expect(sheet.getByRole("button", "Sign out")).toBeHidden();
});
