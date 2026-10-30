import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { execFileSync } from "node:child_process";
import { openAsReader } from "./reader";

const outsideSourcesAreOff = process.env.APP_URL !== undefined && "outside sources are on only on dev, through the local app";

test("She opens a song nobody opened before and gets words, then chords", { skip: outsideSourcesAreOff, timeout: 180_000 }, async ({ agent, app, screen }) => {
  putBackToNeverOpened({ title: "Ring of Fire", artist: "Johnny Cash" });
  await openAsReader(app, screen, "/");
  await agent.act("Type Ring of Fire Johnny Cash into the search field");
  await expect(screen.getByRole("link").filter({ hasText: "Ring of Fire" }).first()).toContainText("Johnny Cash · Words only");
  await agent.assert("a result for Ring of Fire by Johnny Cash is shown");
  await app.screenshot("Search finds a real song");

  await agent.act("Open Ring of Fire by Johnny Cash to read its words");
  await agent.waitFor("the words of Ring of Fire are shown");
  await expect(screen.getByText("Johnny Cash · Writing chords…")).toBeVisible();
  await app.screenshot("The words arrive for a song opened the first time");

  await expect(screen.getByText(/^Johnny Cash · AI draft · Key /)).toBeVisible({ timeout: 90_000 });
  await expect(screen.getByText("AI draft: unverified, chords may be wrong")).toBeVisible();
  await app.screenshot("An unverified AI draft puts chords over the words");
});

test("A second search within a second brings its results a moment later", { skip: outsideSourcesAreOff }, async ({ app, browser, screen }) => {
  await openAsReader(app, screen, "/");
  await expect(screen.getByRole("searchbox", "Search songs")).toBeVisible();
  const moreResultsShown = await browser.evaluate(searchTwiceWithinASecond, ["Riverside Agnes Obel", "Down by the Water Decemberists"]);
  expect(moreResultsShown).toBe(true);
  await expect(screen.getByText("More results in a moment")).toBeHidden({ timeout: 15_000 });
  await expect(screen.getByRole("link").filter({ hasText: "Down by the Water" }).first()).toContainText("The Decemberists");
  await app.screenshot("A busy search brings its results a moment later");
});

function putBackToNeverOpened(song: { title: string; artist: string }) {
  execFileSync("bunx", ["convex", "run", "catalog/neverOpened:reset", JSON.stringify(song)], { stdio: "inherit" });
}

async function searchTwiceWithinASecond([first, second]: [string, string]) {
  const field = document.querySelector("input")!;
  const type = (query: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, query);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  };
  type(first);
  await new Promise((resolve) => setTimeout(resolve, 450));
  type(second);
  for (const start = performance.now(); performance.now() - start < 1500; ) {
    await new Promise(requestAnimationFrame);
    if (document.body.innerText.includes("More results in a moment")) return true;
  }
  return false;
}
