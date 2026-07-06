const VALID_ROLES = new Set(["user", "assistant"]);

// Validates the parsed request body against config limits. Returns
// { ok: true, message, history } or { ok: false, error }.
export function validateChatRequest(body, config) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const { message, history } = body;

  if (typeof message !== "string" || message.trim().length === 0) {
    return { ok: false, error: "`message` is required and must be a non-empty string." };
  }
  if (message.length > config.maxMessageLength) {
    return { ok: false, error: `\`message\` exceeds the maximum length of ${config.maxMessageLength} characters.` };
  }

  if (history !== undefined) {
    if (!Array.isArray(history)) {
      return { ok: false, error: "`history` must be an array." };
    }
    if (history.length > config.maxHistoryEntries) {
      return { ok: false, error: `\`history\` exceeds the maximum of ${config.maxHistoryEntries} entries.` };
    }
    for (const entry of history) {
      if (
        !entry ||
        typeof entry !== "object" ||
        !VALID_ROLES.has(entry.role) ||
        typeof entry.content !== "string" ||
        entry.content.length > config.maxMessageLength
      ) {
        return { ok: false, error: "Each `history` entry must be { role: 'user'|'assistant', content: string }." };
      }
    }
  }

  return { ok: true, message: message.trim(), history: history ?? [] };
}

export async function parseJsonBody(request, config) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > config.maxBodyBytes) {
    return { ok: false, error: "Request body too large." };
  }
  try {
    const text = await request.text();
    if (text.length > config.maxBodyBytes) {
      return { ok: false, error: "Request body too large." };
    }
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, error: "Request body must be valid JSON." };
  }
}
