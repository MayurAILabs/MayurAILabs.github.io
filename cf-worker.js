const ROUTES = [
  { prefix: "/daily-savings-calculator", target: "/mayur-ai-labs-savings-calculator" },
  { prefix: "/expense-tracker", target: "/expense-tracker" },
  { prefix: "/priority-manager", target: "/PriorityManager" },
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    for (const route of ROUTES) {
      if (path === route.prefix) {
        return Response.redirect(`${url.origin}${route.prefix}/`, 301);
      }
      if (path === route.prefix + "/" || path.startsWith(route.prefix + "/")) {
        const rest = path.slice(route.prefix.length);
        const originUrl = `https://mayurailabs.github.io${route.target}${rest}${url.search}`;
        return proxy(originUrl, request);
      }
    }

    const originUrl = `https://mayurailabs.github.io${path}${url.search}`;
    return proxy(originUrl, request);
  },
};

async function proxy(originUrl, request) {
  const originRequest = new Request(originUrl, {
    method: request.method,
    headers: request.headers,
    redirect: "manual",
  });
  const response = await fetch(originRequest);

  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.delete("content-security-policy");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
