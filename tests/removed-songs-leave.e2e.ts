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

async function openInTheApp(browser: Browser, path: string) {
  await browser.evaluate((to) => {
    history.pushState({}, "", to);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

async function songIdsOnThePhone() {
  const opening = indexedDB.open("openchords-offline");
  const database = await new Promise<IDBDatabase>((resolve) => (opening.onsuccess = () => resolve(opening.result)));
  const keys = database.transaction("songs").objectStore("songs").getAllKeys();
  return new Promise<IDBValidKey[]>((resolve) => (keys.onsuccess = () => resolve(keys.result)));
}

async function keepACopyUnder(songId: string) {
  const opening = indexedDB.open("openchords-offline");
  const database = await new Promise<IDBDatabase>((resolve) => (opening.onsuccess = () => resolve(opening.result)));
  const transaction = database.transaction("songs", "readwrite");
  const all = transaction.objectStore("songs").getAll();
  type Kept = { found: { song: { songId: string } } };
  const [kept] = await new Promise<Kept[]>((resolve) => (all.onsuccess = () => resolve(all.result)));
  transaction.objectStore("songs").put({ ...kept, found: { ...kept.found, song: { ...kept.found.song, songId } } }, songId);
  await new Promise((resolve) => (transaction.oncomplete = resolve));
}
