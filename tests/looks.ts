export function looksDark() {
  return document.documentElement.classList.contains("dark") && getComputedStyle(document.body).backgroundColor !== "rgb(255, 255, 255)";
}

export function statusBarColor() {
  return document.querySelector('meta[name="theme-color"]')?.getAttribute("content") ?? null;
}
