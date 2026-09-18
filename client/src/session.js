const KEY = "cardroom_session";
const NAME_KEY = "cardroom_display_name";

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

// The display name is remembered independently of any room/session - so it's
// pre-filled the next time this browser creates or joins a room, even a
// brand new one, not just when resuming a room already in progress.
export function getSavedName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function saveName(name) {
  try {
    if (name && name.trim()) localStorage.setItem(NAME_KEY, name.trim());
  } catch {
    // ignore
  }
}

// Same idea as the name, for the chosen profile photo - it's already a small
// resized data URL (a few KB), well within what localStorage can hold.
const AVATAR_KEY = "cardroom_avatar";

export function getSavedAvatar() {
  try {
    return localStorage.getItem(AVATAR_KEY) || null;
  } catch {
    return null;
  }
}

export function saveAvatar(avatarUrl) {
  try {
    if (avatarUrl) {
      localStorage.setItem(AVATAR_KEY, avatarUrl);
    } else {
      localStorage.removeItem(AVATAR_KEY);
    }
  } catch {
    // localStorage unavailable or quota exceeded - avatar just won't persist for next time
  }
}
