import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { openAsReader } from "./reader";

test("She opens and closes a large diagram from the keyboard", async ({ app, browser, screen }) => {
  await openAsReader(app, screen, "/?q=rising");
  await screen.getByRole("link").filter({ hasText: "House of the Rising Sun" }).click();
  const am = screen.getByRole("region", "Chords in this song").getByRole("button", "Am chord diagram");
  const large = screen.getByRole("dialog", "Am large");

  await am.focus();
  await browser.keyboard.press("Enter");
  await expect(large).toBeVisible();
  await browser.keyboard.press("Escape");
  await expect(large).toBeHidden();
  await expect.poll(() => browser.evaluate(aDialogIsOnThePage)).toBe(false);
  await expect(am).toBeFocused();

  await browser.keyboard.press("Enter");
  await expect(large).toBeVisible();
  await browser.keyboard.press("Enter");
  await expect(large).toBeHidden();
});

function aDialogIsOnThePage() {
  return document.querySelector("dialog") !== null;
}
