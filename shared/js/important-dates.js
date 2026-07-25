/* ==========================================================================
   important-dates.js (added) — Renders the "Important Dates" sticky note.

   Behaviour:
     • Resolves recurring ("MM-DD") events to their next occurrence.
     • Drops anything already past, sorts nearest-first, shows days remaining.
     • Flags events within 7 days so the CSS can glow them.
     • Renders entirely from the local curated list (see
       important-dates-data.js) — no network requests.

   NOTE: an earlier version also tried to enrich this list with public
   holidays from a free API (date.nager.at) at idle time. That API does not
   have any data for India (confirmed: every PublicHolidays request for
   India, for any year, returns 204 No Content, and India isn't in its
   AvailableCountries list either), so the enrichment could never succeed
   and was removed. If a genuine free, key-less, CORS-enabled India holiday
   API turns up in the future, it can be reintroduced the same way this one
   was (render local list immediately, enrich at idle, fail silently).

   Self-contained and defensive: a failure here can never affect the rest of
   the page. Data lives in important-dates-data.js.
   ========================================================================== */
(function () {
  "use strict";

  var MAX_ITEMS = 5;
  var SOON_DAYS = 7;

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
  function buildList() {
    var today = startOfToday();
    var source = window.IMPORTANT_DATES || [];
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

    // De-duplicate same title landing on the same day (defends against
    // accidental duplicate entries in important-dates-data.js).
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

  /* ---------------- boot ---------------- */
  render(buildList());
  if (footEl) footEl.textContent = "Auto-updated daily";
})();
