-- Migration: initial schema
CREATE TABLE IF NOT EXISTS example (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL
);
