const STORAGE_KEY = "mayurailabs.assistant.history";

// History entries are { role: 'user'|'assistant', content: string, timestamp: number }.
export function loadHistory() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(history, historyLimit) {
  const trimmed = history.slice(-historyLimit * 2);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // sessionStorage unavailable (e.g. private mode quota) — chat still works, just isn't persisted.
  }
  return trimmed;
}

export function clearHistory() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
