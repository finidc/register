const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

const PROFESSIONS = new Set([
  "arts-music",
  "business",
  "care-health",
  "construction",
  "education",
  "engineering",
  "hospitality",
  "it",
  "logistics",
  "science",
  "student",
  "unemployed",
  "other",
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function adminJson(data, status = 200) {
  const response = json(data, status);
  response.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  return response;
}

function clean(value, maximum) {
  return String(value ?? "").trim().slice(0, maximum);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validate(data) {
  const registration = {
    id: crypto.randomUUID(),
    name: clean(data.name, 100),
    phone: clean(data.phone, 40),
    email: clean(data.email, 160).toLowerCase(),
    profession: clean(data.profession, 40),
    profession_other: clean(data.professionOther, 100),
    city: clean(data.city, 80),
    interests: Array.isArray(data.interests)
      ? data.interests.map((item) => clean(item, 50)).filter(Boolean).slice(0, 8).join(",")
      : "",
    language: clean(data.language, 80),
  };

  if (!registration.name) return { error: "Please enter your name." };
  if (!registration.phone && !registration.email) {
    return { error: "Please provide a phone number or email address." };
  }
  if (registration.email && !isEmail(registration.email)) {
    return { error: "Please enter a valid email address." };
  }
  if (!PROFESSIONS.has(registration.profession)) {
    return { error: "Please select your profession or current situation." };
  }
  if (registration.profession === "other" && !registration.profession_other) {
    return { error: "Please describe your profession or current situation." };
  }
  if (data.consent !== true) {
    return { error: "Please accept the privacy notice before registering." };
  }

  return { registration };
}

async function register(request, env) {
  const clientAddress = request.headers.get("cf-connecting-ip") || "unknown";
  const rateLimit = await env.REGISTRATION_RATE_LIMITER.limit({
    key: `registration:${clientAddress}`,
  });
  if (!rateLimit.success) {
    const response = json(
      {
        ok: false,
        error: "Too many registration attempts. Please wait one minute and try again.",
      },
      429
    );
    response.headers.set("retry-after", "60");
    return response;
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return json({ ok: false, error: "Expected a JSON request." }, 415);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "The form data could not be read." }, 400);
  }

  if (clean(data.website, 200)) {
    return json({ ok: true, message: "Thank you. Your registration has been received." });
  }

  const result = validate(data);
  if (result.error) return json({ ok: false, error: result.error }, 400);

  const r = result.registration;
  try {
    await env.DB.prepare(
      `INSERT INTO registrations
        (id, name, phone, email, profession, profession_other, city, interests, language, consented_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name,
         phone = excluded.phone,
         profession = excluded.profession,
         profession_other = excluded.profession_other,
         city = excluded.city,
         interests = excluded.interests,
         language = excluded.language,
         consented_at = datetime('now'),
         updated_at = datetime('now')`
    )
      .bind(
        r.id,
        r.name,
        r.phone || null,
        r.email || null,
        r.profession,
        r.profession_other || null,
        r.city || null,
        r.interests || null,
        r.language || null
      )
      .run();
  } catch (error) {
    console.error("Registration database error", error);
    return json(
      { ok: false, error: "Registration is temporarily unavailable. Please try again shortly." },
      500
    );
  }

  return json({
    ok: true,
    message: "Thank you. Your registration has been received.",
    registrationId: r.id,
  });
}

function adminIdentity(request, env) {
  const expectedHost = clean(env.ADMIN_HOST, 253).toLowerCase();
  const expectedEmail = clean(env.ADMIN_EMAIL, 160).toLowerCase();
  const requestHost = new URL(request.url).hostname.toLowerCase();
  const accessEmail = clean(
    request.headers.get("cf-access-authenticated-user-email"),
    160
  ).toLowerCase();

  if (
    !expectedHost ||
    !expectedEmail ||
    expectedEmail === "__disabled__" ||
    requestHost !== expectedHost ||
    accessEmail !== expectedEmail
  ) {
    return null;
  }

  return { email: accessEmail };
}

function adminDenied() {
  return adminJson(
    {
      ok: false,
      error:
        "Administrator access is not available. Sign in through the protected FINIDC admin address.",
    },
    403
  );
}

function filtersFromUrl(url) {
  return {
    q: clean(url.searchParams.get("q"), 100),
    profession: clean(url.searchParams.get("profession"), 40),
    city: clean(url.searchParams.get("city"), 80),
  };
}

function filteredQuery(filters) {
  const conditions = [];
  const values = [];

  if (filters.q) {
    conditions.push(
      "(name LIKE ? OR email LIKE ? OR phone LIKE ? OR city LIKE ? OR profession_other LIKE ?)"
    );
    const value = `%${filters.q}%`;
    values.push(value, value, value, value, value);
  }

  if (filters.profession) {
    conditions.push("profession = ?");
    values.push(filters.profession);
  }

  if (filters.city) {
    conditions.push("city LIKE ?");
    values.push(`%${filters.city}%`);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}

async function adminStats(env) {
  const [total, thisMonth, professions, cities] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM registrations").first(),
    env.DB.prepare(
      "SELECT COUNT(*) AS count FROM registrations WHERE created_at >= datetime('now', 'start of month')"
    ).first(),
    env.DB.prepare(
      `SELECT profession AS label, COUNT(*) AS count
       FROM registrations
       GROUP BY profession
       ORDER BY count DESC, profession ASC
       LIMIT 8`
    ).all(),
    env.DB.prepare(
      `SELECT city AS label, COUNT(*) AS count
       FROM registrations
       WHERE city IS NOT NULL AND city != ''
       GROUP BY city
       ORDER BY count DESC, city ASC
       LIMIT 8`
    ).all(),
  ]);

  return adminJson({
    ok: true,
    total: Number(total?.count || 0),
    thisMonth: Number(thisMonth?.count || 0),
    professions: professions.results || [],
    cities: cities.results || [],
  });
}

async function adminRegistrations(url, env) {
  const filters = filtersFromUrl(url);
  const page = Math.max(1, Math.min(100000, Number(url.searchParams.get("page")) || 1));
  const perPage = Math.max(
    10,
    Math.min(100, Number(url.searchParams.get("perPage")) || 25)
  );
  const offset = (page - 1) * perPage;
  const query = filteredQuery(filters);

  const countStatement = env.DB.prepare(
    `SELECT COUNT(*) AS count FROM registrations ${query.where}`
  ).bind(...query.values);
  const rowsStatement = env.DB.prepare(
    `SELECT id, name, phone, email, profession, profession_other, city, interests,
            language, consented_at, created_at, updated_at
     FROM registrations
     ${query.where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...query.values, perPage, offset);

  const [count, rows] = await Promise.all([countStatement.first(), rowsStatement.all()]);
  const total = Number(count?.count || 0);

  return adminJson({
    ok: true,
    registrations: rows.results || [],
    page,
    perPage,
    total,
    pages: Math.max(1, Math.ceil(total / perPage)),
  });
}

function csvCell(value) {
  let text = String(value ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

async function adminExport(url, env) {
  const query = filteredQuery(filtersFromUrl(url));
  const rows = await env.DB.prepare(
    `SELECT name, phone, email, profession, profession_other, city, interests,
            language, consented_at, created_at
     FROM registrations
     ${query.where}
     ORDER BY created_at DESC
     LIMIT 10000`
  )
    .bind(...query.values)
    .all();

  const headings = [
    "Name",
    "Phone",
    "Email",
    "Profession",
    "Profession details",
    "City",
    "Interests",
    "Language",
    "Consent date",
    "Registration date",
  ];
  const fields = [
    "name",
    "phone",
    "email",
    "profession",
    "profession_other",
    "city",
    "interests",
    "language",
    "consented_at",
    "created_at",
  ];
  const lines = [
    headings.map(csvCell).join(","),
    ...(rows.results || []).map((row) => fields.map((field) => csvCell(row[field])).join(",")),
  ];
  const date = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="finidc-registrations-${date}.csv"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow, noarchive",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, service: "finidc-register" });
    }

    if (url.pathname === "/api/register" && request.method === "POST") {
      return register(request, env);
    }

    if (url.pathname.startsWith("/api/admin/")) {
      const identity = adminIdentity(request, env);
      if (!identity) return adminDenied();

      try {
        if (url.pathname === "/api/admin/session" && request.method === "GET") {
          return adminJson({ ok: true, email: identity.email });
        }
        if (url.pathname === "/api/admin/stats" && request.method === "GET") {
          return adminStats(env);
        }
        if (url.pathname === "/api/admin/registrations" && request.method === "GET") {
          return adminRegistrations(url, env);
        }
        if (url.pathname === "/api/admin/export" && request.method === "GET") {
          return adminExport(url, env);
        }
      } catch (error) {
        console.error("Admin database error", error);
        return adminJson(
          { ok: false, error: "The admin database request could not be completed." },
          500
        );
      }

      return adminJson({ ok: false, error: "Not found." }, 404);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, error: "Not found." }, 404);
    }

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      if (!adminIdentity(request, env)) return adminDenied();
      const assetUrl = new URL(request.url);
      assetUrl.pathname =
        url.pathname === "/admin" || url.pathname === "/admin/"
          ? "/admin/"
          : url.pathname;
      const response = await env.ASSETS.fetch(new Request(assetUrl, request));
      const headers = new Headers(response.headers);
      headers.set("cache-control", "no-store");
      headers.set("x-robots-tag", "noindex, nofollow, noarchive");
      headers.set("x-frame-options", "DENY");
      return new Response(response.body, { status: response.status, headers });
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("x-content-type-options", "nosniff");
    headers.set("x-frame-options", "DENY");
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
    headers.set(
      "content-security-policy",
      "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
    );
    return new Response(response.body, { status: response.status, headers });
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      env.DB.prepare(
        "DELETE FROM registrations WHERE created_at < datetime('now', '-12 months')"
      )
        .run()
        .catch((error) => console.error("Registration retention cleanup error", error))
    );
  },
};
