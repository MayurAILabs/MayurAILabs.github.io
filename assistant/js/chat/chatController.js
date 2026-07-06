import { createBubble, renderAssistantMarkdown, renderUserText } from "../components/message.js";
import { createTypingIndicator } from "../components/typingIndicator.js";
import { loadHistory, saveHistory, clearHistory } from "../utils/storage.js";
import { sendMessage } from "./api.js";

export function createChatController({ messagesEl, config, onWelcomeReset }) {
  let history = loadHistory();

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendUserMessage(text) {
    const { element, contentEl } = createBubble("user");
    renderUserText(contentEl, text);
    messagesEl.appendChild(element);
    scrollToBottom();
  }

  async function sendUserMessage(rawText) {
    const text = rawText.trim();
    if (!text) return;
    if (text.length > config.maxMessageLength) {
      appendSystemNotice(`Message is too long (max ${config.maxMessageLength} characters).`);
      return;
    }

    appendUserMessage(text);
    const requestHistory = history.slice(-config.historyLimit * 2);
    history.push({ role: "user", content: text, timestamp: Date.now() });
    saveHistory(history, config.historyLimit);

    const typing = createTypingIndicator();
    messagesEl.appendChild(typing);
    scrollToBottom();

    let assistantEl = null;
    let contentEl = null;
    let buffer = "";

    const ensureAssistantBubble = () => {
      if (assistantEl) return;
      typing.remove();
      const bubble = createBubble("assistant");
      assistantEl = bubble.element;
      contentEl = bubble.contentEl;
      messagesEl.appendChild(assistantEl);
    };

    await sendMessage(
      { endpoint: config.apiEndpoint, message: text, history: requestHistory },
      {
        onDelta: (delta) => {
          ensureAssistantBubble();
          buffer += delta;
          renderAssistantMarkdown(contentEl, buffer);
          scrollToBottom();
        },
        onDone: () => {
          if (!assistantEl) {
            ensureAssistantBubble();
            renderAssistantMarkdown(contentEl, "I didn't get a response — please try again.");
          }
          history.push({ role: "assistant", content: buffer, timestamp: Date.now() });
          saveHistory(history, config.historyLimit);
          scrollToBottom();
        },
        onError: (errorMessage) => {
          ensureAssistantBubble();
          renderAssistantMarkdown(contentEl, buffer || `⚠️ ${errorMessage}`);
          scrollToBottom();
        },
      }
    );
  }

  function appendSystemNotice(text) {
    const { element, contentEl } = createBubble("system");
    contentEl.textContent = text;
    messagesEl.appendChild(element);
    scrollToBottom();
  }

  function clearChat() {
    history = [];
    clearHistory();
    messagesEl.innerHTML = "";
    onWelcomeReset?.();
  }

  return { sendUserMessage, clearChat, getHistory: () => history };
}
