/*
  # Add English Name to Publishing Categories

  ## Summary
  Adds a `name_en` column to the `publishing_categories` table to support bilingual
  display of category names (Arabic + English).

  ## Changes
  - `publishing_categories`: adds `name_en` (text, nullable) column
  - Seeds known categories with their English translations

  ## Notes
  - Existing rows will have NULL for name_en until updated via the admin panel
  - The frontend falls back to `name` (Arabic) when `name_en` is not set
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'publishing_categories' AND column_name = 'name_en'
  ) THEN
    ALTER TABLE publishing_categories ADD COLUMN name_en text;
  END IF;
END $$;

UPDATE publishing_categories SET name_en = 'Social Fiction'    WHERE slug = 'social-fiction'   AND name_en IS NULL;
UPDATE publishing_categories SET name_en = 'Fantasy'           WHERE slug = 'fantasy'           AND name_en IS NULL;
UPDATE publishing_categories SET name_en = 'Horror'            WHERE slug = 'horror'            AND name_en IS NULL;
UPDATE publishing_categories SET name_en = 'Historical'        WHERE slug = 'historical'        AND name_en IS NULL;
UPDATE publishing_categories SET name_en = 'Children''s'       WHERE slug = 'children'          AND name_en IS NULL;
UPDATE publishing_categories SET name_en = 'Cinema'            WHERE slug = 'cinema'            AND name_en IS NULL;
UPDATE publishing_categories SET name_en = 'Theatre'           WHERE slug = 'theatre'           AND name_en IS NULL;
UPDATE publishing_categories SET name_en = 'YA'                WHERE slug = 'ya'                AND name_en IS NULL;
UPDATE publishing_categories SET name_en = 'Literary Fiction'  WHERE slug = 'literary-fiction'  AND name_en IS NULL;
UPDATE publishing_categories SET name_en = 'Mystery'           WHERE slug = 'mystery'           AND name_en IS NULL;
UPDATE publishing_categories SET name_en = 'Sci-Fi'            WHERE slug = 'sci-fi'            AND name_en IS NULL;
UPDATE publishing_categories SET name_en = 'Romance'           WHERE slug = 'romance'           AND name_en IS NULL;
