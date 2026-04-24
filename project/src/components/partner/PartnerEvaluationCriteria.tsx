import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { InstitutionalAccount } from '../../contexts/InstitutionAuthContext';

interface Criterion {
  id: string;
  name: string;
  description: string;
  weight: number;
}

interface Props {
  institution: InstitutionalAccount;
  competitionId?: string;
}

const INSTITUTION_AUTH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/institution-auth`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callInstitutionAuth(body: Record<string, any>) {
  const res = await fetch(INSTITUTION_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function PartnerEvaluationCriteria({ institution, competitionId }: Props) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({ name: '', description: '', weight: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCriteria();
  }, [institution.id, competitionId]);

  async function loadCriteria() {
    setLoading(true);
    const result = await callInstitutionAuth({
      action: 'list_criteria',
      institution_id: institution.id,
      competition_id: competitionId || null,
    });
    setCriteria(result.criteria || []);
    setLoading(false);
  }

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  async function handleAdd() {
    setError('');
    const w = parseInt(newForm.weight);
    if (!newForm.name || isNaN(w) || w <= 0) {
      setError(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    if (totalWeight + w > 100) {
      setError(isRTL ? `مجموع الأوزان يتجاوز 100%. المتاح: ${100 - totalWeight}%` : `Total weights exceed 100%. Available: ${100 - totalWeight}%`);
      return;
    }
    setSaving(true);
    const result = await callInstitutionAuth({
      action: 'add_criterion',
      institution_id: institution.id,
      competition_id: competitionId || null,
      name: newForm.name,
      description: newForm.description,
      weight: w,
    });
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    setNewForm({ name: '', description: '', weight: '' });
    setShowAdd(false);
    loadCriteria();
  }

  async function handleDelete(id: string) {
    await callInstitutionAuth({
      action: 'delete_criterion',
      id,
      institution_id: institution.id,
    });
    loadCriteria();
  }

  async function handleUpdateWeight(id: string, weight: number) {
    await callInstitutionAuth({
      action: 'update_criterion',
      id,
      institution_id: institution.id,
      weight,
    });
    loadCriteria();
    setEditingId(null);
  }

  const inputStyle = {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="max-w-xl" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'شرائح التقييم' : 'Evaluation Criteria'}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: totalWeight === 100 ? '#16a34a' : totalWeight > 100 ? '#ef4444' : 'var(--color-text-tertiary)' }}>
            {isRTL ? `المجموع: ${totalWeight}%` : `Total: ${totalWeight}%`}
            {totalWeight !== 100 && totalWeight > 0 && (
              <span style={{ marginInlineStart: '0.5rem', color: '#ca8a04' }}>
                {isRTL ? `(يجب أن يساوي 100%)` : `(must equal 100%)`}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
        >
          + {isRTL ? 'إضافة معيار' : 'Add Criterion'}
        </button>
      </div>

      {totalWeight === 100 && criteria.length > 0 && (
        <div
          className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2"
          style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-xs font-semibold" style={{ color: '#16a34a' }}>
            {isRTL ? 'شرائح التقييم مكتملة — مجموع الأوزان 100%' : 'Evaluation criteria complete — total weights 100%'}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {criteria.map(c => (
          <div
            key={c.id}
            className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{c.name}</p>
              {c.description && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{c.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {editingId === c.id ? (
                <input
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={c.weight}
                  className="w-16 px-2 py-1 rounded-lg text-xs text-center outline-none"
                  style={inputStyle}
                  onBlur={e => handleUpdateWeight(c.id, parseInt(e.target.value) || c.weight)}
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setEditingId(c.id)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
                >
                  {c.weight}%
                </button>
              )}
              <button
                onClick={() => handleDelete(c.id)}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-error)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {criteria.length === 0 && !showAdd && (
        <div
          className="rounded-xl px-4 py-8 text-center"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL ? 'لا توجد شرائح تقييم بعد' : 'No evaluation criteria yet'}
          </p>
        </div>
      )}

      {showAdd && (
        <div
          className="mt-4 rounded-xl p-4 space-y-3"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'إضافة معيار جديد' : 'Add New Criterion'}
          </h3>
          <input
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={inputStyle}
            placeholder={isRTL ? 'اسم المعيار (مثال: الأصالة)' : 'Criterion name (e.g., Originality)'}
            value={newForm.name}
            onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))}
          />
          <input
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={inputStyle}
            placeholder={isRTL ? 'وصف المعيار (اختياري)' : 'Description (optional)'}
            value={newForm.description}
            onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              className="w-24 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
              placeholder="%"
              value={newForm.weight}
              onChange={e => setNewForm(p => ({ ...p, weight: e.target.value }))}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? `المتاح: ${100 - totalWeight}%` : `Available: ${100 - totalWeight}%`}
            </span>
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAdd(false); setError(''); }}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            >
              {saving ? '...' : (isRTL ? 'إضافة' : 'Add')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
