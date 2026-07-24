PRAGMA foreign_keys = ON;

-- FINIDC member profiles. Personal data lives in D1, never in GitHub.
CREATE TABLE people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  email TEXT NOT NULL COLLATE NOCASE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified_at TEXT,
  employment_status TEXT NOT NULL DEFAULT 'not_specified'
    CHECK (employment_status IN (
      'employed', 'self_employed', 'job_seeker', 'student',
      'retired', 'unable_to_work', 'not_specified'
    )),
  participation_goal TEXT,
  contact_consent INTEGER NOT NULL DEFAULT 0 CHECK (contact_consent IN (0, 1)),
  privacy_consent INTEGER NOT NULL CHECK (privacy_consent = 1),
  privacy_policy_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended', 'deleted')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (email)
);

-- Login sessions store only hashed opaque tokens, never raw session tokens.
CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at TEXT,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

-- Unified profession and skills catalogue. Employment status is intentionally separate.
CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (category, name)
);

CREATE TABLE person_skills (
  person_id TEXT NOT NULL,
  skill_id INTEGER NOT NULL,
  experience_level TEXT NOT NULL DEFAULT 'not_specified'
    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert', 'not_specified')),
  can_offer_service INTEGER NOT NULL DEFAULT 0 CHECK (can_offer_service IN (0, 1)),
  looking_for_work INTEGER NOT NULL DEFAULT 0 CHECK (looking_for_work IN (0, 1)),
  available_for_volunteering INTEGER NOT NULL DEFAULT 0 CHECK (available_for_volunteering IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (person_id, skill_id),
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE event_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'waitlisted', 'cancelled', 'attended', 'no_show')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (event_id, person_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

CREATE TABLE service_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  skill_id INTEGER NOT NULL,
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 2000),
  location TEXT,
  service_type TEXT NOT NULL
    CHECK (service_type IN ('paid_work', 'volunteering', 'community_help', 'other')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft', 'open', 'matched', 'completed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (requester_id) REFERENCES people(id) ON DELETE RESTRICT,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT
);

CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  match_status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (match_status IN ('suggested', 'contacted', 'accepted', 'declined', 'completed')),
  contact_released INTEGER NOT NULL DEFAULT 0 CHECK (contact_released IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (request_id, person_id),
  FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

-- Immutable consent history supports privacy-policy auditing.
CREATE TABLE consent_records (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('privacy', 'contact')),
  granted INTEGER NOT NULL CHECK (granted IN (0, 1)),
  policy_version TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

CREATE INDEX idx_people_status ON people(status);
CREATE INDEX idx_people_employment_status ON people(employment_status);
CREATE INDEX idx_auth_sessions_person ON auth_sessions(person_id);
CREATE INDEX idx_auth_sessions_expiry ON auth_sessions(expires_at);
CREATE INDEX idx_skills_active_order ON skills(active, category, display_order);
CREATE INDEX idx_person_skills_skill ON person_skills(skill_id);
CREATE INDEX idx_person_skills_work ON person_skills(looking_for_work, skill_id);
CREATE INDEX idx_person_skills_volunteer ON person_skills(available_for_volunteering, skill_id);
CREATE INDEX idx_events_start_status ON events(starts_at, status);
CREATE INDEX idx_event_registrations_person ON event_registrations(person_id);
CREATE INDEX idx_service_requests_status_skill ON service_requests(status, skill_id);
CREATE INDEX idx_matches_person_status ON matches(person_id, match_status);
CREATE INDEX idx_consent_records_person ON consent_records(person_id, recorded_at);

CREATE TRIGGER people_set_updated_at
AFTER UPDATE ON people
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE people
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;
