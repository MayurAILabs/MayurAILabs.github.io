// Gemini provider. Implements the shared provider interface:
//   stream({ apiKey, model, systemPrompt, messages, temperature, maxOutputTokens }) -> ReadableStream<string> (SSE passthrough, normalized)
//   generate(sameArgs) -> Promise<string>
// Adding a new provider (OpenAI/Claude/OpenRouter/DeepSeek) means creating a
// sibling file that implements the same two functions and registering it in
// providers/index.js — no other application code changes.

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

function buildRequestBody({ systemPrompt, messages, temperature, maxOutputTokens }) {
  return {
    contents: toGeminiContents(messages),
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };
}

// Re-emits Gemini's SSE stream as a stream of plain-text deltas, one per
// `data: {...}` line, so the route layer stays provider-agnostic.
function normalizeSseStream(upstreamBody) {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
          }
        } catch {
          // Ignore partial/malformed chunks; they resolve on the next pull.
        }
      }
    },
  });
}

export async function stream({ apiKey, model, systemPrompt, messages, temperature, maxOutputTokens }) {
  const url = `${API_ROOT}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildRequestBody({ systemPrompt, messages, temperature, maxOutputTokens })),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gemini stream request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  return normalizeSseStream(response.body);
}

export async function generate({ apiKey, model, systemPrompt, messages, temperature, maxOutputTokens }) {
  const url = `${API_ROOT}/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildRequestBody({ systemPrompt, messages, temperature, maxOutputTokens })),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const json = await response.json();
  return json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}
