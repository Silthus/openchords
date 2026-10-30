import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { openAsReader, productionOffersNoTestUser } from "./reader";

test("She fixes a draft and keeps it as her version", { skip: productionOffersNoTestUser }, async ({ agent, app, browser, screen }) => {
  await openAsReader(app, screen, "/?q=amazing");
  await agent.act("Open Amazing Grace and open the settings sheet");
  await expect(screen.getByRole("dialog", "Settings")).toBeVisible();
  await agent.act("Choose Fix chords");
  await expect(screen.getByRole("button", "Save as my version")).toBeVisible();
  await agent.act("Tap the first word of the first line and choose the chord D");
  await expect(screen.getByRole("region", "Verse 1").getByRole("button").first()).toHaveText("D");
  await app.screenshot("She set a chord on a word");

  await agent.act("Press Save as my version");
  await expect(screen.getByRole("button", "Save as my version")).toBeHidden();
  await browser.reload();
  await expect(screen.getByText("John Newton · Test's version · Key G · No capo")).toBeVisible();
  await screen.getByRole("button", "Settings").click();
  await expect(screen.getByRole("dialog", "Settings").getByRole("link", /^Test's version/)).toHaveAttribute("aria-current", "page");
  await expect(screen.getByRole("region", "Verse 1").getByRole("button").first()).toHaveText("D");
  await app.screenshot("Her version is saved and picked");
});
