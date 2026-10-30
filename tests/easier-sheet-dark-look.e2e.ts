import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { looksDark } from "./looks";
import { openAsReader } from "./reader";

test("She picks a Chord sheet, a look and a text size", async ({ agent, app, browser, screen }) => {
  await openAsReader(app, screen, "/");
  await agent.act("Open House of the Rising Sun and open the settings sheet");
  const sheet = screen.getByRole("dialog", "Settings");
  await expect(sheet.getByRole("link")).toHaveCount(3);
  for (const name of [/^Classic/, /^Easy shapes/, /^Bluesy/]) await expect(sheet.getByRole("link", name)).toBeVisible();
  await expect(sheet.getByRole("link", /^Classic/)).toHaveAttribute("aria-current", "page");
  await app.screenshot("The settings sheet lists the Song's Chord sheets");

  await agent.act("Choose the Easy shapes card");
  await expect(sheet.getByRole("link", /^Easy shapes/)).toHaveAttribute("aria-current", "page");
  await expect(screen.getByText(/Easy shapes · Key Am · Capo on fret 5/)).toBeAttached();

  const lyricsBefore = await browser.evaluate(lyricsFontSize);
  await agent.act("Choose the Dark look");
  await expect(sheet.getByRole("button", "☾ Dark")).toHaveAttribute("aria-pressed", "true");
  await agent.act("Press Text size + twice");
  await expect(sheet.getByText("120%")).toBeVisible();
  await agent.act("Press Done");
  await expect(sheet).toBeHidden();
  await expect.poll(() => browser.evaluate(looksDark)).toBe(true);
  expect(await browser.evaluate(lyricsFontSize)).toBeCloseTo(lyricsBefore * 1.2, 0);
  await agent.assert("the screen is dark with light lyrics", { vision: true });
  await app.screenshot("Easy shapes in the dark look with bigger text");

  const easyShapesLink = await browser.evaluate(() => location.pathname);
  await browser.reload();
  await agent.waitFor("the Song's title is shown");
  await expect(browser).toHaveURL(new RegExp(`${easyShapesLink}$`));
  await expect(screen.getByText(/Easy shapes · Key Am · Capo on fret 5/)).toBeVisible();
  expect(await browser.evaluate(looksDark)).toBe(true);
  await app.screenshot("The link keeps the Chord sheet and the look stays dark");
});

function lyricsFontSize() {
  return parseFloat(getComputedStyle(document.querySelector("[data-lyrics]")!).fontSize);
}
