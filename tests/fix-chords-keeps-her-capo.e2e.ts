import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { openAsReader, productionOffersNoTestUser } from "./reader";

test("Fix chords shows the shapes she plays at her capo, and her version keeps it", { skip: productionOffersNoTestUser }, async ({ app, screen }) => {
  await openAsReader(app, screen, "/?q=amazing");
  await screen.getByRole("link").filter({ hasText: "Amazing Grace" }).click();
  const firstChord = screen.getByRole("region", "Verse 1").getByRole("button").first();
  await screen.getByRole("button", "Settings").click();
  const settings = screen.getByRole("dialog", "Settings");
  await settings.getByRole("button", "Capo +").click();
  await settings.getByRole("button", "Capo +").click();
  await settings.getByRole("button", "Done").click();
  await expect(screen.getByText("John Newton · Classic · Key G · Capo on fret 2")).toBeVisible();
  await expect(firstChord).toHaveText("F");

  await screen.getByRole("button", "Settings").click();
  await settings.getByRole("button", "Fix chords").click();
  await expect(screen.getByRole("button", "Save as my version")).toBeVisible();
  await expect(firstChord).toHaveText("F");
  await app.screenshot("Fix chords shows the shapes she plays at capo 2");

  await screen.getByRole("button", "Save as my version").click();
  await expect(screen.getByRole("button", "Save as my version")).toBeHidden();
  await screen.getByRole("link", /Search$/).click();
  await screen.getByRole("link").filter({ hasText: "Amazing Grace" }).click();
  await expect(screen.getByText("John Newton · Test's version · Key G · Capo on fret 2")).toBeVisible();
  await expect(firstChord).toHaveText("F");
  await app.screenshot("Her version opens at her capo");
});
