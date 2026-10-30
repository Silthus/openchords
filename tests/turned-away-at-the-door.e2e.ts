import { test, type WebResponse } from "@e2e-dev/web";
import { expect } from "e2e";

test("A visitor Google turns away is told OpenChords is invite-only and keeps their link", async ({
  app,
  browser,
  screen,
}) => {
  await app.open("/sign-in?to=%2F%3Fq%3Drising");
  await expect(screen.getByText("Sign in to play along.")).toBeVisible();
  await app.screenshot("A signed-out visitor is asked to sign in");

  const toGoogle = browser.waitForResponse(/\/api\/auth\/signin\/google/);
  await screen.getByRole("button", "Sign in with Google").click();
  await browser.goto(callbackWithoutASession(await toGoogle));

  await expect(screen.getByRole("alert")).toHaveText("OpenChords is invite-only. Ask the person who shared this link.");
  await expect(screen.getByRole("button", "Try another account")).toBeVisible();
  expect(new URL(await browser.url()).searchParams.get("to")).toBe("/?q=rising");
  await app.screenshot("Back from Google without a session, the visitor learns OpenChords is invite-only");
});

function callbackWithoutASession(toGoogle: WebResponse) {
  const google = new URL(toGoogle.headers.location!);
  const callback = new URL(google.searchParams.get("redirect_uri")!);
  callback.search = new URLSearchParams({ code: "refused", state: google.searchParams.get("state")! }).toString();
  return callback.href;
}
