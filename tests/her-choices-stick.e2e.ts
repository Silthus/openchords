import { test } from "@e2e-dev/web";
import { expect, type App, type Screen } from "e2e";
import { openAsReader } from "./reader";

const her = `choices-${crypto.randomUUID()}`;

async function openRisingSun(app: App, screen: Screen, walker?: string) {
  await openAsReader(app, screen, "/?q=rising", walker);
  await screen.getByRole("link").filter({ hasText: "House of the Rising Sun" }).click();
  await expect(screen.getByText("End of song")).toBeVisible();
}

async function diagramsShown(screen: Screen) {
  await expect(screen.getByRole("region", "Chords in this song").getByRole("img").first()).toBeVisible();
}

test("She sets her key, capo and speed for a Song", async ({ app, screen }) => {
  await openRisingSun(app, screen, her);
  await expect(screen.getByText("Traditional · Classic · Key Am · No capo")).toBeVisible();
  await screen.getByRole("button", "Settings").click();
  const sheet = screen.getByRole("dialog", "Settings");
  await sheet.getByRole("button", "Key +").click();
  await sheet.getByRole("button", "Key +").click();
  await sheet.getByRole("button", "Capo +").click();
  await sheet.getByRole("button", "Scroll speed +").click();
  await sheet.getByRole("button", "Done").click();
  await expect(screen.getByText("Traditional · Classic · Key Bm · Capo on fret 1")).toBeVisible();
  await expect(screen.getByText("Scroll speed 4")).toBeVisible();
  await diagramsShown(screen);
  await app.screenshot("She set her key, capo and speed");
});

test("The Song opens the way she left it, and she picks another Chord sheet", async ({ app, screen }) => {
  await openRisingSun(app, screen, her);
  await expect(screen.getByText("Traditional · Classic · Key Bm · Capo on fret 1")).toBeVisible();
  await expect(screen.getByText("Scroll speed 4")).toBeVisible();
  await diagramsShown(screen);
  await app.screenshot("Signed in again, the Song opens in Bm with her capo and speed");
  await screen.getByRole("button", "Settings").click();
  await screen.getByRole("dialog", "Settings").getByRole("link", /^Easy shapes/).click();
  await expect(screen.getByText(/Easy shapes · Key Bm · Capo on fret 5/)).toBeAttached();
});

test("The Song opens on the Chord sheet she picked", async ({ app, screen }) => {
  await openRisingSun(app, screen, her);
  await expect(screen.getByText("Traditional · Easy shapes · Key Bm · Capo on fret 5")).toBeVisible();
  await expect(screen.getByText("Scroll speed 4")).toBeVisible();
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
