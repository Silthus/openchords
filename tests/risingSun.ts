import { expect, type App, type Screen } from "e2e";
import { openAsReader } from "./reader";

export async function openRisingSun(app: App, screen: Screen) {
  await openAsReader(app, screen, "/?q=rising");
  await screen.getByRole("link").filter({ hasText: "House of the Rising Sun" }).click();
  await expect(screen.getByText("End of song")).toBeVisible();
}

export function pixelsScrolledIn(milliseconds: number) {
  const start = window.scrollY;
  return new Promise<number>((resolve) => setTimeout(() => resolve(Math.round(window.scrollY - start)), milliseconds));
}

export function scrollPosition() {
  return window.scrollY;
}
