import type { TokenStorage } from "@convex-dev/auth/react";

export const tokenStorage: TokenStorage = deviceStorageIfAllowed() ?? storageForThisVisit();

function deviceStorageIfAllowed() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function storageForThisVisit(): TokenStorage {
  const tokens = new Map<string, string>();
  return {
    getItem: (key) => tokens.get(key),
    setItem: (key, value) => void tokens.set(key, value),
    removeItem: (key) => void tokens.delete(key),
  };
}
