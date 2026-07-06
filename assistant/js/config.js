// Single source of truth for the assistant's copy, branding, and behavior.
// Nothing secret lives here — this file ships to the browser as-is.
export const assistantConfig = {
  name: "Mayur AI Labs Assistant",
  shortName: "Assistant",
  avatarInitials: "AI",
  onlineLabel: "Online",
  welcomeMessage:
    "Hi! I'm the Mayur AI Labs assistant. Ask me anything about the tools on this site, or any question you'd like help with.",

  // Absolute URL, not a same-origin relative path: this repo's index.html is
  // also reachable at the raw mayurailabs.github.io Pages domain (GitHub
  // always leaves that live even with a custom domain configured), and that
  // domain isn't fronted by the Cloudflare Worker route below. A relative
  // "/api/chat" would silently hit GitHub's static file server there
  // (405 Method Not Allowed) instead of the Worker. The Worker's CORS
  // allowlist (worker/src/config/assistant.config.js) already permits both
  // mayurailabs.co.in and mayurailabs.github.io as callers.
  apiEndpoint: "https://mayurailabs.co.in/api/chat",

  maxMessageLength: 4000,
  historyLimit: 10, // turns (user+assistant pairs) kept in sessionStorage and sent as context

  // Reserved for future features — inert today, flip on once implemented.
  ragEnabled: false,
  voiceEnabled: false,
};
