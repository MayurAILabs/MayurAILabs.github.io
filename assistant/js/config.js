// Single source of truth for the assistant's copy, branding, and behavior.
// Nothing secret lives here — this file ships to the browser as-is.
export const assistantConfig = {
  name: "Mayur AI Labs Assistant",
  shortName: "Assistant",
  avatarInitials: "AI",
  onlineLabel: "Online",
  welcomeMessage:
    "Hi! I'm the Mayur AI Labs assistant. Ask me anything about the tools on this site, or any question you'd like help with.",

  // Same-origin relative path. Cloudflare routes mayurailabs.co.in/api/*
  // directly to the dedicated ai-assistant-api Worker (more specific than
  // the existing catch-all proxy route), so no absolute URL is needed here.
  apiEndpoint: "/api/chat",

  maxMessageLength: 4000,
  historyLimit: 10, // turns (user+assistant pairs) kept in sessionStorage and sent as context

  // Reserved for future features — inert today, flip on once implemented.
  ragEnabled: false,
  voiceEnabled: false,
};
