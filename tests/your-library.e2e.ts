import { test } from "@e2e-dev/web";
import { expect, type App, type Screen } from "e2e";
import { openAsReader } from "./reader";

async function openFromStart(app: App, screen: Screen, title: string) {
  await app.open("/");
  await screen.getByRole("link").filter({ hasText: title }).last().click();
  await expect(screen.getByRole("heading", title)).toBeVisible();
}

async function pressKeyPlus(screen: Screen) {
  await screen.getByRole("button", "Settings").click();
  const sheet = screen.getByRole("dialog", "Settings");
  await sheet.getByRole("button", "Key +").click();
  await sheet.getByRole("button", "Done").click();
}

test("Your Library lists only the Songs she saved, and lets one go without losing her key", async ({ app, browser, screen }) => {
  await openAsReader(app, screen, "/");
  await openFromStart(app, screen, "Shenandoah");
  await pressKeyPlus(screen);
  await screen.getByRole("button", "☆ Save").click();
  await expect(screen.getByRole("button", "★ Saved")).toBeVisible();
  await openFromStart(app, screen, "Scarborough Fair");
  await screen.getByRole("button", "☆ Save").click();
  await expect(screen.getByRole("button", "★ Saved")).toBeVisible();
  await openFromStart(app, screen, "Red River Valley");
  await pressKeyPlus(screen);
  await expect(screen.getByText("Traditional · Classic · Key Ab · No capo")).toBeVisible();

  await app.open("/");
  const yourLibrary = screen.getByRole("region", "Your Library");
  await expect(yourLibrary.getByRole("link")).toHaveText([/^Scarborough Fair/, /^Shenandoah/]);
  await app.screenshot("Your Library lists the two Songs she saved, by title");

  await yourLibrary.getByRole("link").filter({ hasText: "Shenandoah" }).click();
  await screen.getByRole("button", "★ Saved").click();
  await expect(screen.getByRole("button", "☆ Save")).toBeVisible();
  await browser.reload();
  await expect(screen.getByRole("button", "☆ Save")).toBeVisible();
  await expect(screen.getByText("Traditional · Classic · Key Eb · No capo")).toBeVisible();
  await app.screenshot("Taken out of her Library, Shenandoah keeps her key");

  await app.open("/");
  await expect(screen.getByRole("region", "Your Library").getByRole("link")).toHaveText([/^Scarborough Fair/]);
  await app.screenshot("Your Library lists only the Song she kept");
});
