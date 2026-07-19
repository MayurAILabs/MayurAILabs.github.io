// Command palette: Ctrl+K / Cmd+K, fuzzy search, keyboard nav, grouped results.
(function () {
  const DATA = window.MAYURAI_SEARCH_INDEX || [];
  const RECENTS_KEY = "mayurailabs-recent-searches";
  const MAX_RECENTS = 4;

  const overlay = document.querySelector("[data-cmdk-overlay]");
  if (!overlay) return;
  const panel = overlay.querySelector("[data-cmdk-panel]");
  const input = overlay.querySelector("[data-cmdk-input]");
  const resultsEl = overlay.querySelector("[data-cmdk-results]");

  let items = [];
  let activeIndex = 0;

  function getRecents() {
    try { return JSON.parse(sessionStorage.getItem(RECENTS_KEY) || "[]"); } catch (_) { return []; }
  }

  function addRecent(title) {
    const recents = getRecents().filter((t) => t !== title);
    recents.unshift(title);
    try { sessionStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS))); } catch (_) {}
  }

  // Simple subsequence fuzzy match: all query chars must appear in order.
  // Score rewards contiguous matches and matches near the start of the string.
  function fuzzyScore(query, text) {
    if (!query) return 1;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    let qi = 0, score = 0, streak = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) {
        streak++;
        score += 1 + streak * 0.5 + (ti < 6 ? 1 : 0);
        qi++;
      } else {
        streak = 0;
      }
    }
    return qi === q.length ? score : -1;
  }

  function search(query) {
    if (!query.trim()) return null;
    return DATA
      .map((item) => ({ item, score: fuzzyScore(query, item.title + " " + item.keywords + " " + item.desc) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  }

  function groupByCategory(list) {
    const groups = {};
    list.forEach((item) => {
      (groups[item.category] = groups[item.category] || []).push(item);
    });
    return groups;
  }

  function render(query) {
    const results = search(query);
    let list;
    let headingForRecents = false;

    if (results === null) {
      const recents = getRecents().map((t) => DATA.find((d) => d.title === t)).filter(Boolean);
      list = recents.length ? recents : DATA;
      headingForRecents = recents.length > 0;
    } else {
      list = results;
    }

    items = list;
    activeIndex = 0;

    if (!list.length) {
      resultsEl.innerHTML = '<div class="cmdk-empty">No results found.</div>';
      return;
    }

    if (results === null) {
      const label = headingForRecents ? "Recent" : "Popular tools";
      resultsEl.innerHTML = `<div class="cmdk-group-label">${label}</div>` + list.map((item, i) => renderItem(item, i)).join("");
    } else {
      const groups = groupByCategory(list);
      let html = "";
      let i = 0;
      Object.keys(groups).forEach((cat) => {
        html += `<div class="cmdk-group-label">${cat}</div>`;
        groups[cat].forEach((item) => { html += renderItem(item, i); i++; });
      });
      resultsEl.innerHTML = html;
    }
    updateActive();
  }

  function renderItem(item, index) {
    return `<a class="cmdk-item" href="${item.url}" data-index="${index}">
      <span class="icon">${item.icon}</span>
      <span class="meta"><span class="title">${item.title}</span><span class="desc">${item.desc}</span></span>
      <span class="cat">${item.category}</span>
    </a>`;
  }

  function updateActive() {
    resultsEl.querySelectorAll(".cmdk-item").forEach((el, i) => {
      el.classList.toggle("active", i === activeIndex);
      if (i === activeIndex) el.scrollIntoView({ block: "nearest" });
    });
  }

  function activate(item) {
    addRecent(item.title);
    close();
    if (item.url === "#assistant") {
      const btn = document.querySelector(".assistant-toggle-btn");
      if (btn) btn.click();
    } else {
      window.location.href = item.url;
    }
  }

  function open() {
    overlay.classList.add("open");
    input.value = "";
    render("");
    setTimeout(() => input.focus(), 10);
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  document.addEventListener("keydown", (e) => {
    const isK = e.key === "k" || e.key === "K";
    if ((e.metaKey || e.ctrlKey) && isK) {
      e.preventDefault();
      overlay.classList.contains("open") ? close() : open();
      return;
    }
    if (!overlay.classList.contains("open")) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, items.length - 1); updateActive(); }
    if (e.key === "ArrowUp") { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); updateActive(); }
    if (e.key === "Enter") { e.preventDefault(); if (items[activeIndex]) activate(items[activeIndex]); }
  });

  document.querySelectorAll("[data-cmdk-trigger]").forEach((el) => el.addEventListener("click", (e) => { e.preventDefault(); open(); }));

  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  panel.addEventListener("click", (e) => e.stopPropagation());

  resultsEl.addEventListener("click", (e) => {
    const a = e.target.closest(".cmdk-item");
    if (!a) return;
    e.preventDefault();
    const idx = Number(a.dataset.index);
    if (items[idx]) activate(items[idx]);
  });

  input.addEventListener("input", () => render(input.value));
})();
