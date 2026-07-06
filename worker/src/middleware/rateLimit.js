// Per-IP fixed-window rate limiting via the Cloudflare Workers Rate Limiting
// binding declared in wrangler.toml ([[ratelimits]] name = config.rateLimit.bindingName).
export async function checkRateLimit(request, env, config) {
  const binding = env[config.rateLimit.bindingName];
  if (!binding) {
    // Binding not configured (e.g. first local `wrangler dev` run) — fail open
    // rather than breaking the whole endpoint.
    return { ok: true };
  }
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const { success } = await binding.limit({ key: ip });
  return { ok: success };
}
