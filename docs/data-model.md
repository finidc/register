# FINIDC registration data model

## Scope

This first database version supports:

- member registration and profile updates;
- secure login sessions;
- employment status kept separate from profession and skills;
- multiple skills for each person;
- event creation and registration;
- paid-work, volunteering and community-help requests;
- administrator or system-generated matches;
- auditable privacy and contact consent.

## Main relationships

| Parent | Child | Relationship |
|---|---|---|
| `people` | `person_skills` | one person can have many skills |
| `skills` | `person_skills` | one skill can belong to many people |
| `people` | `auth_sessions` | one person can have multiple login sessions |
| `events` | `event_registrations` | one event can have many registrations |
| `people` | `event_registrations` | one person can register for many events |
| `service_requests` | `matches` | one request can have multiple candidates |
| `people` | `consent_records` | consent changes remain auditable |

## Important modelling decision

`employment_status` describes a person's current situation. It is not a profession.

Example:

- Employment status: `job_seeker`
- Skills: Driver, Musician, Event Assistance
- Goals: paid work and volunteering

This preserves a person's real abilities when their employment situation changes.

## Security and privacy boundaries

- GitHub contains schema, migrations and application code only.
- Names, phone numbers, email addresses and consent records are stored only in D1.
- Passwords must be hashed by the Worker before insertion; plaintext passwords must never be stored or logged.
- Session tokens must be random, sent through secure cookies, and stored in D1 only as hashes.
- The Worker must validate input and enforce authorization on every profile-changing route.
- Contact details must not be released through matching until `contact_released = 1` and the relevant consent is valid.
- Account deletion should first disable access and then follow the association's documented retention policy.

## Migration order

1. `0001_initial_schema.sql`
2. `0002_seed_skills.sql`

After creating the Cloudflare D1 database, replace the placeholder `database_id` in `wrangler.toml`, then apply migrations through Wrangler.
