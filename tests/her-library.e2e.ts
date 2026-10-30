import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { openAsReader } from "./reader";

test("Her choices for a Song follow her to another device", async ({ agent, app, screen }) => {
  const her = `library-${crypto.randomUUID()}`;
  await openAsReader(app, screen, "/?q=amazing", her);
  await agent.act("Open Amazing Grace");
  await expect(screen.getByText("John Newton · Classic · Key G · No capo")).toBeVisible();
  await agent.act("Open the settings sheet");
  const sheet = screen.getByRole("dialog", "Settings");
  await expect(sheet).toBeVisible();
  await agent.act("Press Key + once");
  await expect(screen.getByText("John Newton · Classic · Key Ab · No capo")).toBeAttached();
  await agent.act("Press Scroll speed + once");
  await expect(screen.getByText("Scroll speed 4")).toBeAttached();
  await agent.act("Press Done");
  await expect(sheet).toBeHidden();
  await expect(screen.getByText("John Newton · Classic · Key Ab · No capo")).toBeVisible();
  await expect(screen.getByText("Scroll speed 4")).toBeVisible();
  await agent.act("Press Save on the title line");
  await expect(screen.getByRole("button", "★ Saved")).toHaveAttribute("aria-pressed", "true");
  await app.screenshot("She saved a Song with her own key");

  await app.clearState();
  await openAsReader(app, screen, "/", her);
  const yourLibrary = screen.getByRole("region", "Your Library");
  await expect(yourLibrary).toBeVisible();
  await expect(yourLibrary.getByRole("link").filter({ hasText: "Amazing Grace" })).toBeVisible();
  await app.screenshot("Her Library is there on a fresh device");

  await agent.act("Open Amazing Grace from Your Library");
  await expect(screen.getByText("John Newton · Classic · Key Ab · No capo")).toBeVisible();
  await expect(screen.getByText("Scroll speed 4")).toBeVisible();
  await app.screenshot("The Song opens with the key she chose");
});

