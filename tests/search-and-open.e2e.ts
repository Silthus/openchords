import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("She finds a built-in Song and opens it at its own link", async ({ agent, app, browser, screen }) => {
  await app.open("/");
  await agent.waitFor("the start screen lists the built-in Songs");
  await expect(screen.getByRole("heading", "Built-in Songs")).toBeVisible();
  await expect(screen.getByRole("link").filter({ hasText: "House of the Rising Sun" })).toContainText("Traditional");
  await app.screenshot("The start screen lists the built-in Songs");

  await agent.act("Type Rising into the search field");
  await expect(screen.getByRole("listitem")).toHaveText([/House of the Rising Sun/]);
  await app.screenshot("Search finds a Song from part of its title");

  await agent.act("Open House of the Rising Sun from the results");
  await agent.waitFor("the Song's title is shown");
  await expect(browser).toHaveURL(/\/songs\/[a-z0-9]+$/);
  await agent.assert("chords sit over the words");
  await app.screenshot("The Song opens at its own link with chords over the words");
});
