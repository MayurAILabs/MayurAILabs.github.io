// Non-secret assistant configuration. The API key itself is never here —
// it is only ever read from `env.GEMINI_API_KEY` (a Wrangler secret).
export const assistantConfig = {
  provider: "gemini",
  model: "gemini-2.5-flash",
  temperature: 0.7,
  maxOutputTokens: 2048,

  // Grounds answers in live Google Search results (current events, recent
  // dates, anything past the model's training cutoff) instead of relying
  // solely on training data. Native Gemini capability, not the custom
  // website-content RAG reserved under ragEnabled below.
  webSearchEnabled: true,

  // How many prior turns (user+assistant pairs) to forward as context.
  historyLimit: 10,

  // Per-request input limits. maxMessageLength bounds the live message the
  // user is typing right now. maxHistoryEntryLength bounds each *stored*
  // turn sent back as context — this must stay well above maxMessageLength,
  // since past assistant replies (up to maxOutputTokens) are routinely
  // longer than a typed message. maxBodyBytes is sized to comfortably fit
  // a full maxHistoryEntries-turn conversation at these per-entry limits.
  maxMessageLength: 4000,
  maxHistoryEntryLength: 12_000,
  maxHistoryEntries: 20,
  maxBodyBytes: 150_000,

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
