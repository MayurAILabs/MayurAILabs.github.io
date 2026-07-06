import { el } from "../utils/dom.js";
import { createChatWindow } from "./chatWindow.js";

const CHAT_ICON = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;

export function mountAssistantWidget(config) {
  let isOpen = false;

  const toggleButton = el("button", {
    type: "button",
    class: "assistant-toggle-btn",
    "aria-label": `Open ${config.name}`,
    "aria-expanded": "false",
    html: CHAT_ICON,
  });

  const { element: windowEl, focusInput } = createChatWindow({ config, onClose: () => setOpen(false) });

  function setOpen(next) {
    isOpen = next;
    windowEl.classList.toggle("assistant-window-visible", isOpen);
    windowEl.setAttribute("aria-hidden", String(!isOpen));
    // Hidden (not just visually) while open: the window's own header close
    // button handles closing, and the launcher would otherwise sit on top of
    // the fullscreen mobile chat window and swallow clicks meant for it.
    toggleButton.classList.toggle("assistant-toggle-btn-hidden", isOpen);
    toggleButton.setAttribute("aria-expanded", String(isOpen));
    toggleButton.setAttribute("aria-label", `Open ${config.name}`);
    if (isOpen) {
      requestAnimationFrame(() => focusInput());
    }
  }

  toggleButton.addEventListener("click", () => setOpen(!isOpen));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) setOpen(false);
  });

  const root = el("div", { class: "assistant-widget-root" }, [windowEl, toggleButton]);
  document.body.appendChild(root);
}
