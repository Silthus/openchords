import type { TokenStorage } from "@convex-dev/auth/react";
import { readFromTheDevice, removeFromTheDevice, saveOnTheDevice } from "../deviceStorage";

const tokensForThisVisit = new Map<string, string>();

export const tokenStorage: TokenStorage = {
  getItem: (key) => tokensForThisVisit.get(key) ?? readFromTheDevice(key),
  setItem: (key, value) => {
    if (saveOnTheDevice(key, value)) tokensForThisVisit.delete(key);
    else tokensForThisVisit.set(key, value);
  },
  removeItem: (key) => {
    tokensForThisVisit.delete(key);
    removeFromTheDevice(key);
  },
};
