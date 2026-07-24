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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, service: "finidc-register" });
    }

    if (url.pathname === "/api/register" && request.method === "POST") {
      return register(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, error: "Not found." }, 404);
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
};
