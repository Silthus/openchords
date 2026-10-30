import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("A visitor Google turned away tries another Google account and Google asks which one", async ({ app, browser, screen }) => {
  await app.open("/sign-in?to=%2F%3Fq%3Drising&returned=1");
  await expect(screen.getByRole("alert")).toHaveText("OpenChords is invite-only. Ask the person who shared this link.");
  await expect(screen.getByRole("button", "Try another account")).toBeVisible();
  await app.screenshot("Turned away, the visitor is offered another Google account");

  const toGoogle = browser.waitForResponse(/\/api\/auth\/signin\/google/);
  await screen.getByRole("button", "Try another account").click();
  const google = new URL((await toGoogle).headers.location!);

  expect(google.origin).toBe("https://accounts.google.com");
  expect(google.searchParams.get("prompt")).toBe("select_account");
});
