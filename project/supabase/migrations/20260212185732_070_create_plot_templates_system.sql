/*
  # Create Plot Templates System

  1. New Enum
    - `plot_template_category` - Categories for templates
      - formal: البنية الكلاسيكية (Three-act, Hero's Journey)
      - thematic: البنية الموضوعية (Freytag, Kishōtenketsu)
      - conflict: البنية الصراعية (Man vs, Conflict Triangle)
      - modern: البنية الحديثة (Nonlinear, Multiple POV)
      - hybrid: البنية المختلطة (Custom combinations)

  2. New Table
    - `plot_templates` - Pre-built plot structure templates
    - Contains name, category, description, stages (jsonb array)
    - Each stage has: key, label, guidance, tension, pace, is_climax
    - Templates can be premium (requires paid plan)

  3. Security
    - Enable RLS
    - All authenticated users can read templates
    - Only admins can insert/update/delete templates
    - Premium templates visible to all but usage restricted by app logic

  4. Indexes
    - category for filtering by type
    - is_premium for filtering free vs paid templates

  5. Sample Data
    - Seed with popular templates (Three-Act, Hero's Journey, Freytag)
*/

-- Create enum for template categories
DO $$ BEGIN
  CREATE TYPE plot_template_category AS ENUM (
    'formal',
    'thematic', 
    'conflict',
    'modern',
    'hybrid'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create plot_templates table
CREATE TABLE IF NOT EXISTS plot_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) > 0),
  category plot_template_category NOT NULL,
  description text NOT NULL CHECK (length(description) > 0),
  stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_premium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE plot_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone can read, only admins can modify
CREATE POLICY "Anyone can view plot templates"
  ON plot_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert plot templates"
  ON plot_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update plot templates"
  ON plot_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete plot templates"
  ON plot_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plot_templates_category 
  ON plot_templates(category);

CREATE INDEX IF NOT EXISTS idx_plot_templates_is_premium 
  ON plot_templates(is_premium);

CREATE INDEX IF NOT EXISTS idx_plot_templates_created_at 
  ON plot_templates(created_at DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_plot_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_plot_templates_updated_at
  BEFORE UPDATE ON plot_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_plot_templates_updated_at();

-- Seed popular templates
INSERT INTO plot_templates (name, category, description, stages, is_premium) VALUES

-- Three-Act Structure (Classic)
(
  'البنية الثلاثية الكلاسيكية / Three-Act Structure',
  'formal',
  'البنية الكلاسيكية الأكثر استخداماً في السرد القصصي. تقسم القصة إلى: الإعداد، الصراع، والحل.',
  '[
    {
      "key": "act1_setup",
      "label": "الفصل الأول: الإعداد / Act 1: Setup",
      "guidance": "تقديم الشخصيات والعالم والوضع الطبيعي. انتهِ بحدث محوري يدفع البطل للرحلة.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "act2_confrontation",
      "label": "الفصل الثاني: الصراع / Act 2: Confrontation",
      "guidance": "البطل يواجه تحديات متصاعدة. يكتسب مهارات، يخسر أشياء، ويتطور. انتهِ بأحلك لحظة.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "act3_resolution",
      "label": "الفصل الثالث: الحل / Act 3: Resolution",
      "guidance": "المواجهة النهائية. البطل يستخدم ما تعلمه لحل الصراع. ثم النهاية والإغلاق.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    }
  ]'::jsonb,
  false
),

-- Hero''s Journey (Joseph Campbell)
(
  'رحلة البطل / Hero''s Journey',
  'formal',
  'البنية الأسطورية الشهيرة. البطل يترك عالمه المألوف، يواجه تحديات، ويعود متحولاً.',
  '[
    {
      "key": "ordinary_world",
      "label": "العالم العادي / Ordinary World",
      "guidance": "اعرض حياة البطل الطبيعية قبل المغامرة. ما الذي سيفقده؟",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "call_to_adventure",
      "label": "نداء المغامرة / Call to Adventure",
      "guidance": "حدث أو شخص يدعو البطل للمغامرة. قد يرفض أولاً.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "crossing_threshold",
      "label": "عبور العتبة / Crossing the Threshold",
      "guidance": "البطل يترك العالم المألوف ويدخل عالم المغامرة.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "trials_allies",
      "label": "التجارب والحلفاء / Trials and Allies",
      "guidance": "البطل يواجه اختبارات، يكتسب حلفاء، ويتعلم قواعد العالم الجديد.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "approach_inmost_cave",
      "label": "الاقتراب من الكهف الأعمق / Approach",
      "guidance": "البطل يستعد للمواجهة الكبرى. التوتر يتصاعد.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "ordeal",
      "label": "المحنة / Ordeal",
      "guidance": "أصعب اختبار. البطل يواجه أعمق مخاوفه. موت رمزي أو فعلي.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "reward",
      "label": "المكافأة / Reward",
      "guidance": "البطل يحصل على ما سعى إليه - معرفة، قوة، كنز.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "road_back",
      "label": "طريق العودة / The Road Back",
      "guidance": "البطل يقرر العودة للعالم العادي. قد يواجه مطاردة أخيرة.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "resurrection",
      "label": "البعث / Resurrection",
      "guidance": "اختبار نهائي. البطل الجديد يُولد. تطهير نهائي.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "return_with_elixir",
      "label": "العودة بالإكسير / Return with Elixir",
      "guidance": "البطل يعود متحولاً، حاملاً حكمة أو قوة تفيد عالمه.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
),

-- Freytag''s Pyramid
(
  'هرم فرايتاج / Freytag''s Pyramid',
  'thematic',
  'البنية الدرامية الكلاسيكية المكونة من خمس مراحل: المقدمة، الحدث الصاعد، الذروة، الحدث الهابط، والخاتمة.',
  '[
    {
      "key": "exposition",
      "label": "المقدمة / Exposition",
      "guidance": "تعريف الشخصيات، المكان، والزمان. إنشاء الأساس للصراع.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "rising_action",
      "label": "الحدث الصاعد / Rising Action",
      "guidance": "سلسلة من الأحداث التي تزيد التوتر والصراع تدريجياً.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "climax",
      "label": "الذروة / Climax",
      "guidance": "نقطة التحول الرئيسية. أعلى نقطة في التوتر والصراع.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "falling_action",
      "label": "الحدث الهابط / Falling Action",
      "guidance": "نتائج الذروة تتكشف. التوتر يخف تدريجياً.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "resolution",
      "label": "الخاتمة / Resolution",
      "guidance": "حل الصراعات. الوضع الجديد للشخصيات. الإغلاق.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
),

-- Kishōtenketsu (Japanese)
(
  'كي-شو-تِن-كيتسو / Kishōtenketsu',
  'thematic',
  'البنية اليابانية التقليدية. لا تعتمد على الصراع المباشر، بل على التطور والانقلاب الدرامي.',
  '[
    {
      "key": "ki_introduction",
      "label": "كي: المقدمة / Ki: Introduction",
      "guidance": "تقديم الشخصيات والوضع دون صراع واضح.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "sho_development",
      "label": "شو: التطور / Shō: Development",
      "guidance": "تطوير الموضوع والشخصيات بشكل طبيعي.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "ten_twist",
      "label": "تن: الانقلاب / Ten: Twist",
      "guidance": "إدخال عنصر جديد غير متوقع يغير النظرة للموضوع.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "ketsu_conclusion",
      "label": "كيتسو: الخاتمة / Ketsu: Conclusion",
      "guidance": "ربط جميع العناصر معاً. تقديم رؤية جديدة أو حكمة.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
),

-- Save the Cat (Blake Snyder)
(
  'أنقذ القطة / Save the Cat',
  'modern',
  'بنية هوليوود الحديثة المكونة من 15 نقطة قصصية. مصممة للأفلام لكنها تعمل مع الروايات.',
  '[
    {
      "key": "opening_image",
      "label": "الصورة الافتتاحية / Opening Image",
      "guidance": "لقطة تعرض العالم والبطل قبل التغيير.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "catalyst",
      "label": "المحفز / Catalyst",
      "guidance": "الحدث الذي يقلب حياة البطل رأساً على عقب.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "debate",
      "label": "النقاش / Debate",
      "guidance": "البطل يتردد: هل أذهب في هذه المغامرة أم لا؟",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "break_into_two",
      "label": "الانتقال للفصل الثاني / Break into Two",
      "guidance": "البطل يتخذ القرار ويدخل العالم الجديد.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "fun_and_games",
      "label": "المرح واللعب / Fun and Games",
      "guidance": "الوعد بالفرضية. البطل يجرب العالم الجديد.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "midpoint",
      "label": "نقطة المنتصف / Midpoint",
      "guidance": "انتصار زائف أو هزيمة زائفة. كل شيء يتغير.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "all_is_lost",
      "label": "كل شيء ضائع / All Is Lost",
      "guidance": "أحلك لحظة. البطل يفقد كل شيء.",
      "default_tension": 3,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "dark_night",
      "label": "ليلة الروح المظلمة / Dark Night of the Soul",
      "guidance": "البطل في أدنى نقطة. لحظة تأمل ويأس.",
      "default_tension": 2,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "break_into_three",
      "label": "الانتقال للفصل الثالث / Break into Three",
      "guidance": "البطل يجد الحل. خطة جديدة تولد من الرماد.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "finale",
      "label": "النهاية الكبرى / Finale",
      "guidance": "المواجهة النهائية. البطل الجديد يواجه العدو/المشكلة.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "final_image",
      "label": "الصورة النهائية / Final Image",
      "guidance": "صورة توازي الصورة الافتتاحية، لكن تظهر التحول.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  true
),

-- Seven-Point Story Structure
(
  'البنية السباعية / Seven-Point Story Structure',
  'modern',
  'بنية بسيطة وفعالة. تبدأ من النهاية وتخطط للخلف.',
  '[
    {
      "key": "hook",
      "label": "الخطاف / Hook",
      "guidance": "حالة البطل في البداية. الوضع الطبيعي.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "plot_turn_1",
      "label": "نقطة التحول الأولى / Plot Turn 1",
      "guidance": "حدث يدفع البطل من الراحة إلى المغامرة.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "pinch_1",
      "label": "الضغط الأول / Pinch 1",
      "guidance": "القوة المضادة تضغط على البطل. تذكير بالتهديد.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "midpoint",
      "label": "نقطة المنتصف / Midpoint",
      "guidance": "البطل يتحول من رد فعل إلى فعل. يتخذ زمام المبادرة.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "pinch_2",
      "label": "الضغط الثاني / Pinch 2",
      "guidance": "ضغط أقوى. القوة المضادة تحكم قبضتها.",
      "default_tension": 3,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "plot_turn_2",
      "label": "نقطة التحول الثانية / Plot Turn 2",
      "guidance": "البطل يحصل على المعلومة/القوة النهائية للمواجهة.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "resolution",
      "label": "الحل / Resolution",
      "guidance": "حالة البطل النهائية. يجب أن تكون نقيض الخطاف.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    }
  ]'::jsonb,
  true
)

ON CONFLICT DO NOTHING;

-- Add comment to table
COMMENT ON TABLE plot_templates IS 'Pre-built plot structure templates that users can apply to their plot projects';
COMMENT ON COLUMN plot_templates.stages IS 'Array of plot stages, each with key, label, guidance, default_tension, default_pace, and is_climax_stage';
COMMENT ON COLUMN plot_templates.is_premium IS 'Whether this template requires a paid plan to use';
