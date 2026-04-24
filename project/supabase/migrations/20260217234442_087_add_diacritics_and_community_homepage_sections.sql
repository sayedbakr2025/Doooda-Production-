/*
  # Add Diacritics and Community Homepage Sections

  ## Summary
  Inserts homepage_content rows for two new landing page sections:

  1. **diacritics** section — "اكتب بالعربية كما يجب أن تُكتب"
     - section_label, title, description
     - before_label / before_text (unstyled Arabic sample)
     - after_label / after_text (fully diacritized sample)
     - bullet1–4
     - tip (warning note)
     - cta button label

  2. **community** section — "لست وحدك في رحلتك"
     - section_label, title, description
     - col1_title / col1_desc  (نقاشات مفتوحة)
     - col2_title / col2_desc  (بيئة آمنة)
     - col3_title / col3_desc  (تبليغ عن إساءة)
     - note (متاح لكل المستخدمين)

  All rows use ON CONFLICT DO NOTHING to be idempotent.
*/

INSERT INTO homepage_content (section, key, value_ar, value_en, sort_order, is_active)
VALUES
  -- ── diacritics ──────────────────────────────────────────────────────────
  ('diacritics', 'section_label',  'التشكيل وعلامات الترقيم', 'Diacritics & Punctuation', 1, true),
  ('diacritics', 'title',          'اكتب بالعربية كما يجب أن تُكتب.', 'Write Arabic the way it should be written.', 2, true),
  ('diacritics', 'description',    'ميزة التشكيل الذكي تساعدك على ضبط أواخر الكلمات أو تشكيل النص كاملًا. وأداة علامات الترقيم تضبط إيقاع النص بدون تغيير معناه.', 'Smart diacritization helps you adjust word endings or fully diacritize your text. The punctuation tool sets the rhythm of the text without changing its meaning.', 3, true),
  ('diacritics', 'before_label',   'قبل التشكيل', 'Before', 4, true),
  ('diacritics', 'before_text',    'كان الكاتب يجلس في غرفته ويفكر في القصة التي يريد ان يكتبها', 'The writer sat in his room thinking about the story he wanted to write.', 5, true),
  ('diacritics', 'after_label',    'بعد التشكيل', 'After', 6, true),
  ('diacritics', 'after_text',     'كَانَ الْكَاتِبُ يَجْلِسُ فِي غُرْفَتِهِ وَيُفَكِّرُ فِي الْقِصَّةِ الَّتِي يُرِيدُ أَنْ يَكْتُبَهَا.', 'The writer sat in his room, thinking about the story he wanted to write.', 7, true),
  ('diacritics', 'bullet1',        'وضع تشكيل خفيف', 'Light diacritization mode', 8, true),
  ('diacritics', 'bullet2',        'وضع تشكيل كامل', 'Full diacritization mode', 9, true),
  ('diacritics', 'bullet3',        'استبدال مباشر للنص المظلل', 'Direct replacement of selected text', 10, true),
  ('diacritics', 'bullet4',        'يعمل على اللغة العربية فقط', 'Works on Arabic language only', 11, true),
  ('diacritics', 'tip',            'للحصول على نتيجة أدق، ظلل الجملة بالكامل', 'For best results, select the entire sentence before applying.', 12, true),
  ('diacritics', 'cta',            'جرّب التشكيل داخل المشهد', 'Try diacritization inside a scene', 13, true),

  -- ── community ────────────────────────────────────────────────────────────
  ('community', 'section_label', 'المجتمع', 'Community', 1, true),
  ('community', 'title',         'لست وحدك في رحلتك.', 'You are not alone on your journey.', 2, true),
  ('community', 'description',   'مجتمع يضم كتّابًا لتبادل الخبرات ومناقشة الأعمال.', 'A community of writers to share experiences and discuss works.', 3, true),
  ('community', 'col1_title',    'نقاشات مفتوحة', 'Open Discussions', 4, true),
  ('community', 'col1_desc',     'شارك أفكارك وتلقَّ تغذية راجعة من كتّاب آخرين.', 'Share your ideas and receive feedback from fellow writers.', 5, true),
  ('community', 'col2_title',    'بيئة آمنة', 'Safe Environment', 6, true),
  ('community', 'col2_desc',     'مساحة محترمة تُشجع على التعبير الصادق.', 'A respectful space that encourages honest expression.', 7, true),
  ('community', 'col3_title',    'تبليغ عن إساءة', 'Report Abuse', 8, true),
  ('community', 'col3_desc',     'أدوات للإبلاغ عن أي محتوى مسيء بسرعة وسهولة.', 'Tools to report inappropriate content quickly and easily.', 9, true),
  ('community', 'note',          'متاح لكل المستخدمين، مجاني ومدفوع', 'Available to all users, free and paid', 10, true)

ON CONFLICT (section, key) DO NOTHING;
