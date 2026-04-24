/*
  # Add Comprehensive Plot Templates

  1. Overview
    - Adding 18 new plot templates across all categories
    - 13 free templates (formal, conflict, thematic, modern)
    - 5 premium templates (hybrid)
    - Each template has unique structure fitting its nature

  2. Categories Breakdown
    - formal: 3 templates (Classic Linear, Circular, Parallel)
    - conflict: 4 templates (Quest, Revenge, Man vs Man, Man vs Self)
    - thematic: 3 templates (Transformation, Gradual Fall, Cinderella)
    - modern: 3 templates (Mystery, Non-Linear, Dark Comedy)
    - hybrid: 5 templates (all premium - Political Tragedy, Romantic Quest, Political Mystery, Tragic Romance, Political Dark Satire)

  3. Stage Counts
    - Ranges from 4 to 7 stages per template
    - Each designed specifically for the plot type
    - Natural tension and pace progression

  4. Notes
    - All stages include bilingual labels (Arabic/English)
    - Guidance text provided for each stage
    - Climax stages marked appropriately
    - Tension and pace levels set realistically
*/

-- FORMAL CATEGORY (3 templates)

INSERT INTO plot_templates (name, category, description, stages, is_premium) VALUES

(
  'الحبكة الخطية الكلاسيكية / Classic Linear Plot',
  'formal',
  'البنية السردية التقليدية المباشرة التي تتدفق من البداية إلى النهاية بشكل متسلسل. الأحداث تتصاعد بشكل منطقي حتى الوصول للذروة والحل.',
  '[
    {
      "key": "beginning",
      "label": "البداية / Beginning",
      "guidance": "تقديم الشخصيات والعالم والوضع الطبيعي قبل بدء الأحداث.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "inciting_incident",
      "label": "الحدث المحفز / Inciting Incident",
      "guidance": "حدث يكسر الوضع الطبيعي ويدفع القصة للأمام.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "rising_action",
      "label": "التصاعد / Rising Action",
      "guidance": "الصراعات والتحديات تتزايد. الشخصيات تتطور وتواجه عقبات متصاعدة.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "climax",
      "label": "الذروة / Climax",
      "guidance": "نقطة التحول الرئيسية. المواجهة الأكبر أو القرار الأهم.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "resolution",
      "label": "الحل / Resolution",
      "guidance": "الأحداث تستقر. النتائج تتضح. الوضع الجديد يُرسخ.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
),

(
  'الحبكة الدائرية / Circular Plot',
  'formal',
  'بنية تعود فيها القصة لنقطة البداية، لكن الشخصية تكون قد تحولت. النهاية تعكس البداية لكن بمعنى مختلف.',
  '[
    {
      "key": "starting_point",
      "label": "نقطة البداية / Starting Point",
      "guidance": "تأسيس الوضع الأولي والمكان الذي سنعود إليه لاحقاً.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "departure",
      "label": "الرحلة / Departure",
      "guidance": "الشخصية تغادر نقطة البداية. بداية التحول.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "transformation",
      "label": "التحول / Transformation",
      "guidance": "التجارب الأساسية التي تغير الشخصية. الدروس المستفادة.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "return",
      "label": "العودة / Return",
      "guidance": "الشخصية تعود لنقطة البداية لكنها شخص مختلف. رؤية جديدة.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
),

(
  'الحبكة المتوازية / Parallel Plot',
  'formal',
  'خطان قصصيان أو أكثر يسيران بشكل متوازٍ ثم يتقاطعان. كل خط له تأثيره على الآخر حتى يتوحدا في النهاية.',
  '[
    {
      "key": "storyline_a",
      "label": "خط القصة الأول / Storyline A",
      "guidance": "تقديم الخط القصصي الأول والشخصيات المرتبطة به.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "storyline_b",
      "label": "خط القصة الثاني / Storyline B",
      "guidance": "تقديم الخط القصصي الثاني. يبدو منفصلاً لكنه مرتبط.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "parallel_development",
      "label": "التطور المتوازي / Parallel Development",
      "guidance": "كلا الخطين يتطوران بشكل منفصل. التوتر يتصاعد في كليهما.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "intersection",
      "label": "التقاطع / Intersection",
      "guidance": "الخطان يلتقيان. الشخصيات تتفاعل. الارتباط يتكشف.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "unified_climax",
      "label": "الذروة المشتركة / Unified Climax",
      "guidance": "كلا الخطين يصلان للذروة معاً. تأثير متبادل.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "convergence",
      "label": "التوحيد / Convergence",
      "guidance": "الخطان يندمجان في نتيجة واحدة. النهاية المشتركة.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
);

-- CONFLICT CATEGORY (4 templates)

INSERT INTO plot_templates (name, category, description, stages, is_premium) VALUES

(
  'حبكة الرحلة / Quest Plot',
  'conflict',
  'البطل ينطلق في مهمة للبحث عن شيء ثمين. الرحلة نفسها تحوله. قد يجد ما يبحث عنه أو يكتشف شيئاً أهم.',
  '[
    {
      "key": "call",
      "label": "الدعوة / The Call",
      "guidance": "البطل يتلقى دعوة أو يكتشف حاجة للانطلاق في الرحلة.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "departure",
      "label": "الانطلاق / Departure",
      "guidance": "البطل يترك عالمه المألوف ويبدأ الرحلة. لا عودة للخلف.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "trials",
      "label": "التحديات / Trials",
      "guidance": "سلسلة من الاختبارات والعقبات. البطل يتعلم وينمو.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "ordeal",
      "label": "المحنة / The Ordeal",
      "guidance": "الاختبار الأكبر. البطل يواجه أصعب تحدٍ. قد يفشل.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "achievement",
      "label": "النجاح / Achievement",
      "guidance": "البطل يحصل على ما كان يبحث عنه، أو يدرك الحقيقة الأكبر.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "return",
      "label": "العودة / The Return",
      "guidance": "البطل يعود متحولاً. تطبيق ما تعلمه. تأثيره على العالم.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
),

(
  'حبكة الانتقام / Revenge Plot',
  'conflict',
  'شخص يتعرض لظلم فادح فيقرر الانتقام. الرحلة نحو الانتقام تستهلكه. السؤال: هل يستحق الانتقام الثمن؟',
  '[
    {
      "key": "injustice",
      "label": "الظلم / The Injustice",
      "guidance": "حدث مأساوي. البطل يفقد شيئاً ثميناً أو يُظلم بشدة.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "vow",
      "label": "القسم / The Vow",
      "guidance": "البطل يقسم على الانتقام. قرار لا رجعة فيه.",
      "default_tension": 2,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "preparation",
      "label": "التحضير / Preparation",
      "guidance": "جمع المعلومات، بناء القوة، التخطيط. البطل يتغير.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "first_strike",
      "label": "الضربة الأولى / First Strike",
      "guidance": "البطل يبدأ خطته. عدم عودة. الانتقام بدأ فعلياً.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "confrontation",
      "label": "المواجهة / Confrontation",
      "guidance": "المواجهة النهائية مع من ظلمه. كل شيء على المحك.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "price",
      "label": "الثمن / The Price",
      "guidance": "الانتقام تحقق، لكن بأي ثمن؟ ما الذي خسره البطل في الطريق؟",
      "default_tension": 2,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
),

(
  'رجل ضد رجل / Man vs Man',
  'conflict',
  'صراع مباشر بين بطلين متعارضين. كل واحد يمثل قيماً أو أهدافاً متضادة. الصراع شخصي وواضح.',
  '[
    {
      "key": "introduction",
      "label": "التعارف / Introduction",
      "guidance": "تقديم الطرفين المتصارعين. ما الذي يريده كل منهما؟",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "first_conflict",
      "label": "الصراع الأول / First Conflict",
      "guidance": "أول اصطدام بين الطرفين. طبيعة الخلاف تتضح.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "escalation",
      "label": "التصعيد / Escalation",
      "guidance": "الصراع يتفاقم. كل طرف يحاول الفوز. الرهانات ترتفع.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "point_of_no_return",
      "label": "نقطة اللاعودة / Point of No Return",
      "guidance": "حدث يجعل الحل السلمي مستحيلاً. المواجهة حتمية.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "final_showdown",
      "label": "المواجهة النهائية / Final Showdown",
      "guidance": "الصراع يصل للذروة. واحد سيفوز، والآخر سيخسر.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "aftermath",
      "label": "ما بعد المعركة / Aftermath",
      "guidance": "النتائج. من فاز؟ ما الثمن؟ كيف تغير الطرفان؟",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
),

(
  'رجل ضد الذات / Man vs Self',
  'conflict',
  'الصراع الداخلي. البطل يحارب مخاوفه، شكوكه، أو جانبه المظلم. العدو الحقيقي بداخله.',
  '[
    {
      "key": "normal_state",
      "label": "الوضع الطبيعي / Normal State",
      "guidance": "حياة البطل قبل بدء الصراع الداخلي. الهدوء الظاهري.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "inner_doubt",
      "label": "الشك الداخلي / Inner Doubt",
      "guidance": "شيء يحفز الشك أو الخوف. البطل يبدأ في التساؤل عن نفسه.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "internal_battle",
      "label": "المعركة الداخلية / Internal Battle",
      "guidance": "الصراع يتفاقم. البطل يواجه أعمق مخاوفه وعيوبه.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "breaking_point",
      "label": "نقطة الانهيار / Breaking Point",
      "guidance": "البطل في أسوأ حالاته. اللحظة الأحلك. قد يستسلم أو ينهض.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "decision",
      "label": "القرار الصعب / The Decision",
      "guidance": "البطل يتخذ قراراً يحدد مصيره. يواجه نفسه بصدق.",
      "default_tension": 3,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "acceptance",
      "label": "القبول / Acceptance",
      "guidance": "البطل يقبل نفسه أو يتغلب على صراعه. السلام الداخلي.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
);

-- THEMATIC CATEGORY (3 templates)

INSERT INTO plot_templates (name, category, description, stages, is_premium) VALUES

(
  'حبكة التحول / Transformation Plot',
  'thematic',
  'رحلة تحول عميقة. الشخصية تبدأ بحالة وتنتهي بحالة مختلفة تماماً. التحول داخلي وخارجي.',
  '[
    {
      "key": "initial_state",
      "label": "الوضع الأولي / Initial State",
      "guidance": "من هو البطل قبل التحول؟ ما هي صفاته وقيمه ومعتقداته؟",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "catalyst",
      "label": "المحفز / Catalyst",
      "guidance": "حدث أو شخص يبدأ عملية التحول. قد يكون صادماً.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "resistance",
      "label": "المقاومة / Resistance",
      "guidance": "البطل يقاوم التغيير. يتمسك بما يعرفه. الخوف من المجهول.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "breakdown",
      "label": "الانهيار / Breakdown",
      "guidance": "المقاومة تنهار. البطل يفقد ما كان يتمسك به. فراغ.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "rebirth",
      "label": "الولادة الجديدة / Rebirth",
      "guidance": "البطل يخرج من التجربة متحولاً. شخص جديد بقيم ورؤية جديدة.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
),

(
  'حبكة السقوط التدريجي / Gradual Fall Plot',
  'thematic',
  'قصة سقوط بطل من القمة إلى الحضيض. كل قرار خاطئ يقوده لقرار أسوأ. مأساوية وحتمية.',
  '[
    {
      "key": "peak",
      "label": "القمة / The Peak",
      "guidance": "البطل في أفضل حالاته. نجاح، قوة، احترام. كل شيء مثالي.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "first_mistake",
      "label": "الخطأ الأول / First Mistake",
      "guidance": "خطأ صغير، يبدو غير مهم. لكنه بداية الانزلاق.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "slipping",
      "label": "الانزلاق / Slipping",
      "guidance": "الأخطاء تتراكم. البطل يحاول إصلاح الأمور لكنه يزيدها سوءاً.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "desperation",
      "label": "اليأس / Desperation",
      "guidance": "البطل يدرك حجم المشكلة. محاولات يائسة للنجاة.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "loss_of_control",
      "label": "فقدان السيطرة / Loss of Control",
      "guidance": "كل شيء ينهار. البطل لم يعد قادراً على إيقاف السقوط.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "rock_bottom",
      "label": "الحضيض / Rock Bottom",
      "guidance": "النهاية. البطل فقد كل شيء. الدرس المأساوي.",
      "default_tension": 2,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
),

(
  'حبكة سندريلا / Cinderella Plot',
  'thematic',
  'من الحضيض إلى القمة. البطل يبدأ في وضع صعب لكن شيئاً ما يمنحه الفرصة للتألق. حلم يتحقق.',
  '[
    {
      "key": "suffering",
      "label": "المعاناة / Suffering",
      "guidance": "البطل في وضع صعب. ظلم، فقر، إهمال. الحياة قاسية.",
      "default_tension": 2,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "hope",
      "label": "بصيص الأمل / Glimpse of Hope",
      "guidance": "شيء يعطي البطل أملاً. حلم أو فرصة بعيدة.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "magical_help",
      "label": "المساعدة السحرية / Magical Help",
      "guidance": "شخص أو حدث يساعد البطل. فرصة حقيقية تظهر.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "opportunity",
      "label": "الفرصة الذهبية / Golden Opportunity",
      "guidance": "البطل يحصل على فرصته. لحظة التألق. الحلم يبدو قريباً.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "test",
      "label": "الاختبار / The Test",
      "guidance": "البطل يواجه تحدياً يهدد حلمه. هل يستحق الفرصة حقاً؟",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "transformation",
      "label": "التحول / Transformation",
      "guidance": "البطل يثبت نفسه. التحول من الحضيض للقمة يكتمل.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "happiness",
      "label": "السعادة / Happiness",
      "guidance": "النهاية السعيدة. البطل نال ما يستحق. العدالة تحققت.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
);

-- MODERN CATEGORY (3 templates)

INSERT INTO plot_templates (name, category, description, stages, is_premium) VALUES

(
  'حبكة الغموض / Mystery Plot',
  'modern',
  'لغز يحتاج حلاً. التشويق يأتي من كشف الحقيقة تدريجياً. الأدلة المضللة والمفاجآت جزء أساسي.',
  '[
    {
      "key": "crime",
      "label": "الجريمة أو الحدث / Crime or Event",
      "guidance": "الحدث الغامض يقع. سؤال كبير يحتاج إجابة.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "investigation",
      "label": "التحقيق / Investigation",
      "guidance": "البطل يبدأ البحث عن الحقيقة. جمع المعلومات والأدلة.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "red_herrings",
      "label": "الأدلة المضللة / Red Herrings",
      "guidance": "مسارات خاطئة. مشتبه بهم أبرياء. الحقيقة تبدو بعيدة.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "breakthrough",
      "label": "الاختراق / Breakthrough",
      "guidance": "دليل حاسم يظهر. الحقيقة تبدأ بالتكشف.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "confrontation",
      "label": "المواجهة / Confrontation",
      "guidance": "البطل يواجه الجاني. الحقيقة تُكشف. قد يكون هناك خطر.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "revelation",
      "label": "الكشف الكامل / Full Revelation",
      "guidance": "كل القطع تتجمع. الصورة الكاملة تتضح. العدالة تتحقق أو لا.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
),

(
  'الحبكة غير الخطية / Non-Linear Plot',
  'modern',
  'السرد يقفز عبر الزمن. الماضي والحاضر والمستقبل يتداخلون. المعنى يتكشف من خلال الترتيب غير التقليدي.',
  '[
    {
      "key": "present_crisis",
      "label": "أزمة الحاضر / Present Crisis",
      "guidance": "نبدأ بلحظة حرجة في الحاضر. سؤال كبير بحاجة إجابة.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "distant_past",
      "label": "الماضي البعيد / Distant Past",
      "guidance": "قفزة للماضي البعيد. الجذور الأولى للأحداث الحالية.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "recent_past",
      "label": "الماضي القريب / Recent Past",
      "guidance": "أحداث أقرب للحاضر. كيف وصلنا لهذه النقطة؟",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "turning_point",
      "label": "نقطة التحول / Turning Point",
      "guidance": "حدث في الماضي غيّر كل شيء. مفتاح فهم الحاضر.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "future_glimpse",
      "label": "لمحة المستقبل / Future Glimpse",
      "guidance": "نرى ما قد يحدث. التوتر بين الماضي والحاضر والمستقبل.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "convergence",
      "label": "التقارب / Convergence",
      "guidance": "كل الخطوط الزمنية تتقارب. المعنى الكامل يتضح.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
),

(
  'الكوميديا السوداء / Dark Comedy Plot',
  'modern',
  'مواقف عبثية ومأساوية لكن مقدمة بشكل كوميدي. الضحك والرعب معاً. السخرية من القسوة.',
  '[
    {
      "key": "absurd_situation",
      "label": "الموقف العبثي / Absurd Situation",
      "guidance": "موقف سخيف أو غير طبيعي. البداية الكوميدية المظلمة.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "comic_escalation",
      "label": "التصعيد الكوميدي / Comic Escalation",
      "guidance": "الأمور تزداد سوءاً بطريقة مضحكة. محاولات فاشلة.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "funny_tragedy",
      "label": "المأساة المضحكة / Funny Tragedy",
      "guidance": "أحداث مأساوية لكن مقدمة بشكل سخيف. الضحك والألم.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "dark_climax",
      "label": "الذروة السوداء / Dark Climax",
      "guidance": "أسوأ ما يمكن أن يحدث، يحدث. لكن بطريقة عبثية.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "ironic_ending",
      "label": "النهاية الساخرة / Ironic Ending",
      "guidance": "نهاية تجمع السخرية واليأس. ضحكة مرة.",
      "default_tension": 2,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  false
);

-- HYBRID CATEGORY (5 templates - ALL PREMIUM)

INSERT INTO plot_templates (name, category, description, stages, is_premium) VALUES

(
  'صراع سياسي مأساوي / Tragic Political Conflict',
  'hybrid',
  'دمج الصراع السياسي مع التراجيديا. طموح سياسي يقود لسقوط مأساوي. القوة تفسد والسلطة تدمر.',
  '[
    {
      "key": "political_ambition",
      "label": "الطموح السياسي / Political Ambition",
      "guidance": "شخصية تطمح للسلطة. أحلام نبيلة أو أنانية. البداية المشرقة.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "rise",
      "label": "الصعود / The Rise",
      "guidance": "البطل يكسب القوة والتأثير. النجاح يأتي بثمن خفي.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "conspiracies",
      "label": "المؤامرات / Conspiracies",
      "guidance": "اللعبة السياسية تكشف عن وجهها القبيح. أعداء في كل مكان.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "corruption",
      "label": "الفساد / Corruption",
      "guidance": "البطل يبدأ بالتنازل عن قيمه. القوة تفسد تدريجياً.",
      "default_tension": 3,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "betrayal",
      "label": "الخيانة / Betrayal",
      "guidance": "خيانة كبرى من الأقربين. كل شيء ينهار.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "tragic_fall",
      "label": "السقوط المأساوي / Tragic Fall",
      "guidance": "البطل يفقد كل شيء. نهاية مأساوية حتمية.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "lesson",
      "label": "الدرس / The Lesson",
      "guidance": "الرسالة السياسية والإنسانية. ثمن الطموح الأعمى.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  true
),

(
  'رحلة رومانسية / Romantic Quest',
  'hybrid',
  'دمج رحلة البحث مع قصة حب. الحب يكون الدافع للرحلة أو ينشأ خلالها. المغامرة والعاطفة معاً.',
  '[
    {
      "key": "dream",
      "label": "الحلم / The Dream",
      "guidance": "حلم أو هدف يدفع البطل للانطلاق. الأمل والشوق.",
      "default_tension": 1,
      "default_pace": 1,
      "is_climax_stage": false
    },
    {
      "key": "meeting",
      "label": "اللقاء / The Meeting",
      "guidance": "البطل يلتقي بمن سيشاركه الرحلة. كيمياء أولية.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "journey_together",
      "label": "الرحلة المشتركة / Journey Together",
      "guidance": "الاثنان ينطلقان معاً. المغامرة تقربهما. الحب ينمو.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "challenges",
      "label": "التحديات / Challenges",
      "guidance": "عقبات خارجية تختبر علاقتهما وعزمهما.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "emotional_test",
      "label": "الاختبار العاطفي / Emotional Test",
      "guidance": "الحب نفسه يُختبر. هل سيستمران معاً أم سينفصلان؟",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "arrival",
      "label": "الوصول / Arrival",
      "guidance": "يصلان للهدف. الحب والرحلة تكتملان معاً.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    }
  ]'::jsonb,
  true
),

(
  'غموض سياسي / Political Mystery',
  'hybrid',
  'تحقيق في فضيحة أو مؤامرة سياسية. كلما اقتربنا من الحقيقة، زاد الخطر. الحقيقة مدفونة تحت طبقات من الكذب.',
  '[
    {
      "key": "scandal",
      "label": "الفضيحة / The Scandal",
      "guidance": "حدث سياسي غامض. سؤال يحتاج إجابة. خطر خفي.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "investigation",
      "label": "التحقيق / Investigation",
      "guidance": "البطل يبدأ البحث. مقابلات، وثائق، أسرار.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "conspiracy",
      "label": "المؤامرة / Conspiracy",
      "guidance": "يتضح أن الأمر أكبر مما يبدو. شبكة معقدة من الفساد.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "evidence",
      "label": "الأدلة / Evidence",
      "guidance": "أدلة دامغة تظهر. الحقيقة تقترب. الخطر يتصاعد.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "confrontation",
      "label": "المواجهة / Confrontation",
      "guidance": "البطل يواجه القوى الفاسدة. كل شيء على المحك.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "exposure",
      "label": "الكشف الكبير / The Big Exposure",
      "guidance": "الحقيقة تُنشر. عواقب سياسية كبرى. العدالة أو الإحباط.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    }
  ]'::jsonb,
  true
),

(
  'رومانسية مأساوية / Tragic Romance',
  'hybrid',
  'قصة حب محكوم عليها بالفشل. الحب عميق لكن العوائق أقوى. النهاية حزينة لكن الحب يبقى خالداً.',
  '[
    {
      "key": "meeting",
      "label": "اللقاء / The Meeting",
      "guidance": "لقاء القدر. حب من النظرة الأولى أو نمو تدريجي.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "falling_in_love",
      "label": "الوقوع في الحب / Falling in Love",
      "guidance": "الحب ينمو ويزدهر. لحظات سعيدة. الأمل في المستقبل.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "obstacles",
      "label": "العوائق / Obstacles",
      "guidance": "عقبات تهدد الحب. عائلات، مجتمع، ظروف خارجية.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "struggle",
      "label": "الصراع / Struggle",
      "guidance": "الحبيبان يحاولان البقاء معاً رغم كل شيء.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "sacrifice",
      "label": "التضحية / Sacrifice",
      "guidance": "أحدهما أو كلاهما يضحي. قرار مؤلم لا مفر منه.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "loss",
      "label": "الفقدان / Loss",
      "guidance": "النهاية المأساوية. الفراق، الموت، أو الخسارة. الحب يبقى كذكرى.",
      "default_tension": 2,
      "default_pace": 1,
      "is_climax_stage": false
    }
  ]'::jsonb,
  true
),

(
  'سخرية سياسية سوداء / Political Dark Satire',
  'hybrid',
  'نقد ساخر للنظام السياسي من خلال الكوميديا السوداء. الفساد والعبثية مقدمان بشكل مضحك ومخيف.',
  '[
    {
      "key": "absurd_system",
      "label": "النظام العبثي / Absurd System",
      "guidance": "تقديم النظام السياسي كمهزلة. البداية الساخرة.",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "naive_attempt",
      "label": "المحاولة الساذجة / Naive Attempt",
      "guidance": "شخص يحاول إصلاح النظام. سذاجة مضحكة.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "comic_corruption",
      "label": "الفساد الكوميدي / Comic Corruption",
      "guidance": "الفساد مكشوف بشكل مضحك. الجميع متورط.",
      "default_tension": 2,
      "default_pace": 3,
      "is_climax_stage": false
    },
    {
      "key": "satirical_climax",
      "label": "الذروة الساخرة / Satirical Climax",
      "guidance": "أسوأ ما في النظام يظهر بشكل عبثي ومضحك.",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    },
    {
      "key": "ridiculous_fall",
      "label": "السقوط المضحك / Ridiculous Fall",
      "guidance": "النظام ينهار بطريقة سخيفة. نهاية ساخرة ومظلمة.",
      "default_tension": 2,
      "default_pace": 2,
      "is_climax_stage": false
    }
  ]'::jsonb,
  true
);

-- Add helpful comment
COMMENT ON TABLE plot_templates IS 'Comprehensive collection of 24 plot templates covering classic, modern, and hybrid story structures';
