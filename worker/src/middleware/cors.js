function isAllowedOrigin(origin, config) {
  if (!origin) return false;
  if (config.allowedOrigins.includes(origin)) return true;
  if (config.allowLocalhostOrigins && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
}

// Returns the CORS headers to attach to a response for this request's
// origin, or null if the origin is not allowed (caller should still respond,
// just without Access-Control-Allow-Origin, so the browser blocks it).
export function corsHeaders(request, config) {
  const origin = request.headers.get("Origin");
  if (!isAllowedOrigin(origin, config)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export function handlePreflight(request, config) {
  if (request.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: corsHeaders(request, config) });
}
