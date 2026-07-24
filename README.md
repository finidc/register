# FINIDC Register

Registration and community skills platform for the Finnish Association for Interdisciplinary Cooperation ry.

## First development phase

This branch establishes the Cloudflare D1 data model and a minimal Cloudflare Worker API without changing any existing event-registration page.

Included:

- member profiles and secure session storage;
- employment status separate from professions and skills;
- multiple skills per person;
- event registrations;
- service requests and matching;
- consent history;
- initial profession and skills catalogue;
- `GET /api/health` and `GET /api/skills` endpoints.

## Technology

- GitHub: source control and future GitHub Pages frontend
- Cloudflare Workers: API and authorization layer
- Cloudflare D1: production database
- `finidc.org`: official WordPress website linking to the registration application

## Local setup

1. Install dependencies with `npm install`.
2. Create a D1 database named `finidc-register`.
3. Replace the placeholder D1 `database_id` in `wrangler.toml`.
4. Apply migrations with `npm run db:migrate:local` for local development.
5. Start the Worker with `npm run dev`.

See [`docs/data-model.md`](docs/data-model.md) for the model and privacy boundaries.

> Do not commit real member data, passwords, tokens, Cloudflare credentials or exported production databases to GitHub.
