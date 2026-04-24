ALTER TABLE notifications ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
