import { test } from "@e2e-dev/web";
import { expect, type App, type Screen } from "e2e";

export const productionOffersNoTestUser =
  process.env.APP_URL?.startsWith("https://judicious-falcon-175.") && "production has no test user";

export async function openAsReader(app: App, screen: Screen, path: string, walker = `walker-${crypto.randomUUID()}`) {
  await app.open(`/sign-in?${new URLSearchParams({ to: path, testUser: walker })}`);
  await expect(screen.getByRole("button", "Sign in with Google")).toBeVisible();
  const testUser = screen.getByRole("button", "Sign in as the test user");
  if (await testUser.isVisible()) await testUser.click();
  else await skipBehindSignIn(app, screen, path);
}

async function skipBehindSignIn(app: App, screen: Screen, path: string) {
  await app.open(path);
  await expect(screen.getByRole("button", "Sign in with Google")).toBeVisible();
  test.skip(`${path} asks to sign in, and only an invited Google account gets past it: this deployment has no test user`);
}
