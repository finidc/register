const state = {
  page: 1,
  pages: 1,
  total: 0,
  q: "",
  profession: "",
  city: "",
};

const professionLabels = {
  "arts-music": "Arts, music or dance",
  business: "Business or entrepreneurship",
  "care-health": "Care or healthcare",
  construction: "Construction or trades",
  education: "Education or teaching",
  engineering: "Engineering or manufacturing",
  hospitality: "Hospitality, food or cleaning",
  it: "IT, AI or digital technology",
  logistics: "Driving, transport or logistics",
  science: "Mathematics, physics or sciences",
  student: "Student",
  unemployed: "Looking for work",
  other: "Other",
};

const interestLabels = {
  "community-meetings": "Community meetings",
  "nature-garden": "Nature & garden",
  "skills-work": "Skills & work",
  volunteering: "Volunteering",
};

const elements = {
  form: document.querySelector("#filter-form"),
  search: document.querySelector("#search"),
  profession: document.querySelector("#profession"),
  city: document.querySelector("#city"),
  status: document.querySelector("#status-message"),
  rows: document.querySelector("#registration-rows"),
  cards: document.querySelector("#registration-cards"),
  resultCount: document.querySelector("#result-count"),
  pageLabel: document.querySelector("#page-label"),
  previous: document.querySelector("#previous-page"),
  next: document.querySelector("#next-page"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return new Intl.DateTimeFormat("en-FI", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function readableProfession(row) {
  if (row.profession === "other" && row.profession_other) return row.profession_other;
  return professionLabels[row.profession] || row.profession || "—";
}

function readableInterests(value) {
  if (!value) return "—";
  return value
    .split(",")
    .map((item) => interestLabels[item] || item)
    .join(", ");
}

function params(includePage = true) {
  const query = new URLSearchParams();
  if (state.q) query.set("q", state.q);
  if (state.profession) query.set("profession", state.profession);
  if (state.city) query.set("city", state.city);
  if (includePage) {
    query.set("page", String(state.page));
    query.set("perPage", "25");
  }
  return query;
}

async function api(path) {
  const response = await fetch(path, { headers: { accept: "application/json" } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || "Request failed.");
  return result;
}

function renderRows(registrations) {
  if (!registrations.length) {
    elements.rows.innerHTML = '<tr><td colspan="6" class="empty">No registrations match these filters.</td></tr>';
    elements.cards.innerHTML = '<div class="empty">No registrations match these filters.</div>';
    return;
  }

  elements.rows.innerHTML = registrations
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.name)}</strong><small>ID ${escapeHtml(row.id.slice(0, 8))}</small></td>
          <td><a href="mailto:${escapeHtml(row.email || "")}">${escapeHtml(row.email || "—")}</a><small>${escapeHtml(row.phone || "—")}</small></td>
          <td>${escapeHtml(readableProfession(row))}</td>
          <td>${escapeHtml(row.city || "—")}<small>${escapeHtml(row.language || "—")}</small></td>
          <td>${escapeHtml(readableInterests(row.interests))}</td>
          <td>${escapeHtml(formatDate(row.created_at))}</td>
        </tr>`
    )
    .join("");

  elements.cards.innerHTML = registrations
    .map(
      (row) => `
        <article>
          <div class="card-heading"><strong>${escapeHtml(row.name)}</strong><span>${escapeHtml(formatDate(row.created_at))}</span></div>
          <dl>
            <div><dt>Email</dt><dd>${escapeHtml(row.email || "—")}</dd></div>
            <div><dt>Phone</dt><dd>${escapeHtml(row.phone || "—")}</dd></div>
            <div><dt>Profession</dt><dd>${escapeHtml(readableProfession(row))}</dd></div>
            <div><dt>City</dt><dd>${escapeHtml(row.city || "—")}</dd></div>
            <div><dt>Language</dt><dd>${escapeHtml(row.language || "—")}</dd></div>
            <div><dt>Interests</dt><dd>${escapeHtml(readableInterests(row.interests))}</dd></div>
          </dl>
        </article>`
    )
    .join("");
}

async function loadSession() {
  const result = await api("/api/admin/session");
  document.querySelector("#admin-email").textContent = result.email;
}

async function loadStats() {
  const result = await api("/api/admin/stats");
  document.querySelector("#total-count").textContent = result.total.toLocaleString("en-FI");
  document.querySelector("#month-count").textContent = result.thisMonth.toLocaleString("en-FI");
  renderSummary("#profession-summary", result.professions, professionLabels);
  renderSummary("#city-summary", result.cities);
}

function renderSummary(selector, items, labels = {}) {
  document.querySelector(selector).innerHTML = items.length
    ? items
        .slice(0, 3)
        .map((item) => `<span>${escapeHtml(labels[item.label] || item.label)} <b>${item.count}</b></span>`)
        .join("")
    : "<span>No data yet</span>";
}

async function loadRegistrations() {
  elements.status.textContent = "Loading registrations…";
  try {
    const result = await api(`/api/admin/registrations?${params()}`);
    state.pages = result.pages;
    state.total = result.total;
    renderRows(result.registrations);
    elements.resultCount.textContent = `${result.total.toLocaleString("en-FI")} result${result.total === 1 ? "" : "s"}`;
    elements.pageLabel.textContent = `Page ${result.page} of ${result.pages}`;
    elements.previous.disabled = result.page <= 1;
    elements.next.disabled = result.page >= result.pages;
    elements.status.textContent = "";
  } catch (error) {
    elements.status.textContent = error.message;
    elements.status.classList.add("error");
  }
}

async function refreshAll() {
  elements.status.classList.remove("error");
  await Promise.all([loadStats(), loadRegistrations()]);
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  state.q = elements.search.value.trim();
  state.profession = elements.profession.value;
  state.city = elements.city.value.trim();
  state.page = 1;
  loadRegistrations();
});

document.querySelector("#clear-button").addEventListener("click", () => {
  elements.form.reset();
  state.q = "";
  state.profession = "";
  state.city = "";
  state.page = 1;
  loadRegistrations();
});

document.querySelector("#refresh-button").addEventListener("click", refreshAll);

document.querySelector("#export-button").addEventListener("click", () => {
  window.location.assign(`/api/admin/export?${params(false)}`);
});

elements.previous.addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    loadRegistrations();
  }
});

elements.next.addEventListener("click", () => {
  if (state.page < state.pages) {
    state.page += 1;
    loadRegistrations();
  }
});

(async () => {
  try {
    await loadSession();
    await refreshAll();
  } catch (error) {
    elements.status.textContent = error.message;
    elements.status.classList.add("error");
  }
})();
