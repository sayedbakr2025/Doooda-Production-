-- ============================================================
-- Phase 1: Seed literary_type_configs with all 9 project types
-- Maps each ProjectType to its hierarchy definition.
-- ============================================================

INSERT INTO literary_type_configs (project_type, level_1_singular_en, level_1_singular_ar, level_1_plural_en, level_1_plural_ar, level_1_icon, level_2_singular_en, level_2_singular_ar, level_2_plural_en, level_2_plural_ar, level_2_icon, has_level_2, has_script_fields, has_sound_fields, has_children_fields)
VALUES
  ('novel', 'Chapter', 'فصل', 'Chapters', 'الفصول', '📖', 'Scene', 'مشهد', 'Scenes', 'المشاهد', '🎬', true, false, false, false),
  ('short_story', 'Chapter', 'فصل', 'Chapters', 'الفصول', '📝', 'Scene', 'مشهد', 'Scenes', 'المشاهد', '🎬', true, false, false, false),
  ('long_story', 'Chapter', 'فصل', 'Chapters', 'الفصول', '📃', 'Scene', 'مشهد', 'Scenes', 'المشاهد', '🎬', true, false, false, false),
  ('book', 'Chapter', 'فصل', 'Chapters', 'الفصول', '📚', 'Subheading', 'عنوان فرعي', 'Subheadings', 'العناوين الفرعية', '📌', true, false, false, false),
  ('film_script', 'Scene', 'مشهد', 'Scenes', 'المشاهد', '🎬', NULL, NULL, NULL, NULL, NULL, false, true, false, false),
  ('tv_series', 'Episode', 'حلقة', 'Episodes', 'الحلقات', '📺', 'Scene', 'مشهد', 'Scenes', 'المشاهد', '🎬', true, true, false, false),
  ('theatre_play', 'Act', 'فصل مسرحي', 'Acts', 'الفصول المسرحية', '🎭', 'Scene', 'مشهد مسرحي', 'Scenes', 'المشاهد المسرحية', '🎬', true, false, false, false),
  ('radio_series', 'Episode', 'حلقة', 'Episodes', 'الحلقات', '📻', 'Scene', 'مشهد إذاعي', 'Scenes', 'المشاهد الإذاعية', '🎙️', true, false, true, false),
  ('children_story', 'Page', 'صفحة', 'Pages', 'الصفحات', '🧒', NULL, NULL, NULL, NULL, NULL, false, false, false, true)
ON CONFLICT (project_type) DO UPDATE SET
  level_1_singular_en = EXCLUDED.level_1_singular_en,
  level_1_singular_ar = EXCLUDED.level_1_singular_ar,
  level_1_plural_en = EXCLUDED.level_1_plural_en,
  level_1_plural_ar = EXCLUDED.level_1_plural_ar,
  level_1_icon = EXCLUDED.level_1_icon,
  level_2_singular_en = EXCLUDED.level_2_singular_en,
  level_2_singular_ar = EXCLUDED.level_2_singular_ar,
  level_2_plural_en = EXCLUDED.level_2_plural_en,
  level_2_plural_ar = EXCLUDED.level_2_plural_ar,
  level_2_icon = EXCLUDED.level_2_icon,
  has_level_2 = EXCLUDED.has_level_2,
  has_script_fields = EXCLUDED.has_script_fields,
  has_sound_fields = EXCLUDED.has_sound_fields,
  has_children_fields = EXCLUDED.has_children_fields;