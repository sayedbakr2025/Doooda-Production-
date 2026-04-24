# أمثلة استخدام نماذج الحبكات | Plot Templates Usage Examples

## أمثلة Frontend

### 1. عرض قائمة القوالب

```typescript
import { useState, useEffect } from 'react';
import { fetchAllTemplates } from '../utils/plotTemplates';
import type { PlotTemplate } from '../types/plotTemplates';

export function TemplatesList() {
  const [templates, setTemplates] = useState<PlotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const data = await fetchAllTemplates();
        setTemplates(data);
      } catch (err) {
        setError('Failed to load templates');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []);

  if (loading) return <div>Loading templates...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="templates-grid">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  );
}
```

---

### 2. بطاقة قالب واحد

```typescript
import { getCategoryLabel, getStageCount, getClimaxCount } from '../utils/plotTemplates';
import type { PlotTemplate } from '../types/plotTemplates';

interface TemplateCardProps {
  template: PlotTemplate;
  onSelect?: (template: PlotTemplate) => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const stageCount = getStageCount(template);
  const climaxCount = getClimaxCount(template);
  const categoryLabel = getCategoryLabel(template.category, 'ar');

  return (
    <div className="template-card">
      <div className="template-header">
        <h3>{template.name}</h3>
        {template.is_premium && (
          <span className="premium-badge">Premium</span>
        )}
      </div>

      <p className="template-category">{categoryLabel}</p>
      <p className="template-description">{template.description}</p>

      <div className="template-stats">
        <span>{stageCount} مراحل</span>
        <span>{climaxCount} ذروة</span>
      </div>

      <button
        onClick={() => onSelect?.(template)}
        className="select-template-btn"
      >
        استخدم هذا القالب
      </button>
    </div>
  );
}
```

---

### 3. تصفية القوالب

```typescript
import { useState } from 'react';
import { fetchTemplatesByCategory, fetchFreeTemplates } from '../utils/plotTemplates';
import type { PlotTemplate, PlotTemplateCategory } from '../types/plotTemplates';

export function TemplatesFilter() {
  const [templates, setTemplates] = useState<PlotTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PlotTemplateCategory | 'all'>('all');
  const [showOnlyFree, setShowOnlyFree] = useState(false);

  async function handleCategoryChange(category: PlotTemplateCategory | 'all') {
    setSelectedCategory(category);

    if (category === 'all') {
      const data = showOnlyFree
        ? await fetchFreeTemplates()
        : await fetchAllTemplates();
      setTemplates(data);
    } else {
      const data = await fetchTemplatesByCategory(category);
      setTemplates(showOnlyFree ? data.filter(t => !t.is_premium) : data);
    }
  }

  async function handleFreeToggle() {
    const newShowOnlyFree = !showOnlyFree;
    setShowOnlyFree(newShowOnlyFree);

    if (newShowOnlyFree) {
      const data = await fetchFreeTemplates();
      setTemplates(
        selectedCategory === 'all'
          ? data
          : data.filter(t => t.category === selectedCategory)
      );
    } else {
      handleCategoryChange(selectedCategory);
    }
  }

  return (
    <div className="templates-filter">
      <div className="category-buttons">
        <button onClick={() => handleCategoryChange('all')}>
          الكل
        </button>
        <button onClick={() => handleCategoryChange('formal')}>
          الكلاسيكية
        </button>
        <button onClick={() => handleCategoryChange('thematic')}>
          الموضوعية
        </button>
        <button onClick={() => handleCategoryChange('modern')}>
          الحديثة
        </button>
      </div>

      <label className="free-only-toggle">
        <input
          type="checkbox"
          checked={showOnlyFree}
          onChange={handleFreeToggle}
        />
        مجانية فقط
      </label>

      <div className="templates-list">
        {templates.map(template => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  );
}
```

---

### 4. معاينة مراحل القالب

```typescript
import { getTensionLabel, getPaceLabel } from '../utils/plotTemplates';
import type { PlotTemplate } from '../types/plotTemplates';

interface TemplatePreviewProps {
  template: PlotTemplate;
  locale: 'ar' | 'en';
}

export function TemplatePreview({ template, locale }: TemplatePreviewProps) {
  return (
    <div className="template-preview">
      <h2>{template.name}</h2>
      <p>{template.description}</p>

      <div className="stages-list">
        {template.stages.map((stage, index) => (
          <div key={stage.key} className="stage-item">
            <div className="stage-header">
              <span className="stage-number">{index + 1}</span>
              <h4>{stage.label}</h4>
              {stage.is_climax_stage && (
                <span className="climax-badge">⭐ ذروة</span>
              )}
            </div>

            <p className="stage-guidance">{stage.guidance}</p>

            <div className="stage-meta">
              <div className="meta-item">
                <span className="meta-label">التوتر:</span>
                <span className="meta-value">
                  {getTensionLabel(stage.default_tension, locale)}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">السرعة:</span>
                <span className="meta-value">
                  {getPaceLabel(stage.default_pace, locale)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 5. تطبيق قالب على مشروع

```typescript
import { useState } from 'react';
import { applyTemplateToProject } from '../utils/plotTemplates';
import type { PlotTemplate } from '../types/plotTemplates';

interface ApplyTemplateModalProps {
  plotProjectId: string;
  template: PlotTemplate;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ApplyTemplateModal({
  plotProjectId,
  template,
  onSuccess,
  onCancel,
}: ApplyTemplateModalProps) {
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setApplying(true);
    setError(null);

    try {
      await applyTemplateToProject(plotProjectId, template.id);
      onSuccess();
    } catch (err) {
      setError('فشل تطبيق القالب. حاول مرة أخرى.');
      console.error(err);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>تطبيق القالب</h2>

        <p>
          سيتم إنشاء {template.stages.length} فصل من قالب "{template.name}".
        </p>

        <div className="warning-box">
          <p>
            ⚠️ ملاحظة: سيتم إضافة الفصول إلى المشروع الحالي. يمكنك تعديلها أو
            حذفها لاحقاً.
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-actions">
          <button
            onClick={handleApply}
            disabled={applying}
            className="primary-btn"
          >
            {applying ? 'جاري التطبيق...' : 'تطبيق القالب'}
          </button>
          <button onClick={onCancel} disabled={applying} className="cancel-btn">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 6. فحص الصلاحيات للقوالب المدفوعة

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useUserPlan() {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserPlan() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from('users')
            .select('plan')
            .eq('id', user.id)
            .single();

          setPlan(data?.plan || 'free');
        }
      } catch (err) {
        console.error('Error fetching user plan:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserPlan();
  }, []);

  return { plan, loading, isPremium: plan !== 'free' };
}

// الاستخدام
export function TemplateCardWithPermission({ template }: { template: PlotTemplate }) {
  const { isPremium } = useUserPlan();

  const canUse = !template.is_premium || isPremium;

  return (
    <div className="template-card">
      <h3>{template.name}</h3>

      {template.is_premium && !isPremium && (
        <div className="premium-notice">
          <p>🔒 هذا القالب متاح للمشتركين فقط</p>
          <button className="upgrade-btn">ترقية الحساب</button>
        </div>
      )}

      <button
        onClick={() => handleSelectTemplate(template)}
        disabled={!canUse}
        className="select-btn"
      >
        {canUse ? 'استخدم القالب' : 'قالب مدفوع'}
      </button>
    </div>
  );
}
```

---

### 7. معاينة مرئية للحبكة

```typescript
import { getTensionLabel, getPaceLabel } from '../utils/plotTemplates';
import type { PlotTemplate } from '../types/plotTemplates';

export function PlotVisualization({ template }: { template: PlotTemplate }) {
  const maxTension = Math.max(...template.stages.map(s => s.default_tension));

  return (
    <div className="plot-visualization">
      <h3>مخطط الحبكة</h3>

      <div className="plot-chart">
        {template.stages.map((stage, index) => {
          const heightPercent = (stage.default_tension / maxTension) * 100;

          return (
            <div key={stage.key} className="stage-bar-container">
              <div
                className={`stage-bar ${stage.is_climax_stage ? 'climax' : ''}`}
                style={{ height: `${heightPercent}%` }}
                title={stage.label}
              />
              <span className="stage-label">{index + 1}</span>
            </div>
          );
        })}
      </div>

      <div className="legend">
        <div className="legend-item">
          <span className="legend-color normal"></span>
          <span>مرحلة عادية</span>
        </div>
        <div className="legend-item">
          <span className="legend-color climax"></span>
          <span>ذروة</span>
        </div>
      </div>
    </div>
  );
}
```

---

## CSS للعرض

```css
.template-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s;
}

.template-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.premium-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.stage-item {
  background: #f9fafb;
  border-left: 4px solid #3b82f6;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 4px;
}

.stage-item.climax {
  border-left-color: #ef4444;
  background: #fef2f2;
}

.climax-badge {
  background: #fef2f2;
  color: #ef4444;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.plot-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 200px;
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  gap: 8px;
}

.stage-bar {
  flex: 1;
  background: #3b82f6;
  border-radius: 4px 4px 0 0;
  transition: all 0.3s;
  min-height: 20px;
}

.stage-bar.climax {
  background: #ef4444;
}

.stage-bar:hover {
  opacity: 0.8;
  transform: scaleY(1.05);
}
```

---

## ملاحظات مهمة

1. **التحقق من الصلاحيات**: يجب فحص `is_premium` و `user.plan` قبل السماح بالاستخدام
2. **التأكيد قبل التطبيق**: يُفضل عرض modal للتأكيد قبل تطبيق القالب
3. **معالجة الأخطاء**: التعامل مع حالات الفشل بشكل مناسب
4. **التحميل التدريجي**: عرض loading states أثناء جلب البيانات
5. **Accessibility**: استخدام semantic HTML و ARIA labels مناسبة
