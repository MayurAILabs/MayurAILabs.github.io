/* ==========================================================================
   important-dates.js (added) — Renders the "Important Dates" sticky note.

   Behaviour:
     • Resolves recurring ("MM-DD") events to their next occurrence.
     • Drops anything already past, sorts nearest-first, shows days remaining.
     • Flags events within 7 days so the CSS can glow them.
     • Renders the local list immediately (zero network cost), then tries to
       enrich it with official Indian public holidays from a free, key-less
       API at idle time. If that fails for ANY reason the note keeps working.

   Self-contained and defensive: a failure here can never affect the rest of
   the page. Data lives in important-dates-data.js.
   ========================================================================== */
(function () {
  "use strict";

  var MAX_ITEMS = 5;
  var SOON_DAYS = 7;
  var API_TTL_MS = 24 * 60 * 60 * 1000;    // cache public holidays for a day
  var API_TIMEOUT_MS = 3500;
  var CACHE_KEY = "mayurailabs-holidays";

  var mount = document.getElementById("important-dates-list");
  if (!mount) return;                       // widget not on this page
  var footEl = document.getElementById("important-dates-foot");

  /* ---------------- date helpers ---------------- */
  function startOfToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function parseLocal(y, m, d) { return new Date(y, m - 1, d); }

  /** Resolve an event to its next upcoming Date (or null if gone for good). */
  function resolveDate(ev, today) {
    if (!ev || !ev.date) return null;
    var parts = String(ev.date).split("-").map(Number);

    if (ev.recurring) {
      if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
      var thisYear = parseLocal(today.getFullYear(), parts[0], parts[1]);
      return thisYear >= today ? thisYear : parseLocal(today.getFullYear() + 1, parts[0], parts[1]);
    }
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    var fixed = parseLocal(parts[0], parts[1], parts[2]);
    return fixed >= today ? fixed : null;    // one-off in the past → remove
  }

  function daysBetween(from, to) {
    return Math.round((to - from) / 86400000);
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /* Formatted explicitly rather than via toLocaleDateString: some ICU versions
     render September as "Sept", which breaks the uniform 3-letter column. */
  function fmtDate(d) {
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() +
           " · " + DAYS[d.getDay()];
  }

  function isoKey(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  /* ---------------- build the upcoming list ---------------- */
  function buildList(extraEvents) {
    var today = startOfToday();
    var source = (window.IMPORTANT_DATES || []).concat(extraEvents || []);
    var out = [];

    source.forEach(function (ev) {
      var when = resolveDate(ev, today);
      if (!when) return;
      out.push({
        title: ev.title,
        icon: ev.icon || "📅",
        category: ev.category || "national",
        when: when,
        days: daysBetween(today, when)
      });
    });

    out.sort(function (a, b) { return a.when - b.when; });

    // De-duplicate same title landing on the same day (local + API overlap).
    var seen = Object.create(null);
    return out.filter(function (e) {
      var k = isoKey(e.when) + "|" + e.title.toLowerCase();
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  /* ---------------- rendering ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function labelFor(e) {
    if (e.days === 0) return "today";
    if (e.days === 1) return "tomorrow, 1 day left";
    return e.days + " days left";
  }

  function render(events) {
    var list = events.slice(0, MAX_ITEMS);

    if (!list.length) {
      mount.innerHTML = '<li class="idates-msg">No upcoming dates right now.</li>';
      return;
    }

    mount.innerHTML = list.map(function (e) {
      var soon = e.days <= SOON_DAYS ? " is-soon" : "";
      var pill = e.days === 0
        ? '<b style="font-size:11px">Today</b>'
        : '<b>' + e.days + '</b><small>' + (e.days === 1 ? "day" : "days") + '</small>';

      return '<li class="idates-item cat-' + esc(e.category) + soon + '" tabindex="0" ' +
             'aria-label="' + esc(e.title) + ', ' + esc(fmtDate(e.when)) + ', ' + esc(labelFor(e)) + '">' +
               '<span class="idates-icon" aria-hidden="true">' + esc(e.icon) + '</span>' +
               '<span class="idates-body">' +
                 '<span class="idates-name">' + esc(e.title) + '</span>' +
                 '<span class="idates-date">' + esc(fmtDate(e.when)) + '</span>' +
               '</span>' +
               '<span class="idates-days" aria-hidden="true">' + pill + '</span>' +
             '</li>';
    }).join("");
  }

  /* ---------------- optional: official public holidays ---------------- */
  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || (Date.now() - obj.t) > API_TTL_MS) return null;
      return obj.v;
    } catch (e) { return null; }
  }

  function writeCache(v) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {}
  }

  function fetchYear(year) {
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctl && setTimeout(function () { ctl.abort(); }, API_TIMEOUT_MS);
    return fetch("https://date.nager.at/api/v3/PublicHolidays/" + year + "/IN",
                 ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) {
        if (timer) clearTimeout(timer);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (rows) {
        return (rows || []).map(function (h) {
          return { title: h.localName || h.name, date: h.date, category: "national", icon: "🎊", recurring: false };
        });
      });
  }

  function enrichWithHolidays(baseRender) {
    var cached = readCache();
    if (cached) { baseRender(cached); return; }

    var y = new Date().getFullYear();
    Promise.all([fetchYear(y), fetchYear(y + 1)])
      .then(function (res) {
        var merged = res[0].concat(res[1]);
        if (merged.length) { writeCache(merged); baseRender(merged); }
      })
      .catch(function () {
        /* Offline, blocked, rate-limited, CORS — silently keep the local list. */
      });
  }

  /* ---------------- boot ---------------- */
  function paint(extra) {
    var events = buildList(extra);
    render(events);
    if (footEl) {
      footEl.textContent = extra && extra.length
        ? "Auto-updated · includes official public holidays"
        : "Auto-updated daily";
    }
  }

  paint(null);   // instant, local-only — no network on the critical path

  // Enrich later, when the browser is idle, so page load is untouched.
  var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1200); };
  idle(function () {
    try { enrichWithHolidays(paint); } catch (e) {}
  });
})();
