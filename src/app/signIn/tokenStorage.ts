import type { TokenStorage } from "@convex-dev/auth/react";

export const tokenStorage = tokenStorageFrom(() => window.localStorage);

export function tokenStorageFrom(deviceStorage: () => Storage): TokenStorage {
  return deviceStorageThatSaves(deviceStorage) ?? storageForThisVisit();
}

const probe = "openchords.storageProbe";
const roomForASignIn = "x".repeat(8 * 1024);

function deviceStorageThatSaves(deviceStorage: () => Storage) {
  try {
    const storage = deviceStorage();
    storage.setItem(probe, roomForASignIn);
    storage.removeItem(probe);
    return storage;
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
