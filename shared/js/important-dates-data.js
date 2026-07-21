/* ==========================================================================
   important-dates-data.js (added) — Data source for the "Important Dates"
   sticky note. Edit ONLY this file to add/update events; the widget UI
   (important-dates.js) never needs to change.

   Each event:
     title     — display name
     date      — "MM-DD"      when recurring: true  (same date every year)
                 "YYYY-MM-DD" when recurring: false (one specific occurrence)
     category  — "festival" | "government" | "national" | "international"
     icon      — emoji shown next to the title
     recurring — true  => auto-rolls to the next year once this year's passes
                 false => disappears for good after it passes

   ⚠️ MAINTENANCE NOTE: Lunar/Hindu- and Islamic-calendar festivals (Diwali,
   Holi, Eid, Ganesh Chaturthi, etc.) shift every year, so they are listed as
   recurring:false with explicit dates and MUST be refreshed annually. The
   dates below are best-effort and should be verified against an official
   panchang/calendar before each year. Fixed-date events (Republic Day, ITR
   deadline, etc.) are recurring:true and need no upkeep.
   ========================================================================== */

window.IMPORTANT_DATES = [
  /* ---------------- Government deadlines (fixed dates) ---------------- */
  { title: "ITR Filing Last Date",   date: "07-31", category: "government", icon: "💼", recurring: true },
  { title: "Advance Tax — 1st Instalment", date: "06-15", category: "government", icon: "🧾", recurring: true },
  { title: "Advance Tax — 2nd Instalment", date: "09-15", category: "government", icon: "🧾", recurring: true },
  { title: "Advance Tax — 3rd Instalment", date: "12-15", category: "government", icon: "🧾", recurring: true },
  { title: "Advance Tax — 4th Instalment", date: "03-15", category: "government", icon: "🧾", recurring: true },

  /* ---------------- National days (fixed dates) ---------------- */
  { title: "Republic Day",       date: "01-26", category: "national", icon: "🇮🇳", recurring: true },
  { title: "Independence Day",   date: "08-15", category: "national", icon: "🇮🇳", recurring: true },
  { title: "Gandhi Jayanti",     date: "10-02", category: "national", icon: "🕊️", recurring: true },
  { title: "National Science Day", date: "02-28", category: "national", icon: "🔬", recurring: true },
  { title: "Doctor's Day",       date: "07-01", category: "national", icon: "🩺", recurring: true },
  { title: "Teacher's Day",      date: "09-05", category: "national", icon: "📚", recurring: true },
  { title: "Engineer's Day",     date: "09-15", category: "national", icon: "⚙️", recurring: true },
  { title: "Children's Day",     date: "11-14", category: "national", icon: "🧒", recurring: true },

  /* ---------------- International observances (fixed dates) ---------------- */
  { title: "World Environment Day",     date: "06-05", category: "international", icon: "🌍", recurring: true },
  { title: "International Yoga Day",    date: "06-21", category: "international", icon: "🧘", recurring: true },

  /* ---------------- Festivals with fixed dates ---------------- */
  { title: "Makar Sankranti", date: "01-14", category: "festival", icon: "🪁", recurring: true },
  { title: "Pongal",          date: "01-14", category: "festival", icon: "🌾", recurring: true },
  { title: "Christmas",       date: "12-25", category: "festival", icon: "🎄", recurring: true },

  /* ---------------- Variable-date festivals — VERIFY ANNUALLY ---------------- */
  /* 2026 */
  { title: "Mahashivratri",     date: "2026-02-15", category: "festival", icon: "🔱", recurring: false },
  { title: "Eid al-Fitr",       date: "2026-03-20", category: "festival", icon: "🌙", recurring: false },
  { title: "Holi",              date: "2026-03-04", category: "festival", icon: "🎨", recurring: false },
  { title: "Eid al-Adha",       date: "2026-05-27", category: "festival", icon: "🌙", recurring: false },
  { title: "Onam",              date: "2026-08-26", category: "festival", icon: "🌸", recurring: false },
  { title: "Raksha Bandhan",    date: "2026-08-28", category: "festival", icon: "🪢", recurring: false },
  { title: "Janmashtami",       date: "2026-09-04", category: "festival", icon: "🪈", recurring: false },
  { title: "Ganesh Chaturthi",  date: "2026-09-14", category: "festival", icon: "🐘", recurring: false },
  { title: "Navratri Begins",   date: "2026-10-11", category: "festival", icon: "🪔", recurring: false },
  { title: "Dussehra",          date: "2026-10-20", category: "festival", icon: "🏹", recurring: false },
  { title: "Diwali",            date: "2026-11-08", category: "festival", icon: "🪔", recurring: false },

  /* Nth-weekday observances (recomputed each year, so listed explicitly) */
  { title: "Mother's Day",  date: "2026-05-10", category: "international", icon: "💐", recurring: false },
  { title: "Father's Day",  date: "2026-06-21", category: "international", icon: "👔", recurring: false },

  /* 2027 (so the list never runs dry near year-end) */
  { title: "Mahashivratri",     date: "2027-03-06", category: "festival", icon: "🔱", recurring: false },
  { title: "Holi",              date: "2027-03-22", category: "festival", icon: "🎨", recurring: false },
  { title: "Mother's Day",      date: "2027-05-09", category: "international", icon: "💐", recurring: false },
  { title: "Father's Day",      date: "2027-06-20", category: "international", icon: "👔", recurring: false }
];
