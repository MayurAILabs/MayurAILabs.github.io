// Non-secret assistant configuration. The API key itself is never here —
// it is only ever read from `env.GEMINI_API_KEY` (a Wrangler secret).
export const assistantConfig = {
  provider: "gemini",
  model: "gemini-2.5-flash",
  temperature: 0.7,
  maxOutputTokens: 2048,

  // How many prior turns (user+assistant pairs) to forward as context.
  historyLimit: 10,

  // Per-request input limits.
  maxMessageLength: 4000,
  maxHistoryEntries: 20,
  maxBodyBytes: 32_000,

  // Origins allowed to call this API.
  allowedOrigins: [
    "https://mayurailabs.co.in",
    "https://www.mayurailabs.co.in",
    "https://mayurailabs.github.io",
  ],
  allowLocalhostOrigins: true, // enables http(s)://localhost:* during development

  rateLimit: {
    bindingName: "CHAT_RATE_LIMITER",
  },

  // Reserved for future features — inert today.
  ragEnabled: false,
  voiceEnabled: false,
};
