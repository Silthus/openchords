import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("The list stays on screen while a search answers", async ({ app, browser, screen }) => {
  await app.open("/");
  await expect(screen.getByRole("link").filter({ hasText: "Shenandoah" })).toBeVisible();

  expect(await browser.evaluate(framesWithNoSongsAfterTyping, "Sh")).toBe(0);
  await expect(screen.getByRole("listitem")).toHaveText([/Shenandoah/]);

  expect(await browser.evaluate(framesWithNoSongsAfterTyping, "")).toBe(0);
  await expect(screen.getByRole("listitem")).toHaveText([
    /Amazing Grace/,
    /House of the Rising Sun/,
    /Red River Valley/,
    /Scarborough Fair/,
    /Shenandoah/,
    /Wayfaring Stranger/,
  ]);
});

async function framesWithNoSongsAfterTyping(query: string) {
  const field = document.querySelector("input")!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, query);
  field.dispatchEvent(new Event("input", { bubbles: true }));
  let framesWithNoSongs = 0;
  for (const start = performance.now(); performance.now() - start < 1500; ) {
    await new Promise(requestAnimationFrame);
    if (document.querySelectorAll("main li").length === 0) framesWithNoSongs++;
  }
  return framesWithNoSongs;
}
