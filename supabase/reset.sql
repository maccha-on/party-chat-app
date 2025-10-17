BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS timers CASCADE;
DROP TABLE IF EXISTS roles_state CASCADE;
DROP TABLE IF EXISTS topic_state CASCADE;

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  username TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  role TEXT NOT NULL DEFAULT '未定',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (room_id, username)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  username TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX messages_room_created_at_idx ON messages (room_id, created_at);

CREATE TABLE timers (
  room_id TEXT PRIMARY KEY,
  label TEXT NOT NULL DEFAULT 'Timer',
  running BOOLEAN NOT NULL DEFAULT FALSE,
  ends_at TIMESTAMPTZ,
  remaining_ms INTEGER NOT NULL DEFAULT 0 CHECK (remaining_ms >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE roles_state (
  room_id TEXT PRIMARY KEY,
  revealed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE topic_state (
  room_id TEXT PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'normal' CHECK (level IN ('normal', 'hard', 'expert')),
  word TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

COMMIT;
