import { el } from "../utils/dom.js";

export function createTypingIndicator() {
  const dots = el("div", { class: "assistant-typing-dots" }, [
    el("span", {}),
    el("span", {}),
    el("span", {}),
  ]);
  return el("div", { class: "assistant-msg assistant-msg-assistant assistant-msg-typing" }, [
    el("div", { class: "assistant-msg-bubble" }, [dots]),
  ]);
}
