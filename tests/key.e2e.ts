import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { openRisingSun } from "./risingSun";

test("Key + moves the whole Song higher, for every Chord sheet she picks", async ({ app, screen }) => {
  await openRisingSun(app, screen);
  await screen.getByRole("button", "Settings").click();
  const sheet = screen.getByRole("dialog", "Settings");
  await expect(sheet.getByText("Moves the whole song higher or lower to suit your voice.")).toBeVisible();
  await expect(sheet.getByText("Am")).toBeVisible();

  await sheet.getByRole("button", "Key +").click();
  await sheet.getByRole("button", "Key +").click();
  await expect(sheet.getByText("Bm")).toBeVisible();
  await app.screenshot("Key + twice moves the Song from Am to Bm");
  await sheet.getByRole("button", "Done").click();

  await expect(screen.getByText("Traditional · Classic · Key Bm · No capo")).toBeVisible();
  await expect(screen.getByRole("region", "Verse 1").getByRole("button").first()).toHaveText("Bm");
  const chordsInThisSong = screen.getByRole("region", "Chords in this song");
  for (const chord of ["Bm", "D", "E", "G", "F#"]) {
    await expect(chordsInThisSong.getByRole("img", `${chord} chord diagram`)).toBeVisible();
  }
  await app.screenshot("The header line, the diagrams and the lyrics show the Song in Bm");

  await screen.getByRole("button", "Settings").click();
  await sheet.getByRole("link", /^Easy shapes/).click();
  await expect(screen.getByText(/Easy shapes · Key Bm · Capo on fret 5/)).toBeAttached();
  await expect(screen.getByRole("region", "Verse 1").getByRole("button").first()).toHaveText("F#m");
});

test("Key − goes down to 11 semitones below the written key and no further", async ({ app, screen }) => {
  await openRisingSun(app, screen);
  await screen.getByRole("button", "Settings").click();
  const sheet = screen.getByRole("dialog", "Settings");
  for (let press = 0; press < 11; press++) await sheet.getByRole("button", "Key −").click();
  await expect(sheet.getByRole("button", "Key −")).toBeDisabled();
  await expect(sheet.getByText("Bbm")).toBeVisible();
  await sheet.getByRole("button", "Key +").click();
  await expect(sheet.getByText("Bm")).toBeVisible();
});
