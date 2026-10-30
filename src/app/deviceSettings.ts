import { useEffect, useSyncExternalStore } from "react";

export type Look = "light" | "dark";

const statusBarColors: Record<Look, string> = { light: "#ffffff", dark: "#0a0a0a" };

export const textSizes = { smallest: 80, standard: 100, largest: 180, step: 10 };

const lookKey = "openchords.look";
const textSizeKey = "openchords.textSize";
const listeners = new Set<() => void>();
const forThisVisit = new Map<string, string>();

export function useLook(): [Look, (look: Look) => void] {
  const look = useStored(lookKey) === "dark" ? "dark" : "light";
  return [look, (next) => store(lookKey, next)];
}

export function useLookOnThePage() {
  const [look] = useLook();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", look === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", statusBarColors[look]);
  }, [look]);
}

export function useTextSize(): [number, (size: number) => void] {
  const stored = Number(useStored(textSizeKey));
  const size = stored >= textSizes.smallest && stored <= textSizes.largest ? stored : textSizes.standard;
  return [size, (next) => store(textSizeKey, String(next))];
}

function useStored(key: string) {
  return useSyncExternalStore(
    subscribe,
    () => forThisVisit.get(key) ?? readFromTheDevice(key),
    () => null,
  );
}

function readFromTheDevice(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function store(key: string, value: string) {
  forThisVisit.set(key, value);
  saveOnTheDevice(key, value);
  for (const listener of listeners) listener();
}

function saveOnTheDevice(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
