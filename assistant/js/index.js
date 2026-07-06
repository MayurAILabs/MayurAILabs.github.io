import { assistantConfig } from "./config.js";
import { mountAssistantWidget } from "./components/widget.js";

function init() {
  mountAssistantWidget(assistantConfig);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
