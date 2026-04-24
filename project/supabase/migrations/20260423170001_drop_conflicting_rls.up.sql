DROP POLICY IF EXISTS "editors can manage characters" ON project_characters;

DROP POLICY IF EXISTS "viewers can only select chapters" ON chapters;

DROP POLICY IF EXISTS "editors can update text in chapters" ON chapters;
DROP POLICY IF EXISTS "editors can update text in scenes" ON scenes;
DROP POLICY IF EXISTS "managers can insert chapters" ON chapters;
DROP POLICY IF EXISTS "managers can delete chapters" ON chapters;
DROP POLICY IF EXISTS "managers can insert scenes" ON scenes;
DROP POLICY IF EXISTS "managers can delete scenes" ON scenes;
