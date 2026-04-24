/*
  # Fix Plot Templates Labels

  1. Changes
    - Fix "الفصل الأول/الثاني/الثالث" in Three-Act Structure to use "المرحلة" instead
    - Ensure all labels are clear and don't contain duplicate "chapter" references
    - Keep labels concise and descriptive

  2. Reason
    - When distributing template stages across chapters, the current labels cause duplication
    - Example: "الفصل الأول: الإعداد - 1/3" looks confusing
    - Better: "المرحلة الأولى: الإعداد - 1/3"
*/

-- Update Three-Act Structure template
UPDATE plot_templates
SET stages = '[
  {
    "key": "act1_setup",
    "label": "المرحلة الأولى: الإعداد / Act 1: Setup",
    "guidance": "تقديم الشخصيات والعالم والوضع الطبيعي. انتهِ بحدث محوري يدفع البطل للرحلة.",
    "default_tension": 1,
    "default_pace": 2,
    "is_climax_stage": false
  },
  {
    "key": "act2_confrontation",
    "label": "المرحلة الثانية: الصراع / Act 2: Confrontation",
    "guidance": "البطل يواجه تحديات متصاعدة. يكتسب مهارات، يخسر أشياء، ويتطور. انتهِ بأحلك لحظة.",
    "default_tension": 2,
    "default_pace": 3,
    "is_climax_stage": false
  },
  {
    "key": "act3_resolution",
    "label": "المرحلة الثالثة: الحل / Act 3: Resolution",
    "guidance": "المواجهة النهائية. البطل يستخدم ما تعلمه لحل الصراع. ثم النهاية والإغلاق.",
    "default_tension": 3,
    "default_pace": 3,
    "is_climax_stage": true
  }
]'::jsonb
WHERE name = 'البنية الثلاثية الكلاسيكية / Three-Act Structure';
