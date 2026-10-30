import { test, type Browser } from "@e2e-dev/web";
import { expect } from "e2e";
import { openAsReader, productionOffersNoTestUser } from "./reader";

const goneSongId = "a-song-that-is-gone";

test("A Song she finds gone leaves her phone", { skip: productionOffersNoTestUser }, async ({ app, browser, screen }) => {
  await openAsReader(app, screen, "/?q=amazing");
  await screen.getByRole("link").filter({ hasText: "Amazing Grace" }).click();
  await expect.poll(() => browser.evaluate(songIdsOnThePhone)).toHaveLength(1);

  await browser.evaluate(keepACopyUnder, goneSongId);
  await expect.poll(() => browser.evaluate(songIdsOnThePhone)).toContain(goneSongId);

  await openInTheApp(browser, `/songs/${goneSongId}`);
  await expect(screen.getByText("There is nothing at this link.")).toBeVisible();
  await expect.poll(() => browser.evaluate(songIdsOnThePhone)).not.toContain(goneSongId);
});

test("A Song gone while she was signed out leaves her phone when she signs in", { skip: productionOffersNoTestUser }, async ({ app, browser, screen }) => {
  await app.open(`/sign-in?${new URLSearchParams({ to: "/", testUser: `walker-${crypto.randomUUID()}` })}`);
  await expect(screen.getByRole("button", "Sign in with Google")).toBeVisible();
  await browser.evaluate(keepACopyOfAGoneSong, goneSongId);
  await expect.poll(() => browser.evaluate(songIdsOnThePhone)).toEqual([goneSongId]);

  await screen.getByRole("button", "Sign in as the test user").click();
  await expect(screen.getByRole("searchbox")).toBeVisible();
  await expect.poll(() => browser.evaluate(songIdsOnThePhone)).toEqual([]);
  await app.screenshot("A Song gone while she was signed out left her phone when she signed in");
});

async function openInTheApp(browser: Browser, path: string) {
  await browser.evaluate((to) => {
    history.pushState({}, "", to);
    return dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

async function songIdsOnThePhone() {
  const opening = indexedDB.open("openchords-offline");
  const database = await new Promise<IDBDatabase>((resolve) => (opening.onsuccess = () => resolve(opening.result)));
  const keys = database.transaction("songs").objectStore("songs").getAllKeys();
  return new Promise<string[]>((resolve) => (keys.onsuccess = () => resolve(keys.result.map(String))));
}

async function keepACopyUnder(songId: string) {
  const opening = indexedDB.open("openchords-offline");
  const database = await new Promise<IDBDatabase>((resolve) => (opening.onsuccess = () => resolve(opening.result)));
  const transaction = database.transaction("songs", "readwrite");
  const all = transaction.objectStore("songs").getAll();
  type Kept = { found: { song: { songId: string } } };
  const [kept] = await new Promise<[Kept]>((resolve) => (all.onsuccess = () => resolve(all.result as [Kept])));
  transaction.objectStore("songs").put({ ...kept, found: { ...kept.found, song: { ...kept.found.song, songId } } }, songId);
  return new Promise<string>((resolve) => (transaction.oncomplete = () => resolve(songId)));
}

async function keepACopyOfAGoneSong(songId: string) {
  const opening = indexedDB.open("openchords-offline", 1);
  opening.onupgradeneeded = () => opening.result.createObjectStore("songs");
  const database = await new Promise<IDBDatabase>((resolve) => (opening.onsuccess = () => resolve(opening.result)));
  const transaction = database.transaction("songs", "readwrite");
  transaction.objectStore("songs").put({ found: { song: { songId } }, entry: undefined, openedAt: Date.now() }, songId);
  return new Promise<string>((resolve) => (transaction.oncomplete = () => resolve(songId)));
}
