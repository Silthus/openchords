import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { openAsReader, productionOffersNoTestUser } from "./reader";

test("She removes a chord, cancels, then clears every chord and writes her own", { skip: productionOffersNoTestUser }, async ({ agent, app, screen }) => {
  await openAsReader(app, screen, "/?q=amazing");
  await agent.act("Open Amazing Grace, open the settings sheet and choose Fix chords");
  const firstVerse = screen.getByRole("region", "Verse 1");
  await expect(screen.getByRole("button", "Save as my version")).toBeVisible();

  await agent.act("Tap the chord G7 over the word grace and press Remove chord");
  await expect(firstVerse.getByRole("button").nth(1)).toHaveText("Amazing");
  await expect(firstVerse.getByRole("button").nth(2)).toHaveText("grace,");
  await app.screenshot("She removed the chord over grace");

  await agent.act("Press Cancel");
  await expect(screen.getByRole("button", "Save as my version")).toBeHidden();
  await expect(firstVerse.getByRole("button").nth(1)).toHaveText("G7");
  await app.screenshot("Cancel leaves the chords as they were");

  await screen.getByRole("button", "Settings").click();
  await screen.getByRole("button", "Fix chords").click();
  await agent.act("Press Clear all chords");
  await expect(firstVerse.getByRole("button").first()).toHaveText("Amazing");
  await agent.act("Tap the first word of the first line and choose the chord Em, then press Save as my version");
  await expect(screen.getByRole("button", "Save as my version")).toBeHidden();
  await expect(screen.getByText("John Newton · Test's version · Key G · No capo")).toBeVisible();
  await expect(firstVerse.getByRole("button")).toHaveCount(1);
  await expect(firstVerse.getByRole("button").first()).toHaveText("Em");
  await app.screenshot("She cleared the chords and saved her own");
});
