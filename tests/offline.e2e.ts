import { test, type Browser } from "@e2e-dev/web";
import { expect, type Screen } from "e2e";
import { openAsReader, productionOffersNoTestUser } from "./reader";

const onlyABuildWorksOffline = !process.env.APP_URL && "needs a build with its service worker: set APP_URL to a preview";

test("Her saved Song opens with no connection", { skip: productionOffersNoTestUser || onlyABuildWorksOffline }, async ({ agent, app, browser, screen }) => {
  await openAsReader(app, screen, "/?q=shenandoah");
  await agent.act("Open Shenandoah and press Save");
  await expect(screen.getByRole("button", "★ Saved")).toHaveAttribute("aria-pressed", "true");
  await pressPlus(screen, ["Key", "Capo", "Scroll speed"]);
  await expect.poll(() => browser.evaluate(savedOnThePhone)).toEqual([{ title: "Shenandoah", transpose: 1, speed: 4 }]);
  await expect.poll(() => browser.evaluate(serviceWorkerIsActive)).toBe(true);

  await turnTheNetworkOff(browser);
  await browser.reload();
  expect(await browser.evaluate(servedByTheServiceWorker)).toBe(true);
  await expect(screen.getByRole("heading", "Shenandoah")).toBeVisible();
  await expect(screen.getByRole("status")).toHaveText("Offline");
  await expect(screen.getByText("Traditional · Classic · Key Eb · Capo on fret 1")).toBeVisible();
  await expect(screen.getByText("Scroll speed 4")).toBeVisible();
  await expect(screen.getByRole("region", "Chords in this song").getByRole("img", "D chord diagram")).toBeVisible();
  await expect(screen.getByText(/rolling/).first()).toBeVisible();
  await app.screenshot("A saved Song reads offline");
});

async function turnTheNetworkOff(browser: Browser) {
  await browser.route(/.*/, (route) => route.abort());
  await browser.addInitScript(() => {
    class NoConnection extends EventTarget {
      readyState = 3;
      onopen = null;
      onmessage = null;
      onerror: ((event: Event) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;
      constructor(readonly url: string) {
        super();
        setTimeout(() => {
          this.onerror?.(new Event("error"));
          this.onclose?.(new CloseEvent("close", { code: 1006 }));
        });
      }
      send() {}
      close() {}
    }
    Object.defineProperty(window, "WebSocket", { value: NoConnection });
    Object.defineProperty(navigator, "onLine", { get: () => false });
  });
}

async function pressPlus(screen: Screen, settings: string[]) {
  await screen.getByRole("button", "Settings").click();
  const sheet = screen.getByRole("dialog", "Settings");
  for (const setting of settings) await sheet.getByRole("button", `${setting} +`).click();
  await sheet.getByRole("button", "Done").click();
}

async function savedOnThePhone() {
  const opening = indexedDB.open("openchords-offline");
  const database = await new Promise<IDBDatabase>((resolve) => (opening.onsuccess = () => resolve(opening.result)));
  const all = database.transaction("songs").objectStore("songs").getAll();
  type Kept = { found: { song: { title: string } }; entry?: { saved: boolean; transpose: number; speed: number } };
  const copies = await new Promise<Kept[]>((resolve) => (all.onsuccess = () => resolve(all.result)));
  return copies.filter((copy) => copy.entry?.saved).map(({ found, entry }) => ({ title: found.song.title, transpose: entry!.transpose, speed: entry!.speed }));
}

function servedByTheServiceWorker() {
  return navigator.serviceWorker.controller !== null;
}

async function serviceWorkerIsActive() {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration?.active?.state === "activated";
}
