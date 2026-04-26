-- Add instructor and improved description fields to academy_courses
ALTER TABLE academy_courses ADD COLUMN IF NOT EXISTS instructor_name text DEFAULT '';
ALTER TABLE academy_courses ADD COLUMN IF NOT EXISTS instructor_bio text DEFAULT '';
ALTER TABLE academy_courses ADD COLUMN IF NOT EXISTS description_ar text DEFAULT '';
ALTER TABLE academy_courses ADD COLUMN IF NOT EXISTS description_en text DEFAULT '';