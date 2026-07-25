/* ==========================================================================
   important-dates.js (added) — Renders the "Important Dates" sticky note.

   Behaviour:
     • Resolves recurring ("MM-DD") events to their next occurrence.
     • Drops anything already past, sorts nearest-first, shows days remaining.
     • Only shows events within the next WINDOW_DAYS (6 weeks) — a recurring
       event whose next occurrence is further out than that (e.g. an annual
       deadline the day after it passes) simply isn't shown until it comes
       back within the window, rather than jumping straight to next year.
     • Never shows more than MAX_ITEMS, even if more than that fall within
       the window — keeps the note's height within what it was designed for.
       Since the list is already nearest-first, this drops the *farthest*
       (least urgent) events first, never the soonest ones.
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

  var WINDOW_DAYS = 42;   // 6 weeks — events resolving further out than this aren't shown
  var MAX_ITEMS = 5;      // height budget the note was calibrated for; trims the farthest events
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

  /** Resolve a recurring event's date for one specific year, honouring a
      per-year override if one is set (e.g. a government deadline that got
      extended that year only). Falls back to the base "MM-DD" otherwise. */
  function recurringDateForYear(ev, year, monthDay) {
    var override = ev.overrides && ev.overrides[year];
    if (override) {
      var p = String(override).split("-").map(Number);
      if (p.length === 3 && !p.some(isNaN)) return parseLocal(p[0], p[1], p[2]);
    }
    return parseLocal(year, monthDay[0], monthDay[1]);
  }

  /** Resolve an event to its next upcoming Date (or null if gone for good). */
  function resolveDate(ev, today) {
    if (!ev || !ev.date) return null;
    var parts = String(ev.date).split("-").map(Number);

    if (ev.recurring) {
      if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
      var thisYear = recurringDateForYear(ev, today.getFullYear(), parts);
      return thisYear >= today ? thisYear : recurringDateForYear(ev, today.getFullYear() + 1, parts);
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
      var days = daysBetween(today, when);
      if (days > WINDOW_DAYS) return;   // outside the 6-week window — don't show yet
      out.push({
        title: ev.title,
        icon: ev.icon || "📅",
        category: ev.category || "national",
        when: when,
        days: days
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
    // Already filtered to the 6-week window and sorted nearest-first by
    // buildList(); slicing here just caps the height, dropping the
    // farthest-out events first if more than MAX_ITEMS qualify.
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
