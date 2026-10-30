import { test } from "@e2e-dev/web";
import { expect, type Screen } from "e2e";
import { openRisingSun } from "./risingSun";

async function diagramsShown(screen: Screen) {
  await expect(screen.getByRole("region", "Chords in this song").getByRole("img").first()).toBeVisible();
}

test("Her key, capo, speed and Chord sheet stick for a Song", async ({ app, browser, screen }) => {
  await openRisingSun(app, screen);
  await expect(screen.getByText("Traditional · Classic · Key Am · No capo")).toBeVisible();
  await screen.getByRole("button", "Settings").click();
  const sheet = screen.getByRole("dialog", "Settings");
  await sheet.getByRole("button", "Key +").click();
  await sheet.getByRole("button", "Key +").click();
  await sheet.getByRole("button", "Capo +").click();
  await sheet.getByRole("button", "Scroll speed +").click();
  await sheet.getByRole("button", "Done").click();
  await expect(screen.getByText("Traditional · Classic · Key Bm · Capo on fret 1")).toBeVisible();
  await diagramsShown(screen);
  await app.screenshot("She set her key, capo and speed");

  await browser.reload();
  await expect(screen.getByText("Traditional · Classic · Key Bm · Capo on fret 1")).toBeVisible();
  await expect(screen.getByText("Scroll speed 4")).toBeVisible();
  await diagramsShown(screen);
  await app.screenshot("After a reload the Song opens in Bm with her capo and speed");

  await screen.getByRole("button", "Settings").click();
  await sheet.getByRole("link", /^Easy shapes/).click();
  await expect(screen.getByText(/Easy shapes · Key Bm · Capo on fret 5/)).toBeAttached();
  await sheet.getByRole("button", "Done").click();
  await screen.getByRole("link", /Search$/).click();
  await screen.getByRole("link").filter({ hasText: "House of the Rising Sun" }).click();
  await expect(screen.getByText("Traditional · Easy shapes · Key Bm · Capo on fret 5")).toBeVisible();
  await diagramsShown(screen);
  await app.screenshot("The Song opens on Easy shapes, the Chord sheet she picked");
});

test("Someone else still gets the Song as written", async ({ app, screen }) => {
  await openRisingSun(app, screen);
  await expect(screen.getByText("Traditional · Classic · Key Am · No capo")).toBeVisible();
  await expect(screen.getByText("Scroll speed 3")).toBeVisible();
  await diagramsShown(screen);
  await app.screenshot("Someone else opens the Song as written");
});
