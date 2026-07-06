// Relies on `marked`, `DOMPurify`, and `hljs` being loaded globally via CDN
// <script> tags in index.html (see assistant/js/index.js for the readiness check).

function addCopyButtons(container) {
  container.querySelectorAll("pre").forEach((pre) => {
    if (pre.dataset.copyReady) return;
    pre.dataset.copyReady = "true";
    pre.classList.add("assistant-code-block");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "assistant-copy-btn";
    button.textContent = "Copy";
    button.addEventListener("click", async () => {
      const code = pre.querySelector("code")?.textContent ?? "";
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = "✓ Copied!";
      } catch {
        button.textContent = "Copy failed";
      }
      setTimeout(() => {
        button.textContent = "Copy";
      }, 2000);
    });

    pre.appendChild(button);
  });
}

export function renderMarkdownInto(container, rawText) {
  const html = window.marked ? window.marked.parse(rawText) : escapeAsFallback(rawText);
  const clean = window.DOMPurify ? window.DOMPurify.sanitize(html) : escapeAsFallback(rawText);
  container.innerHTML = clean;

  if (window.hljs) {
    container.querySelectorAll("pre code").forEach((block) => window.hljs.highlightElement(block));
  }
  addCopyButtons(container);
}

function escapeAsFallback(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, "<br>");
}
