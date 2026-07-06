import { assistantConfig } from "./config/assistant.config.js";
import { corsHeaders, handlePreflight } from "./middleware/cors.js";
import { handleChat } from "./routes/chat.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const preflight = handlePreflight(request, assistantConfig);
    if (preflight) return preflight;

    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        return await handleChat(request, env, assistantConfig);
      } catch (err) {
        console.error("fetch: unhandled error:", err instanceof Error ? err.message : err);
        return new Response(JSON.stringify({ error: "Internal server error." }), {
          status: 500,
          headers: { "content-type": "application/json", ...corsHeaders(request, assistantConfig) },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not found." }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  },
};
