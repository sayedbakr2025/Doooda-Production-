import { useState, useEffect } from 'react';
import type { Project } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  EMPTY_METADATA,
  getDefaultCategories,
  suggestKeywords,
  generateAiDescription,
  loadKdpMetadataFromDb,
  saveKdpMetadataToDb,
  validateKdpMetadata,
  type KdpMetadata,
  type KdpContributor,
  type KdpMetadataValidationIssue,
} from './kdpMetadataGenerator';

interface Props {
  project: Project;
  onClose: () => void;
}

type Tab = 'metadata' | 'print' | 'kindle' | 'validation';

const TRIM_SIZES = [
  { value: '5x8', label: '5" × 8"' },
  { value: '5.5x8.5', label: '5.5" × 8.5"' },
  { value: '6x9', label: '6" × 9" (Standard)' },
  { value: '6.14x9.21', label: '6.14" × 9.21"' },
  { value: '7x10', label: '7" × 10"' },
  { value: '8.5x11', label: '8.5" × 11"' },
];

const LANGUAGES = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'tr', label: 'Türkçe' },
];

const CONTRIBUTOR_ROLES_EN = ['Co-Author', 'Editor', 'Illustrator', 'Translator', 'Foreword', 'Introduction', 'Afterword'];
const CONTRIBUTOR_ROLES_AR = ['مؤلف مشارك', 'محرر', 'رسام', 'مترجم', 'مقدمة', 'توطئة', 'خاتمة'];

export default function KdpSettingsModal({ project, onClose }: Props) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  const [tab, setTab] = useState<Tab>('metadata');
  const [meta, setMeta] = useState<KdpMetadata>({ ...EMPTY_METADATA, title: project.title });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newContributorName, setNewContributorName] = useState('');
  const [newContributorRole, setNewContributorRole] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const saved = await loadKdpMetadataFromDb(project.id);
        if (saved) {
          setMeta(saved);
        } else {
          const lang = language === 'ar' ? 'ar' : 'en';
          const defaultCategories = getDefaultCategories(project.project_type, lang);
          const defaultKeywords = suggestKeywords(project.title, project.project_type, lang);
          setMeta((m) => ({
            ...m,
            title: project.title,
            categories: defaultCategories,
            keywords: defaultKeywords,
          }));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [project.id]);

  const issues = validateKdpMetadata(meta);
  const errors = issues.filter((i) => i.severity === 'error');

  function field(key: keyof KdpMetadata, value: string | boolean) {
    setMeta((m) => ({ ...m, [key]: value }));
  }

  function addKeyword() {
    const kw = newKeyword.trim();
    if (!kw || meta.keywords.length >= 7) return;
    setMeta((m) => ({ ...m, keywords: [...m.keywords, kw] }));
    setNewKeyword('');
  }

  function removeKeyword(i: number) {
    setMeta((m) => ({ ...m, keywords: m.keywords.filter((_, idx) => idx !== i) }));
  }

  function addCategory() {
    const cat = newCategory.trim();
    if (!cat || meta.categories.length >= 10) return;
    setMeta((m) => ({ ...m, categories: [...m.categories, cat] }));
    setNewCategory('');
  }

  function removeCategory(i: number) {
    setMeta((m) => ({ ...m, categories: m.categories.filter((_, idx) => idx !== i) }));
  }

  function addContributor() {
    const name = newContributorName.trim();
    const role = newContributorRole.trim();
    if (!name || !role) return;
    const c: KdpContributor = { name, role };
    setMeta((m) => ({ ...m, contributors: [...m.contributors, c] }));
    setNewContributorName('');
    setNewContributorRole('');
  }

  function removeContributor(i: number) {
    setMeta((m) => ({ ...m, contributors: m.contributors.filter((_, idx) => idx !== i) }));
  }

  async function handleGenerateDescription() {
    setAiLoading(true);
    setAiError('');
    try {
      const lang = language === 'ar' ? 'ar' : 'en';
      const desc = await generateAiDescription(project.title, project.idea, project.project_type, lang);
      setMeta((m) => ({ ...m, description: desc }));
    } catch (e: any) {
      setAiError(e.message || 'Failed');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      await saveKdpMetadataToDb(project.id, meta);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setSaveError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: Tab; labelEn: string; labelAr: string; badge?: number }[] = [
    { id: 'metadata', labelEn: 'Metadata', labelAr: 'البيانات' },
    { id: 'print', labelEn: 'Print', labelAr: 'الطباعة' },
    { id: 'kindle', labelEn: 'Kindle', labelAr: 'Kindle' },
    { id: 'validation', labelEn: 'Validation', labelAr: 'التحقق', badge: errors.length || undefined },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        dir={ar ? 'rtl' : 'ltr'}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-extrabold"
              style={{ backgroundColor: '#FF9900', color: '#fff' }}
            >
              K
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {ar ? 'إعدادات KDP' : 'KDP Settings'}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {project.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/10"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          className="flex gap-1 px-6 pt-4 pb-0 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="relative px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5"
              style={{
                color: tab === t.id ? '#FF9900' : 'var(--color-text-tertiary)',
                borderBottom: tab === t.id ? '2px solid #FF9900' : '2px solid transparent',
                backgroundColor: 'transparent',
              }}
            >
              {ar ? t.labelAr : t.labelEn}
              {t.badge ? (
                <span
                  className="w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px' }}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#FF9900', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <>
              {tab === 'metadata' && (
                <TabMetadata
                  ar={ar}
                  meta={meta}
                  field={field}
                  newKeyword={newKeyword}
                  setNewKeyword={setNewKeyword}
                  addKeyword={addKeyword}
                  removeKeyword={removeKeyword}
                  newCategory={newCategory}
                  setNewCategory={setNewCategory}
                  addCategory={addCategory}
                  removeCategory={removeCategory}
                  newContributorName={newContributorName}
                  setNewContributorName={setNewContributorName}
                  newContributorRole={newContributorRole}
                  setNewContributorRole={setNewContributorRole}
                  addContributor={addContributor}
                  removeContributor={removeContributor}
                  aiLoading={aiLoading}
                  aiError={aiError}
                  onGenerateDescription={handleGenerateDescription}
                />
              )}
              {tab === 'print' && (
                <TabPrint ar={ar} meta={meta} field={field} />
              )}
              {tab === 'kindle' && (
                <TabKindle ar={ar} meta={meta} field={field} />
              )}
              {tab === 'validation' && (
                <TabValidation ar={ar} issues={issues} />
              )}
            </>
          )}
        </div>

        <div
          className="px-6 py-4 flex items-center gap-3 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {saveError && (
            <p className="text-xs flex-1" style={{ color: '#ef4444' }}>{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-xs flex-1" style={{ color: '#22c55e' }}>
              {ar ? 'تم الحفظ!' : 'Saved!'}
            </p>
          )}
          {!saveError && !saveSuccess && <div className="flex-1" />}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            {ar ? 'إغلاق' : 'Close'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: '#FF9900', color: '#fff' }}
          >
            {saving ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : (ar ? 'حفظ' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wider mt-5 mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
      {label}
    </p>
  );
}

function TabMetadata({
  ar, meta, field,
  newKeyword, setNewKeyword, addKeyword, removeKeyword,
  newCategory, setNewCategory, addCategory, removeCategory,
  newContributorName, setNewContributorName,
  newContributorRole, setNewContributorRole,
  addContributor, removeContributor,
  aiLoading, aiError, onGenerateDescription,
}: {
  ar: boolean;
  meta: KdpMetadata;
  field: (k: keyof KdpMetadata, v: string | boolean) => void;
  newKeyword: string; setNewKeyword: (v: string) => void;
  addKeyword: () => void; removeKeyword: (i: number) => void;
  newCategory: string; setNewCategory: (v: string) => void;
  addCategory: () => void; removeCategory: (i: number) => void;
  newContributorName: string; setNewContributorName: (v: string) => void;
  newContributorRole: string; setNewContributorRole: (v: string) => void;
  addContributor: () => void; removeContributor: (i: number) => void;
  aiLoading: boolean; aiError: string; onGenerateDescription: () => void;
}) {
  const descWordCount = meta.description.trim().split(/\s+/).filter(Boolean).length;
  const roles = ar ? CONTRIBUTOR_ROLES_AR : CONTRIBUTOR_ROLES_EN;

  return (
    <div className="space-y-4">
      <SectionTitle label={ar ? 'معلومات الكتاب الأساسية' : 'Book Information'} />

      <div className="grid grid-cols-2 gap-3">
        <FormRow label={ar ? 'العنوان *' : 'Title *'}>
          <input
            className="input-field w-full text-sm"
            value={meta.title}
            onChange={(e) => field('title', e.target.value)}
            placeholder={ar ? 'عنوان الكتاب' : 'Book title'}
          />
        </FormRow>
        <FormRow label={ar ? 'العنوان الفرعي' : 'Subtitle'}>
          <input
            className="input-field w-full text-sm"
            value={meta.subtitle}
            onChange={(e) => field('subtitle', e.target.value)}
            placeholder={ar ? 'عنوان فرعي اختياري' : 'Optional subtitle'}
          />
        </FormRow>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormRow label={ar ? 'اسم المؤلف *' : 'Author Name *'}>
          <input
            className="input-field w-full text-sm"
            value={meta.authorName}
            onChange={(e) => field('authorName', e.target.value)}
            placeholder={ar ? 'الاسم كما سيظهر' : 'Name as it will appear'}
          />
        </FormRow>
        <FormRow label={ar ? 'اللغة' : 'Language'}>
          <select
            className="input-field w-full text-sm"
            value={meta.language}
            onChange={(e) => field('language', e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </FormRow>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormRow label={ar ? 'اسم السلسلة' : 'Series Name'}>
          <input
            className="input-field w-full text-sm"
            value={meta.seriesName}
            onChange={(e) => field('seriesName', e.target.value)}
            placeholder={ar ? 'إذا كان الكتاب ضمن سلسلة' : 'If part of a series'}
          />
        </FormRow>
        <FormRow label={ar ? 'رقم الإصدار' : 'Edition Number'}>
          <input
            className="input-field w-full text-sm"
            value={meta.editionNumber}
            onChange={(e) => field('editionNumber', e.target.value)}
            placeholder={ar ? 'مثل: الأول، 1st' : 'e.g. 1st, 2nd'}
          />
        </FormRow>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormRow label={ar ? 'ISBN' : 'ISBN'}>
          <input
            className="input-field w-full text-sm"
            value={meta.isbn}
            onChange={(e) => field('isbn', e.target.value)}
            placeholder="978-..."
          />
        </FormRow>
        <FormRow label={ar ? 'تاريخ النشر' : 'Publication Date'}>
          <input
            type="date"
            className="input-field w-full text-sm"
            value={meta.publicationDate}
            onChange={(e) => field('publicationDate', e.target.value)}
          />
        </FormRow>
      </div>

      <SectionTitle label={ar ? 'المساهمون' : 'Contributors'} />

      {meta.contributors.length > 0 && (
        <div className="space-y-1.5">
          {meta.contributors.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border-light)' }}
            >
              <span className="text-sm flex-1" style={{ color: 'var(--color-text-primary)' }}>
                {c.name}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,153,0,0.1)', color: '#FF9900' }}>
                {c.role}
              </span>
              <button onClick={() => removeContributor(i)} style={{ color: 'var(--color-text-tertiary)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="input-field flex-1 text-sm"
          value={newContributorName}
          onChange={(e) => setNewContributorName(e.target.value)}
          placeholder={ar ? 'الاسم' : 'Name'}
          onKeyDown={(e) => e.key === 'Enter' && addContributor()}
        />
        <select
          className="input-field text-sm"
          value={newContributorRole}
          onChange={(e) => setNewContributorRole(e.target.value)}
          style={{ minWidth: '130px' }}
        >
          <option value="">{ar ? 'الدور' : 'Role'}</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={addContributor}
          className="px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'rgba(255,153,0,0.15)', color: '#FF9900' }}
        >
          {ar ? 'أضف' : 'Add'}
        </button>
      </div>

      <SectionTitle label={ar ? 'الوصف التسويقي *' : 'Marketing Description *'} />

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs" style={{ color: descWordCount >= 150 ? '#22c55e' : 'var(--color-text-tertiary)' }}>
            {ar ? `${descWordCount} كلمة` : `${descWordCount} words`}
            {descWordCount < 150 && (ar ? ` (مطلوب 150+)` : ` (150+ required)`)}
          </span>
          <button
            onClick={onGenerateDescription}
            disabled={aiLoading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: 'rgba(255,153,0,0.12)', color: '#FF9900' }}
          >
            {aiLoading ? (
              <>
                <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: '#FF9900', borderTopColor: 'transparent' }} />
                {ar ? 'جارٍ التوليد...' : 'Generating...'}
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {ar ? 'توليد بالذكاء الاصطناعي' : 'Generate with AI'}
              </>
            )}
          </button>
        </div>
        <textarea
          className="input-field w-full text-sm"
          rows={6}
          value={meta.description}
          onChange={(e) => field('description', e.target.value)}
          placeholder={ar ? 'وصف تسويقي جذاب للقراء... (150 كلمة على الأقل)' : 'Compelling marketing description... (min 150 words)'}
          style={{ resize: 'vertical' }}
        />
        {aiError && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{aiError}</p>}
      </div>

      <SectionTitle label={ar ? 'الكلمات المفتاحية (7 مطلوبة)' : 'Keywords (7 required)'} />

      <div className="flex flex-wrap gap-1.5 min-h-8">
        {meta.keywords.map((kw, i) => (
          <span
            key={i}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,153,0,0.1)', color: '#FF9900', border: '1px solid rgba(255,153,0,0.25)' }}
          >
            {kw}
            <button onClick={() => removeKeyword(i)} className="opacity-60 hover:opacity-100">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        {meta.keywords.length < 7 && (
          <span className="text-xs px-2 py-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {meta.keywords.length}/7
          </span>
        )}
      </div>

      {meta.keywords.length < 7 && (
        <div className="flex gap-2">
          <input
            className="input-field flex-1 text-sm"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder={ar ? 'كلمة مفتاحية جديدة...' : 'New keyword...'}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
          />
          <button
            onClick={addKeyword}
            className="px-3 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'rgba(255,153,0,0.15)', color: '#FF9900' }}
          >
            {ar ? 'أضف' : 'Add'}
          </button>
        </div>
      )}

      <SectionTitle label={ar ? 'التصنيفات (2 على الأقل)' : 'Categories (min 2)'} />

      <div className="space-y-1.5">
        {meta.categories.map((cat, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border-light)' }}
          >
            <span className="text-sm flex-1" style={{ color: 'var(--color-text-primary)' }}>{cat}</span>
            <button onClick={() => removeCategory(i)} style={{ color: 'var(--color-text-tertiary)' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="input-field flex-1 text-sm"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder={ar ? 'مثل: روايات، Fiction > Literary' : 'e.g. Fiction > Literary'}
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
        />
        <button
          onClick={addCategory}
          className="px-3 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'rgba(255,153,0,0.15)', color: '#FF9900' }}
        >
          {ar ? 'أضف' : 'Add'}
        </button>
      </div>
    </div>
  );
}

function TabPrint({
  ar, meta, field,
}: {
  ar: boolean;
  meta: KdpMetadata;
  field: (k: keyof KdpMetadata, v: string | boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle label={ar ? 'إعدادات الطباعة' : 'Print Settings'} />

      <FormRow label={ar ? 'حجم الطباعة *' : 'Trim Size *'}>
        <select
          className="input-field w-full text-sm"
          value={meta.trimSize}
          onChange={(e) => field('trimSize', e.target.value)}
        >
          <option value="">{ar ? 'اختر حجم الطباعة' : 'Select trim size'}</option>
          {TRIM_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </FormRow>

      <FormRow label={ar ? 'نوع المحتوى الداخلي' : 'Interior Type'}>
        <div className="flex gap-3">
          {[
            { value: 'black_white', labelEn: 'Black & White', labelAr: 'أبيض وأسود' },
            { value: 'premium_color', labelEn: 'Premium Color', labelAr: 'ألوان فاخرة' },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 cursor-pointer flex-1 px-4 py-3 rounded-xl"
              style={{
                border: `1px solid ${meta.interiorType === opt.value ? '#FF9900' : 'var(--color-border)'}`,
                backgroundColor: meta.interiorType === opt.value ? 'rgba(255,153,0,0.08)' : 'var(--color-muted)',
              }}
            >
              <input
                type="radio"
                name="interiorType"
                value={opt.value}
                checked={meta.interiorType === opt.value}
                onChange={() => field('interiorType', opt.value)}
                className="sr-only"
              />
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: meta.interiorType === opt.value ? '#FF9900' : 'var(--color-border)' }}
              >
                {meta.interiorType === opt.value && (
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF9900' }} />
                )}
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {ar ? opt.labelAr : opt.labelEn}
              </span>
            </label>
          ))}
        </div>
      </FormRow>

      <label className="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
        <div
          className="relative w-10 h-5 rounded-full transition-colors"
          style={{ backgroundColor: meta.bleedEnabled ? '#FF9900' : 'var(--color-border)' }}
        >
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
            style={{ transform: meta.bleedEnabled ? (ar ? 'translateX(-24px)' : 'translateX(20px)') : 'translateX(2px)' }}
          />
        </div>
        <input type="checkbox" checked={meta.bleedEnabled} onChange={(e) => field('bleedEnabled', e.target.checked)} className="sr-only" />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {ar ? 'تفعيل Bleed' : 'Enable Bleed'}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {ar ? 'للكتب التي تحتوي على صور تمتد للحافة' : 'For books with images extending to the edge'}
          </p>
        </div>
      </label>

      <div
        className="rounded-xl px-4 py-3 text-xs space-y-2"
        style={{ backgroundColor: 'rgba(255,153,0,0.06)', border: '1px solid rgba(255,153,0,0.2)' }}
      >
        <p className="font-semibold" style={{ color: '#FF9900' }}>{ar ? 'ملاحظات' : 'Notes'}</p>
        {(ar ? [
          'الحجم 6×9 هو الأكثر شيوعًا للروايات والكتب الأدبية',
          'الطباعة الملونة أغلى وتقلل الربح لكل نسخة',
          'تأكد من تطابق حجم الملف المُصدَّر مع الحجم المختار هنا',
        ] : [
          '6×9 is the most common size for novels and literary books',
          'Color printing is more expensive and reduces profit per copy',
          'Ensure exported file dimensions match the selected trim size',
        ]).map((tip, i) => (
          <div key={i} className="flex items-start gap-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
            <span style={{ color: '#FF9900' }}>·</span>
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabKindle({
  ar, meta, field,
}: {
  ar: boolean;
  meta: KdpMetadata;
  field: (k: keyof KdpMetadata, v: string | boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle label={ar ? 'إعدادات Kindle eBook' : 'Kindle eBook Settings'} />

      <FormRow label={ar ? 'اللغة الرئيسية' : 'Primary Language'}>
        <select
          className="input-field w-full text-sm"
          value={meta.language}
          onChange={(e) => field('language', e.target.value)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </FormRow>

      <div
        className="rounded-xl px-4 py-4 space-y-3"
        style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border-light)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {ar ? 'متطلبات ملف Kindle' : 'Kindle File Requirements'}
        </p>
        {(ar ? [
          { label: 'الصيغ المقبولة', value: 'EPUB, DOCX, HTML, XHTML' },
          { label: 'الحد الأقصى للحجم', value: '650 MB' },
          { label: 'الصور', value: 'JPEG أو GIF، لا تقل عن 72 dpi' },
          { label: 'الغلاف', value: '2,560 × 1,600 بكسل على الأقل (نسبة 1.6:1)' },
        ] : [
          { label: 'Accepted formats', value: 'EPUB, DOCX, HTML, XHTML' },
          { label: 'Max file size', value: '650 MB' },
          { label: 'Images', value: 'JPEG or GIF, min 72 dpi' },
          { label: 'Cover image', value: 'Min 2,560 × 1,600 px (1.6:1 ratio)' },
        ]).map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-xs font-medium w-32 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{item.value}</span>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl px-4 py-3 text-xs space-y-2"
        style={{ backgroundColor: 'rgba(255,153,0,0.06)', border: '1px solid rgba(255,153,0,0.2)' }}
      >
        <p className="font-semibold" style={{ color: '#FF9900' }}>{ar ? 'نصائح Kindle' : 'Kindle Tips'}</p>
        {(ar ? [
          'استخدم Kindle Previewer للتحقق من شكل الكتاب قبل الرفع',
          'تجنب الجداول المعقدة والتنسيقات الثابتة',
          'أضف جدول المحتويات بالروابط (TOC) لتجربة أفضل',
        ] : [
          'Use Kindle Previewer to check book appearance before uploading',
          'Avoid complex tables and fixed-layout formatting',
          'Add a linked Table of Contents (TOC) for better reading experience',
        ]).map((tip, i) => (
          <div key={i} className="flex items-start gap-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
            <span style={{ color: '#FF9900' }}>·</span>
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabValidation({ ar, issues }: { ar: boolean; issues: KdpMetadataValidationIssue[] }) {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const passed = issues.length === 0;

  return (
    <div className="space-y-4">
      <SectionTitle label={ar ? 'نتائج التحقق' : 'Validation Results'} />

      {passed && (
        <div
          className="rounded-xl px-4 py-4 flex items-center gap-3"
          style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#22c55e' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
            {ar ? 'جميع المتطلبات مكتملة!' : 'All requirements met!'}
          </p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#ef4444' }}>
            {ar ? `أخطاء (${errors.length})` : `Errors (${errors.length})`}
          </p>
          {errors.map((issue, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#ef4444' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm" style={{ color: '#ef4444' }}>
                {ar ? issue.messageAr : issue.messageEn}
              </p>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#f59e0b' }}>
            {ar ? `تحذيرات (${warnings.length})` : `Warnings (${warnings.length})`}
          </p>
          {warnings.map((issue, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm" style={{ color: '#f59e0b' }}>
                {ar ? issue.messageAr : issue.messageEn}
              </p>
            </div>
          ))}
        </div>
      )}

      <div
        className="rounded-xl px-4 py-3 text-xs space-y-1.5"
        style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border-light)' }}
      >
        <p className="font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          {ar ? 'قائمة المتطلبات' : 'Requirements Checklist'}
        </p>
        {[
          { field: 'title', labelEn: 'Title not empty', labelAr: 'العنوان غير فارغ' },
          { field: 'description', labelEn: 'Description ≥ 150 words', labelAr: 'الوصف 150 كلمة أو أكثر' },
          { field: 'keywords', labelEn: '7 keywords', labelAr: '7 كلمات مفتاحية' },
          { field: 'categories', labelEn: 'At least 2 categories', labelAr: 'تصنيفان على الأقل' },
          { field: 'trimSize', labelEn: 'Trim size set (for print)', labelAr: 'حجم الطباعة محدد (للنسخة الورقية)' },
        ].map((req) => {
          const hasError = issues.some((i) => i.field === req.field && i.severity === 'error');
          const hasWarning = issues.some((i) => i.field === req.field && i.severity === 'warning');
          const ok = !hasError && !hasWarning;
          return (
            <div key={req.field} className="flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: ok ? '#22c55e' : hasError ? '#ef4444' : '#f59e0b' }}
              >
                {ok ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                )}
              </svg>
              <span style={{ color: ok ? 'var(--color-text-secondary)' : hasError ? '#ef4444' : '#f59e0b' }}>
                {ar ? req.labelAr : req.labelEn}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
