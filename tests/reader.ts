import { expect, type App, type Screen } from "e2e";

export async function openAsReader(app: App, screen: Screen, path: string) {
  await app.open(`/sign-in?to=${encodeURIComponent(path)}`);
  await expect(screen.getByRole("button", "Sign in with Google")).toBeVisible();
  const testUser = screen.getByRole("button", "Sign in as the test user");
  if (await testUser.isVisible()) await testUser.click();
  else await app.open(path);
}
