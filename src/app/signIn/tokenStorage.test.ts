import { describe, expect, test } from "bun:test";
import { tokenStorageFrom } from "./tokenStorage";

function aDeviceStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

function aFullDeviceStorage(): Storage {
  return {
    ...aDeviceStorage(),
    setItem: () => {
      throw new DOMException("Storage is full.", "QuotaExceededError");
    },
  };
}

function aNearlyFullDeviceStorage(): Storage {
  const device = aDeviceStorage();
  return {
    ...device,
    setItem: (key, value) => {
      if (value.length > 100) throw new DOMException("Storage is full.", "QuotaExceededError");
      device.setItem(key, value);
    },
  };
}

function aDeniedDeviceStorage(): Storage {
  throw new DOMException("Storage is denied.", "SecurityError");
}

describe("sign-in tokens are kept", () => {
  test("in the browser's own storage when it saves", async () => {
    const device = aDeviceStorage();
    Object.assign(globalThis, { window: { localStorage: device } });
    try {
      const { tokenStorage } = await import(`./tokenStorage?${crypto.randomUUID()}`);
      expect(tokenStorage).toBe(device);
    } finally {
      Reflect.deleteProperty(globalThis, "window");
    }
  });

  test("on the device itself when it saves, so other tabs see the sign-in", () => {
    const device = aDeviceStorage();
    expect(tokenStorageFrom(() => device)).toBe(device);
    expect(device.length).toBe(0);
  });

  test.each([
    ["full", aFullDeviceStorage],
    ["too full for a sign-in", aNearlyFullDeviceStorage],
    ["denied", aDeniedDeviceStorage],
  ])("for the visit when device storage is %s", (_, device) => {
    const tokens = tokenStorageFrom(device);
    tokens.setItem("jwt", "token");
    expect(tokens.getItem("jwt")).toBe("token");
    tokens.removeItem("jwt");
    expect(tokens.getItem("jwt")).toBeUndefined();
  });
});
