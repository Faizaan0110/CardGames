const KEY = "cardroom_session";

export function getSavedSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.code) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(token, code) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, code }));
  } catch {
    // localStorage unavailable (private browsing, etc.) — reconnect just won't
    // work for this browser; nothing else in the app depends on it.
  }
}

export function clearSavedSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
