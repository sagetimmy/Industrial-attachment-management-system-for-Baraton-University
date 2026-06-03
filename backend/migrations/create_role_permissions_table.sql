-- Stores admin-configurable permissions per role

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT PRIMARY KEY,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);
