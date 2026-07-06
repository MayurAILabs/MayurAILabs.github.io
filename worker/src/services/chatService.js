import { getProvider } from "../providers/index.js";
import { systemPrompt } from "../prompts/systemPrompt.js";

function buildMessages(history, message, historyLimit) {
  const trimmed = history.slice(-historyLimit * 2);
  return [...trimmed, { role: "user", content: message }];
}

// Streams normalized `data: {"delta": "..."}\n\n` chunks, followed by a
// final `data: {"done": true}\n\n` (or `data: {"error": "..."}\n\n` on failure).
export function streamChatResponse({ env, config, message, history }) {
  const provider = getProvider(config.provider);
  const messages = buildMessages(history, message, config.historyLimit);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const upstream = await provider.stream({
          apiKey: env.GEMINI_API_KEY,
          model: config.model,
          systemPrompt,
          messages,
          temperature: config.temperature,
          maxOutputTokens: config.maxOutputTokens,
        });
        const reader = upstream.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (err) {
        console.error("streamChatResponse: provider call failed:", err instanceof Error ? err.message : err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "The assistant is temporarily unavailable. Please try again." })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });
}

export async function getChatAnswer({ env, config, message, history }) {
  const provider = getProvider(config.provider);
  const messages = buildMessages(history, message, config.historyLimit);
  const answer = await provider.generate({
    apiKey: env.GEMINI_API_KEY,
    model: config.model,
    systemPrompt,
    messages,
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
  });
  return answer;
}
