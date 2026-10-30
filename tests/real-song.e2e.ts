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
