import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { openRisingSun } from "./risingSun";

test("She plays a Song with auto-scroll at her speed", async ({ agent, app, browser, screen }) => {
  await openRisingSun(app, screen);
  await expect(screen.getByRole("button", "Play")).toBeVisible();
  await expect(screen.getByText("Scroll speed 3")).toBeVisible();

  await agent.act("Press the big play button");
  await expect(screen.getByText("Tap the lyrics to pause")).toBeVisible();
  await expect.poll(() => browser.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeGreaterThan(100);
  await agent.assert("the hint Tap the lyrics to pause is shown above the lyrics", { vision: true });
  await app.screenshot("Play scrolls the lyrics");

  await agent.act("Tap the lyrics");
  await expect(screen.getByRole("button", "Play")).toBeVisible();
  await expect(screen.getByText("Tap the lyrics to pause")).toBeHidden();
  await agent.assert("the big round button shows the play symbol", { vision: true });
  await app.screenshot("A tap on the lyrics pauses");

  await agent.act("Open the settings sheet and press Scroll speed + twice, then Done");
  await expect(screen.getByRole("dialog", "Settings")).toBeHidden();
  await expect(screen.getByText("Scroll speed 5")).toBeVisible();
  await agent.assert("the speed next to the play button shows 5", { vision: true });
  await app.screenshot("She set a faster scroll speed");
});
