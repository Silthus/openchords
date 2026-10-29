import { test } from "@e2e-dev/web";
import { expect } from "e2e";

type WakeLockLog = { held: number };

test("She plays a Song, pauses it with a tap on the lyrics, and it stops at the end", async ({ app, browser, screen }) => {
  await app.open("/?q=rising");
  await screen.getByRole("link").filter({ hasText: "House of the Rising Sun" }).click();
  await browser.evaluate(recordWakeLocks);
  const play = screen.getByRole("button", "Play");
  const hint = screen.getByText("Tap the lyrics to pause");
  await expect(screen.getByText("Scroll speed 3")).toBeVisible();

  await play.click();
  await expect(hint).toBeVisible();
  expect(await browser.evaluate(pixelsScrolledIn, 1000)).toBeGreaterThan(10);
  expect(await browser.evaluate(heldWakeLocks)).toBe(1);

  await screen.getByText("ruin").click();
  await expect(play).toBeVisible();
  await expect(hint).toBeHidden();
  expect(await browser.evaluate(pixelsScrolledIn, 500)).toBe(0);
  expect(await browser.evaluate(heldWakeLocks)).toBe(0);

  expect(await browser.evaluate(pixelsLeftWhenPlayStopsFrom, 40)).toBeLessThanOrEqual(1);
  await expect(play).toBeVisible();
  await expect(screen.getByText("End of song")).toBeVisible();
  expect(await browser.evaluate(pixelsScrolledIn, 500)).toBe(0);
});

function recordWakeLocks() {
  const log: WakeLockLog = { held: 0 };
  const request = async () => {
    log.held += 1;
    return { release: async () => void (log.held -= 1) };
  };
  Object.assign(window, { wakeLockLog: log });
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
  return log.held;
}

function heldWakeLocks() {
  return (window as unknown as { wakeLockLog: WakeLockLog }).wakeLockLog.held;
}

function pixelsScrolledIn(milliseconds: number) {
  const start = window.scrollY;
  return new Promise<number>((resolve) => setTimeout(() => resolve(Math.round(window.scrollY - start)), milliseconds));
}

async function pixelsLeftWhenPlayStopsFrom(pixelsAboveTheEnd: number) {
  const end = () => document.documentElement.scrollHeight - window.innerHeight;
  const playButton = () => document.querySelector("button[aria-label=Play]");
  window.scrollTo(0, end() - pixelsAboveTheEnd);
  (playButton() as HTMLButtonElement).click();
  const stopped = () => playButton() !== null && window.scrollY > end() - pixelsAboveTheEnd;
  for (let waited = 0; !stopped() && waited < 10_000; waited += 50) await new Promise((resolve) => setTimeout(resolve, 50));
  return Math.round(end() - window.scrollY);
}
