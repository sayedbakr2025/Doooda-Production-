/*
  # Create Homepage Content Table

  ## Purpose
  Allows admin to control all text, links, and sections of the public landing page
  without any code changes.

  ## New Tables
  - `homepage_content`
    - `id` (uuid, primary key)
    - `section` (text) - Section identifier: hero, nav, features, critic, academy, marketing, pricing, footer, cta
    - `key` (text) - Specific content key within the section
    - `value_ar` (text) - Arabic content value
    - `value_en` (text) - English content value
    - `is_active` (boolean) - Whether this content item is shown
    - `sort_order` (int) - Display order within section
    - `created_at`, `updated_at` timestamps

  ## Security
  - RLS enabled
  - Public can read active content (landing page is public)
  - Only admins can write

  ## Seed Data
  - All default homepage content seeded in Arabic and English
*/

CREATE TABLE IF NOT EXISTS homepage_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  key text NOT NULL,
  value_ar text NOT NULL DEFAULT '',
  value_en text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(section, key)
);

ALTER TABLE homepage_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active homepage content"
  ON homepage_content FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert homepage content"
  ON homepage_content FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin');

CREATE POLICY "Admins can update homepage content"
  ON homepage_content FOR UPDATE
  TO authenticated
  USING ((SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin')
  WITH CHECK ((SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin');

CREATE POLICY "Admins can delete homepage content"
  ON homepage_content FOR DELETE
  TO authenticated
  USING ((SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin');

CREATE INDEX IF NOT EXISTS idx_homepage_content_section ON homepage_content(section);
CREATE INDEX IF NOT EXISTS idx_homepage_content_active ON homepage_content(is_active);

CREATE OR REPLACE FUNCTION update_homepage_content_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER homepage_content_updated_at
  BEFORE UPDATE ON homepage_content
  FOR EACH ROW
  EXECUTE FUNCTION update_homepage_content_updated_at();

-- Seed: NAV
INSERT INTO homepage_content (section, key, value_ar, value_en, sort_order) VALUES
('nav', 'features', 'المميزات', 'Features', 1),
('nav', 'academy', 'الأكاديمية', 'Academy', 2),
('nav', 'community', 'المجتمع', 'Community', 3),
('nav', 'pricing', 'الأسعار', 'Pricing', 4),
('nav', 'links_label', 'روابط مهمة', 'Links', 5),
('nav', 'about', 'عن دووودة', 'About Doooda', 6),
('nav', 'contact', 'تواصل مع دووودة', 'Contact Us', 7),
('nav', 'privacy', 'سياسة الخصوصية', 'Privacy Policy', 8),
('nav', 'terms', 'الشروط والأحكام', 'Terms & Conditions', 9),
('nav', 'login', 'تسجيل الدخول', 'Log In', 10),
('nav', 'signup_cta', 'ابدأ مجانًا', 'Start Free', 11)
ON CONFLICT (section, key) DO NOTHING;

-- Seed: HERO
INSERT INTO homepage_content (section, key, value_ar, value_en, sort_order) VALUES
('hero', 'headline', 'اكتب بوعي. حلّل بعمق. طوّر قصتك باحتراف.', 'Write with intention. Analyze deeply. Craft your story professionally.', 1),
('hero', 'subheadline', 'منصة كتابة احترافية مدعومة بالذكاء الاصطناعي تساعدك على بناء حبكة قوية، تحليل بنية عملك، وتحويل فكرتك إلى مشروع قابل للنشر.', 'A professional AI-powered writing platform that helps you build a strong plot, analyze the structure of your work, and transform your idea into a publishable project.', 2),
('hero', 'cta_primary', 'ابدأ مشروعك الآن', 'Start Your Project Now', 3),
('hero', 'cta_secondary', 'شاهد كيف تعمل المنصة', 'See How It Works', 4),
('hero', 'badge_1', 'مساعد كتابة ذكي', 'Smart Writing Assistant', 5),
('hero', 'badge_2', 'ناقد بنيوي احترافي', 'Professional Story Critic', 6),
('hero', 'badge_3', 'تحليل درامي متقدم', 'Advanced Dramatic Analysis', 7)
ON CONFLICT (section, key) DO NOTHING;

-- Seed: WHY (Features section)
INSERT INTO homepage_content (section, key, value_ar, value_en, sort_order) VALUES
('why', 'section_title', 'لماذا دووودة مختلفة؟', 'Why Doooda is Different?', 1),
('why', 'feat1_title', 'مساعد كتابة واعٍ', 'Conscious Writing Assistant', 2),
('why', 'feat1_desc', 'يساعدك في تطوير المشاهد والحوار والبنية الدرامية لقصتك.', 'Helps you develop scenes, dialogue, and dramatic structure for your story.', 3),
('why', 'feat2_title', 'ناقد درامي احترافي', 'Professional Dramatic Critic', 4),
('why', 'feat2_desc', 'تحليل بنيوي دقيق + تقرير أكاديمي للحبكة + رسم بياني للتوتر والسرعة.', 'Precise structural analysis + academic plot report + tension and pacing graph.', 5),
('why', 'feat3_title', 'رؤية كاملة لمشروعك', 'Full Project Vision', 6),
('why', 'feat3_desc', 'تقدم، ملاحظات، كلمات، فصول، مشاهد — في مكان واحد.', 'Progress, notes, words, chapters, scenes — all in one place.', 7),
('why', 'feat4_title', 'مدقق لغوي', 'Language Proofreader', 8),
('why', 'feat4_desc', 'تدقيق لغوي وإملائي احترافي لتضمن جودة النص قبل النشر.', 'Professional language and spell checking to ensure text quality before publishing.', 9)
ON CONFLICT (section, key) DO NOTHING;

-- Seed: CRITIC section
INSERT INTO homepage_content (section, key, value_ar, value_en, sort_order) VALUES
('critic', 'section_label', 'دووودة الناقد', 'Doooda Critic', 1),
('critic', 'title', 'تحليل درامي شامل لحبكتك', 'Comprehensive Dramatic Analysis of Your Plot', 2),
('critic', 'point1', 'تقييم جودة الحبكة', 'Plot quality assessment', 3),
('critic', 'point2', 'كشف الحشو وضعف التصعيد', 'Detect filler and weak buildup', 4),
('critic', 'point3', 'اكتشاف الذروات غير المكتملة', 'Discover incomplete climaxes', 5),
('critic', 'point4', 'تقرير أكاديمي كامل', 'Complete academic report', 6)
ON CONFLICT (section, key) DO NOTHING;

-- Seed: ACADEMY section
INSERT INTO homepage_content (section, key, value_ar, value_en, sort_order) VALUES
('academy', 'section_label', 'الأكاديمية', 'Academy', 1),
('academy', 'title', 'تعلّم الكتابة من منظور بنيوي', 'Learn Writing from a Structural Perspective', 2),
('academy', 'point1', 'كورسات متخصصة في بنية الحبكة', 'Specialized courses in plot structure', 3),
('academy', 'point2', 'ورش عمل تفاعلية', 'Interactive workshops', 4),
('academy', 'point3', 'تتبع تقدّمك الأكاديمي', 'Track your academic progress', 5),
('academy', 'point4', 'زيادة الإنتاجية الكتابية', 'Boost writing productivity', 6)
ON CONFLICT (section, key) DO NOTHING;

-- Seed: MARKETING section
INSERT INTO homepage_content (section, key, value_ar, value_en, sort_order) VALUES
('marketing', 'section_label', 'التسويق والنشر', 'Marketing & Publishing', 1),
('marketing', 'title', 'عندما تنتهي… لا تتوقف.', 'When you''re done… don''t stop.', 2),
('marketing', 'point1', 'تصدير PDF و Word بجودة احترافية', 'Export PDF & Word with professional quality', 3),
('marketing', 'point2', 'قاعدة بيانات دور نشر ضخمة مقسّمة حسب احتياجك', 'Massive publisher database organized by your needs', 4),
('marketing', 'point3', 'تابع كل المسابقات لكي لا يفوتك فرصة', 'Follow all competitions so you never miss an opportunity', 5),
('marketing', 'point4', 'مسابقات خاصة بمشتركي دووودة مع كبرى دور النشر', 'Exclusive competitions for Doooda subscribers with top publishers', 6)
ON CONFLICT (section, key) DO NOTHING;

-- Seed: PRICING section
INSERT INTO homepage_content (section, key, value_ar, value_en, sort_order) VALUES
('pricing', 'section_title', 'اختر الباقة المناسبة لك', 'Choose the Right Plan for You', 1),
('pricing', 'plan1_name', 'كاتب هاوي', 'Hobbyist Writer', 2),
('pricing', 'plan1_price', 'مجانًا', 'Free', 3),
('pricing', 'plan1_period', 'للأبد', 'Forever', 4),
('pricing', 'plan2_name', 'كاتب متمرّس', 'Experienced Writer', 5),
('pricing', 'plan2_price', '7$', '$7', 6),
('pricing', 'plan2_period', 'شهريًا', '/month', 7),
('pricing', 'plan3_name', 'كاتب محترف', 'Professional Writer', 8),
('pricing', 'plan3_price', '15$', '$15', 9),
('pricing', 'plan3_period', 'شهريًا', '/month', 10),
('pricing', 'cta', 'ابدأ الآن', 'Get Started', 11),
('pricing', 'tokens_label', 'باقات توكينز لزيادة الرصيد', 'Token packages to increase balance', 12)
ON CONFLICT (section, key) DO NOTHING;

-- Seed: CTA section
INSERT INTO homepage_content (section, key, value_ar, value_en, sort_order) VALUES
('cta', 'title', 'ابدأ رحلتك الآن', 'Start Your Journey Now', 1),
('cta', 'subtitle', 'انضم إلى آلاف الكتّاب الذين يطوّرون قصصهم مع دووودة', 'Join thousands of writers developing their stories with Doooda', 2),
('cta', 'button', 'ابدأ مجانًا', 'Start Free', 3)
ON CONFLICT (section, key) DO NOTHING;

-- Seed: FOOTER
INSERT INTO homepage_content (section, key, value_ar, value_en, sort_order) VALUES
('footer', 'col1_title', 'المنصة', 'Platform', 1),
('footer', 'col2_title', 'روابط مهمة', 'Important Links', 2),
('footer', 'col3_title', 'اتصل بنا', 'Contact Us', 3),
('footer', 'col4_title', 'شركاء دووودة', 'Doooda Partners', 4),
('footer', 'copyright', 'جميع الحقوق محفوظة لدووودة', 'All rights reserved to Doooda', 5),
('footer', 'col1_features', 'المميزات', 'Features', 6),
('footer', 'col1_academy', 'الأكاديمية', 'Academy', 7),
('footer', 'col1_pricing', 'الأسعار', 'Pricing', 8),
('footer', 'col1_community', 'المجتمع', 'Community', 9),
('footer', 'col2_about', 'عن دووودة', 'About Doooda', 10),
('footer', 'col2_contact', 'تواصل معنا', 'Contact Us', 11),
('footer', 'col2_privacy', 'سياسة الخصوصية', 'Privacy Policy', 12),
('footer', 'col2_terms', 'الشروط والأحكام', 'Terms & Conditions', 13),
('footer', 'col3_email', 'hello@doooda.com', 'hello@doooda.com', 14),
('footer', 'col4_partners', 'قريبًا', 'Coming soon', 15)
ON CONFLICT (section, key) DO NOTHING;
