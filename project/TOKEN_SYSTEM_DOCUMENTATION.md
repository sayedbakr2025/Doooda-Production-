# نظام التوكنز الجديد - Token System Documentation

## نظرة عامة | Overview

تم تحديث نظام التوكنز ليشمل:
- **Multiplier ثابت = 2** لجميع الخطط
- **حد أدنى للاستهلاك = 50 token**
- **تسجيل كامل** لجميع العمليات في `ai_usage_logs`
- **حماية من الانفجار** باستخدام `max_tokens`
- **فحص مسبق** للرصيد قبل تنفيذ الطلب

---

## الميزات الأساسية | Core Features

### 1. حساب التكلفة | Cost Calculation

```
final_cost = MAX(
  (prompt_tokens + completion_tokens) × 2,
  50
)
```

**أمثلة:**
- طلب صغير: 20 prompt + 30 completion = 50 tokens × 2 = **100 tokens** (الحد الأدنى)
- طلب متوسط: 100 prompt + 150 completion = 250 × 2 = **500 tokens**
- طلب كبير: 500 prompt + 1000 completion = 1500 × 2 = **3000 tokens**

### 2. الفحص المسبق | Pre-flight Check

قبل إرسال الطلب للـ AI، يتم:
1. تقدير عدد التوكنز المتوقعة
2. حساب التكلفة المقدرة مع الـ multiplier
3. التحقق من كفاية الرصيد
4. رفض الطلب إذا كان الرصيد غير كافٍ

```typescript
const estimatedInputTokens = Math.ceil(JSON.stringify(messages).length / 4);
const estimatedOutputTokens = maxTokens; // من إعدادات الخطة
const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;
const estimatedCost = Math.max(
  Math.ceil(estimatedTotalTokens × 2),
  50
);

if (userBalance < estimatedCost) {
  return error("Insufficient tokens");
}
```

### 3. الحماية من الانفجار | Explosion Protection

تم تحديد `max_tokens` لكل خطة:
- **Free Plan**: 600 tokens
- **Pro/Standard Plans**: 1500 tokens

هذا يمنع استهلاك عدد ضخم غير متوقع من التوكنز.

### 4. التسجيل الكامل | Complete Logging

كل طلب يتم تسجيله في `ai_usage_logs`:

```sql
CREATE TABLE ai_usage_logs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  feature text NOT NULL,  -- 'ask_doooda', 'analyze_plot', etc.
  provider text NOT NULL, -- 'deepseek', 'openai', etc.
  model text,
  prompt_tokens integer NOT NULL,
  completion_tokens integer NOT NULL,
  total_tokens integer NOT NULL,
  multiplier numeric NOT NULL DEFAULT 2.0,
  final_cost integer NOT NULL,
  status text NOT NULL,   -- 'success', 'error', 'insufficient_tokens'
  error_message text,
  request_metadata jsonb,
  response_metadata jsonb,
  created_at timestamptz NOT NULL
);
```

---

## الدالة الأساسية | Core Function

### `log_and_deduct_tokens`

دالة PostgreSQL atomic تقوم بـ:
1. حساب التكلفة النهائية
2. التحقق من الرصيد
3. خصم التوكنز
4. تسجيل العملية
5. إرجاع النتيجة

#### الاستخدام | Usage

```typescript
const { data: result, error } = await supabase.rpc(
  "log_and_deduct_tokens",
  {
    p_user_id: user.id,
    p_feature: "ask_doooda",
    p_provider: "deepseek",
    p_model: "deepseek-chat",
    p_prompt_tokens: 150,
    p_completion_tokens: 200,
    p_multiplier: 2.0,
    p_request_metadata: {
      language: "ar",
      mode: "explain",
    },
    p_response_metadata: {
      max_tokens: 600,
    },
  }
);

if (!result.success) {
  // رصيد غير كافٍ
  console.log("Required:", result.required);
  console.log("Available:", result.available);
  return;
}

// نجح الخصم
console.log("Tokens deducted:", result.tokens_deducted);
console.log("Tokens remaining:", result.tokens_remaining);
```

#### الاستجابة | Response

**نجاح:**
```json
{
  "success": true,
  "log_id": "uuid",
  "tokens_deducted": 700,
  "tokens_remaining": 300,
  "prompt_tokens": 150,
  "completion_tokens": 200,
  "total_tokens": 350,
  "multiplier": 2.0
}
```

**فشل (رصيد غير كافٍ):**
```json
{
  "success": false,
  "error": "insufficient_tokens",
  "required": 700,
  "available": 300
}
```

---

## أمثلة الاستخدام | Usage Examples

### مثال 1: Ask Doooda

```typescript
// في Edge Function: ask-doooda

// 1. الفحص المسبق
const estimatedCost = calculateEstimatedCost(messages);
if (userBalance < estimatedCost) {
  return error402("Insufficient balance");
}

// 2. استدعاء AI
const aiResponse = await callDeepSeek(messages, { max_tokens: 600 });

// 3. تسجيل وخصم
const { data: result } = await supabase.rpc("log_and_deduct_tokens", {
  p_user_id: user.id,
  p_feature: "ask_doooda",
  p_provider: "deepseek",
  p_model: "deepseek-chat",
  p_prompt_tokens: aiResponse.usage.prompt_tokens,
  p_completion_tokens: aiResponse.usage.completion_tokens,
  p_multiplier: 2.0,
  p_request_metadata: { language: "ar", mode: "explain" },
  p_response_metadata: { max_tokens: 600 },
});

// 4. إرجاع النتيجة
return {
  reply: aiResponse.message,
  tokens_used: result.tokens_deducted,
  tokens_remaining: result.tokens_remaining,
};
```

### مثال 2: Analyze Plot

```typescript
// في Edge Function: analyze-plot

// 1. الفحص المسبق
const estimatedInputTokens = Math.ceil(
  JSON.stringify({ chapters, scenes }).length / 4
);
const estimatedCost = Math.max(
  (estimatedInputTokens + 4000) * 2,
  50
);

if (userBalance < estimatedCost) {
  return error402("Insufficient balance", {
    required: estimatedCost,
    available: userBalance,
  });
}

// 2. استدعاء OpenAI
const analysis = await callOpenAI(chapters, scenes, {
  max_tokens: 4000,
});

// 3. تسجيل وخصم
const { data: result } = await supabase.rpc("log_and_deduct_tokens", {
  p_user_id: user.id,
  p_feature: "analyze_plot",
  p_provider: "openai",
  p_model: "gpt-4o-mini",
  p_prompt_tokens: analysis.usage.prompt_tokens,
  p_completion_tokens: analysis.usage.completion_tokens,
  p_multiplier: 2.0,
  p_request_metadata: {
    plot_project_id,
    chapters_count: chapters.length,
    scenes_count: scenes.length,
  },
  p_response_metadata: {
    quality_score: analysis.overall_quality,
  },
});

// 4. إرجاع النتيجة
return {
  analysis: analysis,
  tokens_used: result.tokens_deducted,
  tokens_remaining: result.tokens_remaining,
};
```

---

## الاستعلامات المفيدة | Useful Queries

### 1. استهلاك المستخدم لآخر 30 يوم

```sql
SELECT
  DATE(created_at) as date,
  feature,
  COUNT(*) as request_count,
  SUM(final_cost) as total_cost,
  AVG(final_cost) as avg_cost,
  SUM(prompt_tokens) as total_prompt_tokens,
  SUM(completion_tokens) as total_completion_tokens
FROM ai_usage_logs
WHERE user_id = 'user-uuid'
  AND created_at >= NOW() - INTERVAL '30 days'
  AND status = 'success'
GROUP BY DATE(created_at), feature
ORDER BY date DESC, feature;
```

### 2. أكثر الميزات استخداماً

```sql
SELECT
  feature,
  COUNT(*) as requests,
  SUM(final_cost) as total_tokens,
  AVG(final_cost) as avg_tokens_per_request
FROM ai_usage_logs
WHERE status = 'success'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY feature
ORDER BY total_tokens DESC;
```

### 3. معدل النجاح والفشل

```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### 4. المستخدمون الأكثر استهلاكاً

```sql
SELECT
  u.email,
  u.plan,
  u.tokens_balance,
  COUNT(al.id) as requests,
  SUM(al.final_cost) as total_tokens_used
FROM users u
JOIN ai_usage_logs al ON al.user_id = u.id
WHERE al.created_at >= NOW() - INTERVAL '7 days'
  AND al.status = 'success'
GROUP BY u.id, u.email, u.plan, u.tokens_balance
ORDER BY total_tokens_used DESC
LIMIT 10;
```

---

## الأمان | Security

### 1. RLS Policies

```sql
-- المستخدمون يمكنهم قراءة سجلاتهم فقط
CREATE POLICY "Users can view own usage logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- الأدمن يمكنهم قراءة كل السجلات
CREATE POLICY "Admins can view all usage logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

### 2. الدالة محمية

```sql
-- SECURITY DEFINER = تتجاوز RLS لكن مع فحص يدوي
CREATE FUNCTION log_and_deduct_tokens(...)
SECURITY DEFINER
AS $$
BEGIN
  -- الدالة تتحقق من user_id يدوياً
  -- لا يمكن استدعاؤها إلا من Edge Functions مع service role
END;
$$;
```

---

## الصيانة | Maintenance

### أرشفة السجلات القديمة

يُنصح بأرشفة السجلات بعد 90 يوماً:

```sql
-- إنشاء جدول أرشيف
CREATE TABLE ai_usage_logs_archive (
  LIKE ai_usage_logs INCLUDING ALL
);

-- نقل السجلات القديمة
INSERT INTO ai_usage_logs_archive
SELECT * FROM ai_usage_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- حذف من الجدول الأساسي
DELETE FROM ai_usage_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## ملاحظات مهمة | Important Notes

1. **Multiplier ثابت = 2** لجميع الخطط حالياً
2. **الحد الأدنى 50 token** يضمن عدم استهلاك صفر tokens
3. **الفحص المسبق** يمنع فشل الطلبات بسبب رصيد غير كافٍ
4. **max_tokens** يحمي من الاستهلاك الضخم غير المتوقع
5. **الخصم بعد النجاح فقط** - لا يتم الخصم في حالة الفشل
6. **التسجيل الكامل** يوفر audit trail لجميع العمليات

---

## المراجع | References

- Migration: `068_create_ai_usage_logs_table.sql`
- Migration: `069_create_log_and_deduct_tokens_function.sql`
- Edge Function: `supabase/functions/ask-doooda/index.ts`
- Edge Function: `supabase/functions/analyze-plot/index.ts`
