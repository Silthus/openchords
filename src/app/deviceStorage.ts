export function readFromTheDevice(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveOnTheDevice(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeFromTheDevice(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    return;
  }
}
