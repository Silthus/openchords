import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("She moves a Song to her voice and lets a capo make it easy", async ({ agent, app, screen }) => {
  await app.open("/");
  await agent.act("Open House of the Rising Sun and open the settings sheet");
  const sheet = screen.getByRole("dialog", "Settings");
  await expect(sheet).toBeVisible();

  await agent.act("Press Key + twice");
  await expect(screen.getByText("Traditional · Classic · Key Bm · No capo")).toBeAttached();
  await expect(sheet.getByRole("button", "Make it easier: capo on fret 2")).toBeVisible();
  await agent.assert("the header line names the key B minor and a Make it easier: capo on fret N button is shown");
  await app.screenshot("A higher key brings hard chords and a capo hint");

  await agent.act("Press the Make it easier button, then Done");
  await expect(sheet).toBeHidden();
  await expect(screen.getByText("Traditional · Classic · Key Bm · Capo on fret 2")).toBeVisible();
  await expect(screen.getByRole("region", "Verse 1").getByRole("button").first()).toHaveText("Am");
  await agent.assert("the header line names the capo fret, the key is still B minor, and the chord over the first line is Am");
  await app.screenshot("The capo keeps the key with easier shapes");
});
