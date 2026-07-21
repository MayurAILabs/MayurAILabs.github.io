/* ==========================================================================
   enhance.js (added) — Additive visual polish only. Injects decorative layers
   (animated orbs, cursor glow, top loading bar) and wires scroll-reveal.
   Touches nothing that already exists: no app logic, no links, no nav, no
   command palette, no theme logic, no AI assistant. Fully degrades: if this
   file fails to load, the page renders exactly as before.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;

  // Flag the document so the reveal "hidden" CSS state only applies with JS on.
  root.classList.add("js-enhance");

  function onReady(fn) {
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  onReady(function () {
    var body = doc.body;
    if (!body) return;

    /* --- Animated gradient orbs (background layer) --- */
    if (!reduceMotion) {
      var orbs = doc.createElement("div");
      orbs.className = "ai-orbs";
      orbs.setAttribute("aria-hidden", "true");
      orbs.innerHTML = '<div class="ai-orb o1"></div><div class="ai-orb o2"></div><div class="ai-orb o3"></div>';
      body.insertBefore(orbs, body.firstChild);
    }

    /* --- Top loading shimmer bar (animates once, then removes itself) --- */
    if (!reduceMotion) {
      var bar = doc.createElement("div");
      bar.className = "ai-loadbar";
      bar.setAttribute("aria-hidden", "true");
      body.appendChild(bar);
      bar.addEventListener("animationend", function () {
        if (bar.parentNode) bar.parentNode.removeChild(bar);
      });
      // Safety net in case animationend never fires.
      setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 1600);
    }

    /* --- Cursor glow (desktop pointer only) --- */
    if (canHover && !reduceMotion) {
      var glow = doc.createElement("div");
      glow.className = "ai-cursor-glow";
      glow.setAttribute("aria-hidden", "true");
      body.appendChild(glow);
      var gx = 0, gy = 0, ticking = false;
      window.addEventListener("mousemove", function (e) {
        gx = e.clientX; gy = e.clientY;
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(function () {
            glow.style.transform = "translate3d(" + gx + "px," + gy + "px,0)";
            glow.classList.add("on");
            ticking = false;
          });
        }
      }, { passive: true });
      window.addEventListener("mouseleave", function () { glow.classList.remove("on"); }, { passive: true });
    }

    /* --- Scroll reveal ---
       A manual, self-contained scroll-position check (no IntersectionObserver
       dependency, which some environments don't dispatch reliably). Content is
       NEVER left permanently hidden: a safety timeout reveals everything, and
       reduced-motion / missing-target paths reveal immediately. */
    var revealSelector = ".section-head, .category-card, .card, .recent-card, .why-item";
    var targets = Array.prototype.slice.call(doc.querySelectorAll(revealSelector));

    if (reduceMotion || !targets.length) {
      targets.forEach(function (el) { el.classList.add("reveal", "in-view"); });
      return;
    }

    targets.forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = (i % 6) * 55 + "ms"; // progressive stagger
    });

    var pending = targets.slice();
    function reveal(el) { el.classList.add("in-view"); }

    function check() {
      if (!pending.length) return;
      var trigger = window.innerHeight * 0.92;
      pending = pending.filter(function (el) {
        if (el.getBoundingClientRect().top < trigger) { reveal(el); return false; }
        return true;
      });
    }

    var scheduled = false;
    function onScroll() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () { check(); scheduled = false; });
    }

    check(); // reveal whatever is above the fold right away
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Safety net: guarantee nothing stays hidden even if scroll never happens
    // or a target sits in an unusual scroll container.
    setTimeout(function () { targets.forEach(reveal); }, 2500);
  });
})();
