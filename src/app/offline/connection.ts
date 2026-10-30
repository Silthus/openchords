import type { ConnectionState } from "convex/browser";

export function isOffline({ isWebSocketConnected, connectionRetries }: Pick<ConnectionState, "isWebSocketConnected" | "connectionRetries">) {
  return !isWebSocketConnected && connectionRetries > 0;
}
