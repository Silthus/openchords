import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { openRisingSun, pixelsScrolledIn } from "./risingSun";

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

test("She scrolls herself while it plays, and it carries on from there", async ({ app, browser, screen }) => {
  await openRisingSun(app, screen);
  await screen.getByRole("button", "Play").click();
  const herPosition = await browser.evaluate(scrollBy, 200);
  const later = await browser.evaluate(positionAfter, 1000);
  expect(later).toBeGreaterThan(herPosition + 5);
  expect(later).toBeLessThan(herPosition + 60);
});

test("A chord tapped while it plays shows its diagram and the Song keeps playing", async ({ app, browser, screen }) => {
  await openRisingSun(app, screen);
  await screen.getByRole("button", "Play").click();
  await (await screen.getByRole("region", "Verse 1").getByRole("button", "Am").all())[0]!.click();
  await expect(screen.getByRole("dialog", "Am large")).toBeVisible();
  expect(await browser.evaluate(pixelsScrolledIn, 1000)).toBeGreaterThan(10);
  await browser.keyboard.press("Escape");
  await expect(screen.getByRole("button", "Pause")).toBeVisible();
});

test("After the page stalls, the Song moves on from where it was", async ({ app, browser, screen }) => {
  await openRisingSun(app, screen);
  await screen.getByRole("button", "Play").click();
  expect(await browser.evaluate(pixelsScrolledAcrossAStallOf, 3000)).toBeLessThan(15);
  expect(await browser.evaluate(pixelsScrolledIn, 1000)).toBeGreaterThan(10);
  await expect(screen.getByRole("button", "Pause")).toBeVisible();
});

function scrollBy(pixels: number) {
  window.scrollTo(0, window.scrollY + pixels);
  return window.scrollY;
}

function positionAfter(milliseconds: number) {
  return new Promise<number>((resolve) => setTimeout(() => resolve(window.scrollY), milliseconds));
}

async function pixelsScrolledAcrossAStallOf(milliseconds: number) {
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  await nextFrame();
  const before = window.scrollY;
  const stallEnds = performance.now() + milliseconds;
  while (performance.now() < stallEnds);
  await nextFrame();
  await nextFrame();
  return Math.round(window.scrollY - before);
}

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

async function pixelsLeftWhenPlayStopsFrom(pixelsAboveTheEnd: number) {
  const end = () => document.documentElement.scrollHeight - window.innerHeight;
  const playButton = () => document.querySelector("button[aria-label=Play]");
  window.scrollTo(0, end() - pixelsAboveTheEnd);
  (playButton() as HTMLButtonElement).click();
  const stopped = () => playButton() !== null && window.scrollY > end() - pixelsAboveTheEnd;
  for (let waited = 0; !stopped() && waited < 10_000; waited += 50) await new Promise((resolve) => setTimeout(resolve, 50));
  return Math.round(end() - window.scrollY);
}
