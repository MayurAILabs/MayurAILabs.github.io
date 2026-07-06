# AI Assistant

A floating, ChatGPT-style AI assistant embedded on the landing page, backed by a
Cloudflare Worker so the Gemini API key never reaches the browser.

## Architecture

```
Browser (GitHub Pages)                Cloudflare
┌─────────────────────┐   POST        ┌──────────────────────────┐
│ index.html           │  /api/chat   │ ai-assistant-api Worker   │
│  assistant/js/*.js   ├─────────────▶│  (mayurailabs.co.in/api/*)│
│  (widget, no build)  │  SSE stream  │  → Gemini 2.5 Flash        │
└─────────────────────┘◀─────────────┴──────────────────────────┘
```

- `index.html` / `assistant/` — the widget itself: floating button, chat
  window, Markdown rendering, sessionStorage history. Plain ES modules, no
  build step, ships as static files via GitHub Pages.
- `worker/` — a **separate, independently deployed** Cloudflare Worker bound
  to `mayurailabs.co.in/api/*`. It does not touch or replace the existing
  `cf-worker.js` proxy, which continues to own everything else on the domain
  (Cloudflare always matches the more specific route first).

## Project layout

```
assistant/
  styles/assistant.css        widget styles (reuses the site's existing CSS variables)
  js/
    config.js                 name, avatar, welcome message, endpoint, limits
    utils/                    dom, sessionStorage, markdown rendering, SSE parsing
    components/               widget button, chat window, message bubble, typing indicator
    chat/                     chat orchestration + fetch/SSE client
    index.js                  mounts the widget on page load

worker/
  wrangler.toml                Worker + route + rate-limit binding config
  package.json
  src/
    index.js                   entry point / router
    routes/chat.js              POST /api/chat handler
    middleware/                 cors.js, rateLimit.js, validate.js
    services/chatService.js     builds context, calls the provider, streams the reply
    providers/                  index.js (factory) + gemini.js (implementation)
    prompts/systemPrompt.js      the assistant's system prompt, isolated from logic
    config/assistant.config.js  model, temperature, limits, allowed origins — no secrets
```

## Prerequisites

- Node.js + npm (already installed: check with `node -v`)
- A Cloudflare account with `mayurailabs.co.in` as an active zone
- The Gemini API key (see `Gemini Key.txt` in your local `AIAssistant` folder — do not commit it anywhere)

## Install

```bash
cd worker
npm install
```

## Configure

All non-secret behavior lives in `worker/src/config/assistant.config.js`
(model, temperature, token limits, allowed origins, rate limit) and
`assistant/js/config.js` (assistant name, avatar, welcome message, endpoint).
Edit these directly — no environment variables needed for them.

The system prompt lives in `worker/src/prompts/systemPrompt.js`, isolated so
you can edit the assistant's tone/behavior without touching request logic.

## Secrets

The Gemini key is **never** written to any file in this repo. Set it as a
Cloudflare Worker secret:

```bash
cd worker
wrangler login          # one-time, opens a browser for your Cloudflare account
wrangler secret put GEMINI_API_KEY
# paste the key when prompted
```

## Local development

```bash
cd worker
wrangler dev             # starts the worker on http://localhost:8787
```

For local-only testing, create `worker/.dev.vars` (already gitignored):

```
GEMINI_API_KEY=your-key-here
```

Test it directly:

```bash
curl -X POST http://localhost:8787/api/chat \
  -H "content-type: application/json" \
  -H "Origin: http://localhost:5500" \
  -d '{"message":"hello","history":[]}'
```

Serve the frontend with any static file server, e.g. `npx serve .` from the
repo root, and open it in a browser. To point the widget at your local
worker instead of production, temporarily edit `apiEndpoint` in
`assistant/js/config.js`.

## Deploy

```bash
cd worker
wrangler deploy
```

This registers the Worker **and** its route (`mayurailabs.co.in/api/*`,
declared in `wrangler.toml`) in one step — no manual dashboard route setup
needed, and the existing proxy worker is untouched.

The frontend needs no separate deploy step: once `index.html` and
`assistant/` are merged to `main` and pushed, GitHub Pages serves them as
part of the normal site.

## Security

- The API key only ever exists as a Cloudflare secret (`env.GEMINI_API_KEY`), never in source, never sent to the browser.
- CORS is an explicit origin allowlist (`worker/src/config/assistant.config.js` → `allowedOrigins`), not `*`.
- Requests are validated server-side: message length, history size, and total body size are capped (`middleware/validate.js`).
- Assistant output is rendered through `DOMPurify.sanitize()` before insertion into the DOM, so any HTML/script-like text in a model response can't execute.
- Per-IP rate limiting via Cloudflare's Workers Rate Limiting binding (`[[ratelimits]]` in `wrangler.toml`), default 20 requests/60s.
- Errors returned to the client are generic; only the Worker's own logs (`wrangler tail`) see raw failure details.

## Adding a new LLM provider

1. Create `worker/src/providers/<name>.js` exporting the same two functions as `providers/gemini.js`:
   - `stream({ apiKey, model, systemPrompt, messages, temperature, maxOutputTokens }) → ReadableStream`
   - `generate({ ...same args }) → Promise<string>`
2. Register it in `worker/src/providers/index.js`'s `PROVIDERS` map.
3. Set `provider: "<name>"` in `worker/src/config/assistant.config.js`.

No other file changes needed — `chatService.js` and `routes/chat.js` are provider-agnostic.

## Future features (scaffolded, not yet built)

`ragEnabled` and `voiceEnabled` flags exist in both config files as inert
placeholders. Wiring them up (retrieval-augmented generation, voice
input/output, Firebase auth, Firestore-backed history, PDF/image upload,
admin dashboard, etc.) is future work — the current architecture (isolated
provider layer, isolated prompt, config-driven behavior) is designed so none
of it requires rewriting the chat pipeline.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `429 Too many requests` immediately | Rate limit binding shared across your own rapid testing | Wait 60s, or raise `simple.limit` in `wrangler.toml` |
| Browser console shows a CORS error | Origin not in `allowedOrigins` | Add the origin to `worker/src/config/assistant.config.js` |
| `502` / "assistant is temporarily unavailable" | Gemini call failed (bad/missing key, quota, model name) | Run `wrangler tail` while reproducing, check the logged error |
| Widget doesn't appear at all | CDN script blocked or 404 | Check the Network tab for `marked`/`DOMPurify`/`highlight.js` 200s |
| Copy button says "Copy failed" | Browser denied clipboard permission (common in sandboxed/headless contexts) | Works normally in a real browser over HTTPS/localhost with a user click |
| `wrangler deploy` creates a second worker | `name` in `wrangler.toml` doesn't match an existing one | This project intentionally uses a new, separate worker (`ai-assistant-api`) — this is expected |

## Production checklist

- [ ] `wrangler secret put GEMINI_API_KEY` set on the target Cloudflare account
- [ ] `wrangler deploy` run, and `mayurailabs.co.in/api/*` route confirmed in the Cloudflare dashboard
- [ ] `allowedOrigins` in `assistant.config.js` matches the real production origins only
- [ ] Rate limit values reviewed for expected traffic
- [ ] `worker/.dev.vars` is not committed (already gitignored)
- [ ] Manually test: open widget, send a message, confirm streaming reply, Markdown/code rendering, copy button, clear chat, mobile viewport
- [ ] Confirm the existing landing page links/routes (`/daily-savings-calculator`, `/expense-tracker`, `/priority-manager`) still work unaffected
