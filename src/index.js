const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store",
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== env.ALLOWED_ORIGIN) return {};

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      if (!request.headers.get("Origin") || !cors["access-control-allow-origin"]) {
        return json({ error: "Origin not allowed" }, 403);
      }
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, service: "finidc-register-api" }, 200, cors);
    }

    if (request.method === "GET" && url.pathname === "/api/skills") {
      const result = await env.DB.prepare(
        `SELECT id, category, name, display_order
         FROM skills
         WHERE active = 1
         ORDER BY category ASC, display_order ASC, name ASC`
      ).all();

      return json({ skills: result.results }, 200, {
        ...cors,
        "cache-control": "public, max-age=300",
      });
    }

    return json({ error: "Not found" }, 404, cors);
  },
};
