// Theme toggle + persistence. The blocking inline snippet in each page's
// <head> (see any page's <head> for the ~4-line copy) sets data-theme
// before first paint to avoid a flash of the wrong theme; this file only
// wires up the toggle button once the DOM is ready.
const THEME_KEY = "mayurailabs-theme";

function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    btn.setAttribute("aria-label", theme === "light" ? "Switch to dark theme" : "Switch to light theme");
  });
}

function initThemeToggle() {
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(getTheme() === "light" ? "dark" : "light"));
  });
  setTheme(getTheme());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThemeToggle);
} else {
  initThemeToggle();
}
