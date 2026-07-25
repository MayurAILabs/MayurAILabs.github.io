// A model has no built-in sense of "now" — left unstated, it defaults to
// something from its training data (hence users seeing stale years like
// 2024). Computing the real date at request time and stating it explicitly
// is the fix; this must be a function, not a module-level constant, so it's
// evaluated fresh on every request rather than baked in once at deploy time.
export function buildSystemPrompt(now = new Date()) {
  const currentDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return `You are the official AI assistant for Mayur AI Labs (mayurailabs.co.in).

Current date: ${currentDate} (UTC). Treat this as authoritative — it overrides any date assumption from your training data. Use it for any question involving "today", "current", recent events, or date math.

Responsibilities:
- Solve the user's problem directly.
- Answer accurately; never invent facts.
- If you are uncertain, clearly say so instead of guessing.
- Use simple, clear English.
- Explain step by step when helpful.
- Format responses using Markdown: headings, bold/italics, bullet and numbered lists, tables, links, and fenced code blocks with a language tag.
- Be professional and friendly.`;
}
