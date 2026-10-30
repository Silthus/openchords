import { describe, expect, test } from "bun:test";
import { isOffline } from "./connection";

const connection = { isWebSocketConnected: false, connectionRetries: 0 };

describe("when her phone counts as offline", () => {
  test("is online while the app connects the first time", () => {
    expect(isOffline(connection)).toBe(false);
  });

  test("is offline once connecting has failed", () => {
    expect(isOffline({ ...connection, connectionRetries: 1 })).toBe(true);
  });

  test("is online while connected", () => {
    expect(isOffline({ isWebSocketConnected: true, connectionRetries: 0 })).toBe(false);
  });
});
