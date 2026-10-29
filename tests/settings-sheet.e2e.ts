import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("She sets up the Song in one settings sheet, and her look stays on this device", async ({ app, browser, screen }) => {
  await app.open("/?q=rising");
  await screen.getByRole("link").filter({ hasText: "House of the Rising Sun" }).click();
  await screen.getByRole("button", "Settings").click();
  const sheet = screen.getByRole("dialog", "Settings");
  await expect(sheet.getByRole("link")).toHaveCount(3);
  await expect(sheet.getByRole("link", /^Classic/)).toHaveAttribute("aria-current", "page");

  await sheet.getByRole("link", /^Easy shapes/).click();
  await expect(browser).toHaveURL(/\/songs\/[a-z0-9]+\/sheets\/[a-z0-9]+$/);
  await expect(sheet.getByRole("link", /^Easy shapes/)).toHaveAttribute("aria-current", "page");
  await expect(sheet.getByRole("link", /^Easy shapes/)).toContainText("Built in · Am · capo 5");
  await expect(screen.getByText(/Easy shapes · Key Am · Capo on fret 5/)).toBeAttached();

  for (let press = 3; press < 10; press++) await sheet.getByRole("button", "Scroll speed +").click();
  await expect(sheet.getByRole("button", "Scroll speed +")).toBeDisabled();
  await sheet.getByRole("button", /Dark$/).click();
  const lyricsBefore = await browser.evaluate(lyricsFontSize);
  await sheet.getByRole("button", "Text size +").click();
  await sheet.getByRole("button", "Text size +").click();
  await expect(sheet.getByText("120%")).toBeVisible();
  await sheet.getByRole("button", "Done").click();
  await expect(sheet).toBeHidden();
  await expect(screen.getByText("Scroll speed 10")).toBeVisible();
  expect(await browser.evaluate(lyricsFontSize)).toBeCloseTo(lyricsBefore * 1.2, 0);
  expect(await browser.evaluate(looksDark)).toBe(true);

  await browser.reload();
  await expect(screen.getByText(/Easy shapes · Key Am · Capo on fret 5/)).toBeVisible();
  expect(await browser.evaluate(looksDark)).toBe(true);
  expect(await browser.evaluate(lyricsFontSize)).toBeCloseTo(lyricsBefore * 1.2, 0);

  await screen.getByRole("button", "Settings").click();
  await sheet.getByRole("button", /Light$/).click();
  await screen.tapAt({ x: 10, y: 10 });
  await expect(sheet).toBeHidden();
  expect(await browser.evaluate(looksDark)).toBe(false);
});

function lyricsFontSize() {
  return parseFloat(getComputedStyle(document.querySelector("[data-lyrics]")!).fontSize);
}

function looksDark() {
  return document.documentElement.classList.contains("dark") && getComputedStyle(document.body).backgroundColor !== "rgb(255, 255, 255)";
}
