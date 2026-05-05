-- Ghostlite initial schema

-- Users
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'author' CHECK (role IN ('admin','editor','author')),
  avatar_key    TEXT,
  bio           TEXT,
  created_at    INTEGER NOT NULL
);

-- Posts (metadata only; body is in R2)
CREATE TABLE posts (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  excerpt       TEXT,
  cover_key     TEXT,
  body_key      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published')),
  author_id     TEXT NOT NULL REFERENCES users(id),
  published_at  INTEGER,
  scheduled_at  INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_posts_status_pub ON posts(status, published_at DESC);
CREATE INDEX idx_posts_author     ON posts(author_id);

-- Tags
CREATE TABLE tags (
  id   TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE post_tags (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Sessions (server-side opaque tokens)
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Settings (JSON values)
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Default settings
INSERT INTO settings (key, value, updated_at) VALUES
  ('email', '{"provider":"none"}',                                    unixepoch()),
  ('theme', '{"active":"default","config":{}}',                       unixepoch()),
  ('site',  '{"title":"Ghostlite","description":"A blog","logo_key":null}', unixepoch());
