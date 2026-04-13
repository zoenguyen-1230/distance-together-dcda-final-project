export function readBrowserStorage(key: string | null) {
  if (!key || typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeBrowserStorage(key: string | null, value: string) {
  if (!key || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore web storage issues and let async persistence continue.
  }
}

export function removeBrowserStorage(key: string | null) {
  if (!key || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore web storage issues and let async persistence continue.
  }
}
