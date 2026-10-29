import { test } from "@e2e-dev/web";
import { expect } from "e2e";

const onlyABuildRegistersTheServiceWorker = !process.env.APP_URL && "needs a build: set APP_URL to a preview";

test("She can add OpenChords to her home screen", { skip: onlyABuildRegistersTheServiceWorker }, async ({ app, browser }) => {
  await app.open("/");

  expect(await browser.evaluate(manifest)).toEqual({
    name: "OpenChords",
    display: "standalone",
    startUrl: `${new URL(process.env.APP_URL!).origin}/`,
    iconSizes: ["64x64", "192x192", "512x512", "512x512"],
    iconsLoad: true,
  });
  expect(await browser.evaluate(homeScreenTags)).toEqual({ themeColor: true, appleTouchIconLoads: true });
  await expect.poll(() => browser.evaluate(activeServiceWorkerScope)).toBe(`${new URL(process.env.APP_URL!).origin}/`);
});

async function manifest() {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) return null;
  const { name, display, start_url, icons } = await (await fetch(link.href)).json();
  const loads = await Promise.all(
    icons.map(async (icon: { src: string }) => (await fetch(new URL(icon.src, link.href))).headers.get("content-type")),
  );
  return {
    name,
    display,
    startUrl: new URL(start_url, link.href).href,
    iconSizes: icons.map((icon: { sizes: string }) => icon.sizes),
    iconsLoad: loads.every((type) => type === "image/png"),
  };
}

async function homeScreenTags() {
  const appleTouchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  return {
    themeColor: document.querySelector('meta[name="theme-color"]') !== null,
    appleTouchIconLoads: appleTouchIcon !== null && (await fetch(appleTouchIcon.href)).ok,
  };
}

async function activeServiceWorkerScope() {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration?.active ? registration.scope : null;
}
