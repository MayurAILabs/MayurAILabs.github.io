import { el } from "../utils/dom.js";
import { createBubble, renderAssistantMarkdown } from "./message.js";
import { createChatController } from "../chat/chatController.js";

export function createChatWindow({ config, onClose }) {
  const messagesEl = el("div", { class: "assistant-messages" });

  function showWelcome() {
    const { element, contentEl } = createBubble("assistant");
    renderAssistantMarkdown(contentEl, config.welcomeMessage);
    messagesEl.appendChild(element);
  }
  showWelcome();

  const controller = createChatController({ messagesEl, config, onWelcomeReset: showWelcome });

  const textarea = el("textarea", {
    class: "assistant-textarea",
    placeholder: "Type a message…",
    rows: "1",
    "aria-label": "Message",
  });

  const sendButton = el(
    "button",
    { type: "button", class: "assistant-send-btn", "aria-label": "Send message" },
    "➤"
  );

  function autoResize() {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  function handleSend() {
    const text = textarea.value;
    if (!text.trim()) return;
    textarea.value = "";
    autoResize();
    controller.sendUserMessage(text);
  }

  textarea.addEventListener("input", autoResize);
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  sendButton.addEventListener("click", handleSend);

  const clearButton = el(
    "button",
    { type: "button", class: "assistant-icon-btn", title: "Clear chat", "aria-label": "Clear chat" },
    "🗑"
  );
  clearButton.addEventListener("click", () => controller.clearChat());

  const closeButton = el(
    "button",
    { type: "button", class: "assistant-icon-btn", title: "Close", "aria-label": "Close chat" },
    "✕"
  );
  closeButton.addEventListener("click", () => onClose());

  const header = el("div", { class: "assistant-header" }, [
    el("div", { class: "assistant-header-info" }, [
      el("div", { class: "assistant-avatar" }, config.avatarInitials),
      el("div", {}, [
        el("div", { class: "assistant-name" }, config.name),
        el("div", { class: "assistant-status" }, [el("span", { class: "assistant-online-dot" }), config.onlineLabel]),
      ]),
    ]),
    el("div", { class: "assistant-header-actions" }, [clearButton, closeButton]),
  ]);

  const inputRow = el("div", { class: "assistant-input-row" }, [textarea, sendButton]);

  const element = el(
    "div",
    { class: "assistant-window", role: "dialog", "aria-label": config.name, "aria-hidden": "true" },
    [header, messagesEl, inputRow]
  );

  return { element, focusInput: () => textarea.focus() };
}
