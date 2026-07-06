import { el, formatTimestamp } from "../utils/dom.js";
import { renderMarkdownInto } from "../utils/markdown.js";

// Creates a message bubble and returns { element, contentEl } so callers can
// keep updating contentEl (used for live-streaming the assistant's reply).
export function createBubble(role, timestamp = new Date()) {
  const contentEl = el("div", { class: "assistant-msg-content" });
  const bubble = el("div", { class: "assistant-msg-bubble" }, [contentEl]);
  const time = el("div", { class: "assistant-msg-time" }, formatTimestamp(timestamp));
  const element = el("div", { class: `assistant-msg assistant-msg-${role}` }, [bubble, time]);
  return { element, contentEl };
}

export function renderUserText(contentEl, text) {
  contentEl.textContent = text;
}

export function renderAssistantMarkdown(contentEl, rawText) {
  renderMarkdownInto(contentEl, rawText);
}
