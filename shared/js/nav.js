// Mobile menu toggle. Desktop dropdowns are pure CSS (:hover / :focus-within);
// mobile submenus use native <details>/<summary> (no JS needed for those).
(function () {
  const toggle = document.querySelector("[data-nav-menu-toggle]");
  const panel = document.querySelector("[data-nav-mobile-panel]");
  if (!toggle || !panel) return;

  function closeMenu() {
    panel.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  function openMenu() {
    panel.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  toggle.addEventListener("click", () => {
    panel.classList.contains("open") ? closeMenu() : openMenu();
  });

  panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("open")) closeMenu();
  });
})();

// Any element linking to "#assistant" (nav dropdown item, hero "Ask AI"
// button, contextual prompts) opens the existing widget instead of
// navigating — clicks the widget's own toggle button, same as a user would.
document.addEventListener("click", (e) => {
  const trigger = e.target.closest('a[href="#assistant"], [data-open-assistant]');
  if (!trigger) return;
  e.preventDefault();
  const btn = document.querySelector(".assistant-toggle-btn");
  if (btn) btn.click();
});

