import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { openAsReader } from "./reader";

const outsideSourcesAreOff = process.env.APP_URL !== undefined && "outside sources are on only on dev, through the local app";

test("She opens a song nobody opened before and gets words, then chords", { skip: outsideSourcesAreOff }, async ({ agent, app, screen }) => {
  await openAsReader(app, screen, "/");
  await agent.act("Search for Ring of Fire Johnny Cash");
  await expect(screen.getByRole("link").filter({ hasText: "Ring of Fire" }).first()).toContainText("Johnny Cash · Words only");
  await agent.assert("a result for Ring of Fire by Johnny Cash is shown");
  await app.screenshot("Search finds a real song");
});

test("A second search within a second brings its results a moment later", { skip: outsideSourcesAreOff }, async ({ app, browser, screen }) => {
  await openAsReader(app, screen, "/");
  await expect(screen.getByRole("searchbox", "Search songs")).toBeVisible();
  const moreResultsShown = await browser.evaluate(searchTwiceWithinASecond, ["Riverside Agnes Obel", "Down by the Water Decemberists"]);
  expect(moreResultsShown).toBe(true);
  await expect(screen.getByText("More results in a moment")).toBeHidden();
  await expect(screen.getByRole("link").filter({ hasText: "Down by the Water" }).first()).toContainText("The Decemberists");
  await app.screenshot("A busy search brings its results a moment later");
});

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
