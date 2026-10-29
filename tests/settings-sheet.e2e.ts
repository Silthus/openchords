import { test } from "@e2e-dev/web";
import { expect, type Screen } from "e2e";
import { openRisingSun, pixelsScrolledIn, scrollPosition } from "./risingSun";
import { looksDark, statusBarColor } from "./looks";

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
  expect(await browser.evaluate(statusBarColor)).toBe("#0a0a0a");

  await browser.reload();
  await expect(screen.getByText(/Easy shapes · Key Am · Capo on fret 5/)).toBeVisible();
  expect(await browser.evaluate(looksDark)).toBe(true);
  expect(await browser.evaluate(lyricsFontSize)).toBeCloseTo(lyricsBefore * 1.2, 0);

  await screen.getByRole("button", "Settings").click();
  await sheet.getByRole("button", /Light$/).click();
  await screen.tapAt({ x: 10, y: 10 });
  await expect(sheet).toBeHidden();
  expect(await browser.evaluate(looksDark)).toBe(false);
  expect(await browser.evaluate(statusBarColor)).toBe("#ffffff");
});

test("The Song scrolls at the speed she sets, also while it plays", async ({ app, browser, screen }) => {
  await openRisingSun(app, screen);
  await screen.getByRole("button", "Play").click();
  const atSpeed3 = await browser.evaluate(pixelsScrolledIn, 2000);
  await screen.getByRole("button", "Settings").click();
  for (let speed = 3; speed < 6; speed++) await screen.getByRole("button", "Scroll speed +").click();
  await screen.getByRole("button", "Done").click();
  const atSpeed6 = await browser.evaluate(pixelsScrolledIn, 2000);
  expect(atSpeed6).toBeGreaterThan(atSpeed3 * 1.6);
  expect(atSpeed6).toBeLessThan(atSpeed3 * 2.4);
});

test("Picking another Chord sheet while it plays keeps her place in the Song", async ({ app, browser, screen }) => {
  await openRisingSun(app, screen);
  await screen.getByRole("button", "Play").click();
  await expect.poll(() => browser.evaluate(scrollPosition)).toBeGreaterThan(60);
  await screen.getByRole("button", "Settings").click();
  await screen.getByRole("dialog", "Settings").getByRole("link", /^Easy shapes/).click();
  await screen.getByRole("button", "Done").click();
  expect(await browser.evaluate(scrollPosition)).toBeGreaterThan(60);
  expect(await browser.evaluate(pixelsScrolledIn, 1000)).toBeGreaterThan(10);
});

test("Without device storage, the app still works and her look holds for the visit", async ({ app, browser, screen }) => {
  await browser.addInitScript(denyStorage, null);
  await openRisingSun(app, screen);
  await pickTheDarkLook(screen);
  expect(await browser.evaluate(looksDark)).toBe(true);
});

test("With full device storage, her look still holds for the visit", async ({ app, browser, screen }) => {
  await browser.addInitScript(fillStorage, null);
  await openRisingSun(app, screen);
  await pickTheDarkLook(screen);
  expect(await browser.evaluate(looksDark)).toBe(true);
});

async function pickTheDarkLook(screen: Screen) {
  await screen.getByRole("button", "Settings").click();
  await screen.getByRole("button", /Dark$/).click();
  await screen.getByRole("button", "Done").click();
}

function denyStorage() {
  Object.defineProperty(window, "localStorage", {
    get() {
      throw new DOMException("Storage is denied.", "SecurityError");
    },
  });
}

function fillStorage() {
  Storage.prototype.setItem = () => {
    throw new DOMException("Storage is full.", "QuotaExceededError");
  };
}

function lyricsFontSize() {
  return parseFloat(getComputedStyle(document.querySelector("[data-lyrics]")!).fontSize);
}
