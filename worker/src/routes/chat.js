import { corsHeaders } from "../middleware/cors.js";
import { checkRateLimit } from "../middleware/rateLimit.js";
import { parseJsonBody, validateChatRequest } from "../middleware/validate.js";
import { getChatAnswer, streamChatResponse } from "../services/chatService.js";

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export async function handleChat(request, env, config) {
  const cors = corsHeaders(request, config);

  const rate = await checkRateLimit(request, env, config);
  if (!rate.ok) {
    return jsonResponse({ error: "Too many requests. Please slow down and try again shortly." }, 429, cors);
  }

  const parsed = await parseJsonBody(request, config);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, 400, cors);
  }

  const validated = validateChatRequest(parsed.body, config);
  if (!validated.ok) {
    return jsonResponse({ error: validated.error }, 400, cors);
  }

  const url = new URL(request.url);
  const wantsStream = url.searchParams.get("stream") !== "false";

  if (!wantsStream) {
    try {
      const answer = await getChatAnswer({ env, config, message: validated.message, history: validated.history });
      return jsonResponse({ answer }, 200, cors);
    } catch (err) {
      console.error("handleChat: getChatAnswer failed:", err instanceof Error ? err.message : err);
      return jsonResponse({ error: "The assistant is temporarily unavailable. Please try again." }, 502, cors);
    }
  }

  const stream = streamChatResponse({ env, config, message: validated.message, history: validated.history });
  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      ...cors,
    },
  });
}
