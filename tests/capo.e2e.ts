import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { openRisingSun } from "./risingSun";

test("A capo keeps the key and shows the shapes she plays", async ({ app, screen }) => {
  await openRisingSun(app, screen);
  await screen.getByRole("button", "Settings").click();
  const sheet = screen.getByRole("dialog", "Settings");
  await expect(sheet.getByText("No capo")).toBeVisible();
  await expect(sheet.getByText("A clamp across the neck: same key, easier finger shapes.")).toBeVisible();
  await expect(sheet.getByRole("button", /^Make it easier/)).toBeHidden();

  for (let fret = 0; fret < 3; fret++) await sheet.getByRole("button", "Capo +").click();
  await expect(sheet.getByText("Capo on fret 3")).toBeVisible();
  await expect(sheet.getByRole("button", "Make it easier: no capo")).toBeVisible();
  await sheet.getByRole("button", "Done").click();
  await expect(screen.getByText("Traditional · Classic · Key Am · Capo on fret 3")).toBeVisible();
  await expect(screen.getByRole("region", "Verse 1").getByRole("button").first()).toHaveText("F#m");
  await expect(screen.getByRole("region", "Chords in this song").getByRole("img", "F#m chord diagram")).toBeVisible();

  await screen.getByRole("button", "Settings").click();
  for (let fret = 3; fret < 11; fret++) await sheet.getByRole("button", "Capo +").click();
  await expect(sheet.getByRole("button", "Capo +")).toBeDisabled();
  await expect(sheet.getByText("Capo on fret 11")).toBeVisible();
});

test("Make it easier puts back the capo a Chord sheet is written for", async ({ app, screen }) => {
  await openRisingSun(app, screen);
  await screen.getByRole("button", "Settings").click();
  const sheet = screen.getByRole("dialog", "Settings");
  await sheet.getByRole("link", /^Easy shapes/).click();
  await expect(sheet.getByText("Capo on fret 5")).toBeVisible();

  for (let fret = 5; fret > 0; fret--) await sheet.getByRole("button", "Capo −").click();
  await expect(sheet.getByRole("button", "Capo −")).toBeDisabled();
  await expect(screen.getByText("Traditional · Easy shapes · Key Am · No capo")).toBeAttached();
  await sheet.getByRole("button", "Make it easier: capo on fret 5").click();
  await expect(sheet.getByText("Capo on fret 5")).toBeVisible();
  await expect(sheet.getByRole("button", /^Make it easier/)).toBeHidden();
  await expect(screen.getByText("Traditional · Easy shapes · Key Am · Capo on fret 5")).toBeAttached();
});

test("Each Chord sheet keeps the capo she set on it", async ({ app, screen }) => {
  await openRisingSun(app, screen);
  await screen.getByRole("button", "Settings").click();
  const sheet = screen.getByRole("dialog", "Settings");
  const firstChord = screen.getByRole("region", "Verse 1").getByRole("button").first();
  for (let fret = 0; fret < 3; fret++) await sheet.getByRole("button", "Capo +").click();

  await sheet.getByRole("link", /^Easy shapes/).click();
  await expect(sheet.getByText("Capo on fret 5")).toBeVisible();
  await sheet.getByRole("button", "Capo −").click();
  await expect(firstChord).toHaveText("Fm");

  await sheet.getByRole("link", /^Classic/).click();
  await expect(sheet.getByText("Capo on fret 3")).toBeVisible();
  await expect(firstChord).toHaveText("F#m");

  await sheet.getByRole("link", /^Easy shapes/).click();
  await expect(sheet.getByText("Capo on fret 4")).toBeVisible();
  await expect(firstChord).toHaveText("Fm");
});
