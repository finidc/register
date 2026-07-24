CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE,
  profession TEXT NOT NULL,
  profession_other TEXT,
  city TEXT,
  interests TEXT,
  language TEXT,
  consented_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_registrations_created_at
  ON registrations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_registrations_profession
  ON registrations(profession);
