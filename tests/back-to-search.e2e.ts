import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("She goes back from a Song to her search", async ({ app, browser, screen }) => {
  await app.open("/?q=shen");
  await screen.getByRole("link").filter({ hasText: "Shenandoah" }).click();
  await expect(screen.getByRole("heading", "Shenandoah")).toBeVisible();

  await screen.getByRole("link", "‹ Search").click({ modifiers: ["ControlOrMeta"] });
  await expect(browser).toHaveURL(/\/songs\/[a-z0-9]+$/);

  await screen.getByRole("link", "‹ Search").click();
  await expect(browser).toHaveURL(/\/\?q=shen$/);
  await expect(screen.getByRole("searchbox", "Search songs")).toHaveValue("shen");
});
