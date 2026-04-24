# نظام نماذج الحبكات الجاهزة | Plot Templates System

## نظرة عامة | Overview

نظام القوالب الجاهزة يوفر بنيات حبكة معروفة يمكن للكتّاب استخدامها كنقطة انطلاق لمشاريعهم.

**Features:**
- ✅ قوالب جاهزة للبنيات الشهيرة
- ✅ تصنيف حسب النوع (formal, thematic, conflict, modern, hybrid)
- ✅ قوالب مجانية ومدفوعة
- ✅ إرشادات لكل مرحلة
- ✅ إعدادات افتراضية للتوتر والسرعة

---

## الجدول الأساسي | Main Table

### `plot_templates`

```sql
CREATE TABLE plot_templates (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  category plot_template_category NOT NULL,
  description text NOT NULL,
  stages jsonb NOT NULL,
  is_premium boolean DEFAULT false,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
```

---

## التصنيفات | Categories

```sql
CREATE TYPE plot_template_category AS ENUM (
  'formal',     -- البنية الكلاسيكية (Three-Act, Hero's Journey)
  'thematic',   -- البنية الموضوعية (Freytag, Kishōtenketsu)
  'conflict',   -- البنية الصراعية (Man vs, Conflict Triangle)
  'modern',     -- البنية الحديثة (Nonlinear, Save the Cat)
  'hybrid'      -- البنية المختلطة (Custom combinations)
);
```

---

## بنية المراحل | Stages Structure

كل قالب يحتوي على `stages` كـ jsonb array. كل مرحلة تحتوي على:

```typescript
interface PlotStage {
  key: string;                 // معرف فريد للمرحلة
  label: string;               // اسم المرحلة (ثنائي اللغة)
  guidance: string;            // إرشادات للكاتب
  default_tension: number;     // 1-3 (منخفض، متوسط، عالي)
  default_pace: number;        // 1-3 (بطيء، متوسط، سريع)
  is_climax_stage: boolean;    // هل هذه مرحلة ذروة؟
}
```

### مثال من Three-Act Structure:

```json
{
  "key": "act1_setup",
  "label": "الفصل الأول: الإعداد / Act 1: Setup",
  "guidance": "تقديم الشخصيات والعالم والوضع الطبيعي. انتهِ بحدث محوري يدفع البطل للرحلة.",
  "default_tension": 1,
  "default_pace": 2,
  "is_climax_stage": false
}
```

---

## القوالب الجاهزة | Included Templates

### 1. البنية الثلاثية الكلاسيكية | Three-Act Structure
- **Category**: formal
- **Premium**: No
- **Stages**: 3
- **Description**: البنية الكلاسيكية الأكثر استخداماً في السرد القصصي

**المراحل:**
1. Act 1: Setup (التوتر: منخفض، السرعة: متوسط)
2. Act 2: Confrontation (التوتر: متوسط، السرعة: عالي)
3. Act 3: Resolution (التوتر: عالي، السرعة: عالي) ⭐ Climax

---

### 2. رحلة البطل | Hero's Journey
- **Category**: formal
- **Premium**: No
- **Stages**: 10
- **Description**: البنية الأسطورية الشهيرة (Joseph Campbell)

**المراحل:**
1. Ordinary World
2. Call to Adventure
3. Crossing the Threshold
4. Trials and Allies
5. Approach to Inmost Cave
6. Ordeal ⭐ Climax
7. Reward
8. The Road Back
9. Resurrection ⭐ Climax
10. Return with Elixir

---

### 3. هرم فرايتاج | Freytag's Pyramid
- **Category**: thematic
- **Premium**: No
- **Stages**: 5
- **Description**: البنية الدرامية الكلاسيكية

**المراحل:**
1. Exposition
2. Rising Action
3. Climax ⭐
4. Falling Action
5. Resolution

---

### 4. كي-شو-تِن-كيتسو | Kishōtenketsu
- **Category**: thematic
- **Premium**: No
- **Stages**: 4
- **Description**: البنية اليابانية التقليدية (بدون صراع مباشر)

**المراحل:**
1. Ki: Introduction
2. Shō: Development
3. Ten: Twist ⭐
4. Ketsu: Conclusion

---

### 5. أنقذ القطة | Save the Cat
- **Category**: modern
- **Premium**: Yes
- **Stages**: 11
- **Description**: بنية هوليوود الحديثة (Blake Snyder)

**المراحل:**
1. Opening Image
2. Catalyst
3. Debate
4. Break into Two
5. Fun and Games
6. Midpoint
7. All Is Lost
8. Dark Night of the Soul
9. Break into Three
10. Finale ⭐ Climax
11. Final Image

---

### 6. البنية السباعية | Seven-Point Story Structure
- **Category**: modern
- **Premium**: Yes
- **Stages**: 7
- **Description**: بنية بسيطة وفعالة

**المراحل:**
1. Hook
2. Plot Turn 1
3. Pinch 1
4. Midpoint
5. Pinch 2
6. Plot Turn 2
7. Resolution ⭐ Climax

---

## الأمان | Security (RLS)

### Policies

```sql
-- القراءة: جميع المستخدمين المصادق عليهم
CREATE POLICY "Anyone can view plot templates"
  ON plot_templates FOR SELECT
  TO authenticated
  USING (true);

-- الإدراج: الأدمن فقط
CREATE POLICY "Only admins can insert plot templates"
  ON plot_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- التعديل: الأدمن فقط
CREATE POLICY "Only admins can update plot templates"
  ON plot_templates FOR UPDATE
  TO authenticated
  USING (...admin check...)
  WITH CHECK (...admin check...);

-- الحذف: الأدمن فقط
CREATE POLICY "Only admins can delete plot templates"
  ON plot_templates FOR DELETE
  TO authenticated
  USING (...admin check...);
```

---

## الاستخدام | Usage

### 1. جلب جميع القوالب

```typescript
const { data: templates, error } = await supabase
  .from('plot_templates')
  .select('*')
  .order('category', { ascending: true })
  .order('name', { ascending: true });
```

### 2. تصفية حسب الفئة

```typescript
const { data: formalTemplates } = await supabase
  .from('plot_templates')
  .select('*')
  .eq('category', 'formal');
```

### 3. جلب القوالب المجانية فقط

```typescript
const { data: freeTemplates } = await supabase
  .from('plot_templates')
  .select('*')
  .eq('is_premium', false);
```

### 4. جلب قالب محدد مع المراحل

```typescript
const { data: template } = await supabase
  .from('plot_templates')
  .select('id, name, description, stages')
  .eq('id', templateId)
  .single();

// الوصول للمراحل
const stages = template.stages as PlotStage[];
```

### 5. تطبيق قالب على مشروع

```typescript
// 1. احصل على القالب
const { data: template } = await supabase
  .from('plot_templates')
  .select('stages')
  .eq('id', templateId)
  .single();

// 2. أنشئ plot_chapters من المراحل
const stages = template.stages as PlotStage[];

for (let i = 0; i < stages.length; i++) {
  const stage = stages[i];

  await supabase
    .from('plot_chapters')
    .insert({
      plot_project_id: plotProjectId,
      order_index: i + 1,
      title: stage.label,
      summary: stage.guidance,
      tension_level: stage.default_tension,
      pace_level: stage.default_pace,
      has_climax: stage.is_climax_stage,
      system_notes: `Created from template: ${template.name}`
    });
}
```

---

## إضافة قوالب جديدة | Adding New Templates

### كأدمن في SQL

```sql
INSERT INTO plot_templates (name, category, description, stages, is_premium)
VALUES (
  'اسم القالب الجديد',
  'modern',
  'وصف القالب',
  '[
    {
      "key": "stage_1",
      "label": "المرحلة الأولى",
      "guidance": "إرشادات...",
      "default_tension": 1,
      "default_pace": 2,
      "is_climax_stage": false
    },
    {
      "key": "stage_2",
      "label": "المرحلة الثانية",
      "guidance": "إرشادات...",
      "default_tension": 3,
      "default_pace": 3,
      "is_climax_stage": true
    }
  ]'::jsonb,
  false
);
```

### التحقق من صحة JSON

```typescript
function validateStage(stage: any): boolean {
  return (
    typeof stage.key === 'string' &&
    typeof stage.label === 'string' &&
    typeof stage.guidance === 'string' &&
    typeof stage.default_tension === 'number' &&
    stage.default_tension >= 1 &&
    stage.default_tension <= 3 &&
    typeof stage.default_pace === 'number' &&
    stage.default_pace >= 1 &&
    stage.default_pace <= 3 &&
    typeof stage.is_climax_stage === 'boolean'
  );
}
```

---

## استعلامات مفيدة | Useful Queries

### عدد القوالب حسب الفئة

```sql
SELECT
  category,
  COUNT(*) as template_count,
  SUM(CASE WHEN is_premium THEN 1 ELSE 0 END) as premium_count,
  SUM(CASE WHEN NOT is_premium THEN 1 ELSE 0 END) as free_count
FROM plot_templates
GROUP BY category
ORDER BY category;
```

### متوسط عدد المراحل

```sql
SELECT
  name,
  category,
  jsonb_array_length(stages) as stage_count
FROM plot_templates
ORDER BY stage_count DESC;
```

### القوالب مع عدد الذروات

```sql
SELECT
  name,
  category,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(stages) AS stage
    WHERE (stage->>'is_climax_stage')::boolean = true
  ) as climax_count
FROM plot_templates
ORDER BY climax_count DESC;
```

---

## ملاحظات مهمة | Important Notes

1. **لا يتم إنشاء مشاهد تلقائياً** - القالب يُستخدم فقط لإنشاء `plot_chapters`
2. **المراحل قابلة للتعديل** - الكاتب يمكنه تعديل أي شيء بعد التطبيق
3. **Premium templates** - التحقق من الصلاحية يتم في الـ frontend/backend
4. **التوتر والسرعة** - القيم من 1 إلى 3 فقط
5. **الذروات** - يمكن أن يكون هناك أكثر من ذروة في القالب الواحد
6. **Immutable** - القوالب لا تتأثر بتعديلات المستخدم على مشاريعه

---

## التوسع المستقبلي | Future Enhancements

**أفكار محتملة:**
- إضافة `locale` للقوالب (ar, en)
- إضافة `tags` للبحث والتصنيف
- إضافة `usage_count` لتتبع الشعبية
- إضافة `author_id` للقوالب المخصصة من المستخدمين
- إضافة `parent_template_id` للقوالب المشتقة
- إضافة `rating` للتقييم من المستخدمين

---

## المراجع | References

- Migration: `070_create_plot_templates_system.sql`
- Related Tables: `plot_projects`, `plot_chapters`, `plot_scenes`
- Security: RLS enabled, admin-only modifications
