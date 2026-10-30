import { test } from "@e2e-dev/web";
import { expect, type Screen } from "e2e";
import { openAsReader } from "./reader";

async function openFromStart(screen: Screen, title: string) {
  await screen.getByRole("link").filter({ hasText: title }).last().click();
  await expect(screen.getByRole("heading", title)).toBeVisible();
}

async function backToStart(screen: Screen) {
  await screen.getByRole("link", /Search$/).click();
  await expect(screen.getByRole("searchbox", "Search songs")).toBeVisible();
}

async function pressPlus(screen: Screen, settings: string[]) {
  await screen.getByRole("button", "Settings").click();
  const sheet = screen.getByRole("dialog", "Settings");
  for (const setting of settings) await sheet.getByRole("button", `${setting} +`).click();
  await sheet.getByRole("button", "Done").click();
}

test("Your Library lists only the Songs she saved, and lets one go without losing her choices", async ({ app, browser, screen }) => {
  await openAsReader(app, screen, "/");
  await openFromStart(screen, "Shenandoah");
  await pressPlus(screen, ["Key", "Capo", "Scroll speed"]);
  await screen.getByRole("button", "☆ Save").click();
  await expect(screen.getByRole("button", "★ Saved")).toBeVisible();
  await backToStart(screen);
  await openFromStart(screen, "Scarborough Fair");
  await screen.getByRole("button", "☆ Save").click();
  await expect(screen.getByRole("button", "★ Saved")).toBeVisible();
  await backToStart(screen);
  await openFromStart(screen, "Red River Valley");
  await pressPlus(screen, ["Key"]);
  await expect(screen.getByText("Traditional · Classic · Key Ab · No capo")).toBeVisible();

  await backToStart(screen);
  const yourLibrary = screen.getByRole("region", "Your Library");
  await expect(yourLibrary.getByRole("link")).toHaveText([/^Scarborough Fair/, /^Shenandoah/]);
  await app.screenshot("Your Library lists the two Songs she saved, by title");

  await yourLibrary.getByRole("link").filter({ hasText: "Shenandoah" }).click();
  await screen.getByRole("button", "★ Saved").click();
  await expect(screen.getByRole("button", "☆ Save")).toBeVisible();
  await browser.reload();
  await expect(screen.getByRole("button", "☆ Save")).toBeVisible();
  await expect(screen.getByText("Traditional · Classic · Key Eb · Capo on fret 1")).toBeVisible();
  await expect(screen.getByText("Scroll speed 4")).toBeVisible();
  await app.screenshot("Taken out of her Library, Shenandoah keeps her key, capo and speed");

  await backToStart(screen);
  await expect(screen.getByRole("region", "Your Library").getByRole("link")).toHaveText([/^Scarborough Fair/]);
  await app.screenshot("Your Library lists only the Song she kept");
});
