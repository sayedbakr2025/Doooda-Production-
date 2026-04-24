import { useEffect, useState } from 'react';
import { supabase } from '../../../services/api';
import Button from '../../Button';

interface PlanLimit {
  id: string;
  limit_type: string;
  plan_name: string | null;
  daily_limit: number | null;
  monthly_limit: number | null;
  questions_per_session: number | null;
  model_override: string | null;
  is_unlimited: boolean;
  is_active: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  STANDARD: 'Standard',
  PRO: 'Pro',
};

export default function DooodaPlanLimits() {
  const [limits, setLimits] = useState<PlanLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlanLimit | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLimits();
  }, []);

  async function loadLimits() {
    try {
      const { data, error } = await supabase
        .from('ai_usage_limits')
        .select('id, limit_type, plan_name, daily_limit, monthly_limit, questions_per_session, model_override, is_unlimited, is_active')
        .in('limit_type', ['plan_based', 'global_default'])
        .order('plan_name', { ascending: true });
      if (error) throw error;
      setLimits(data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editing || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_usage_limits')
        .update({
          daily_limit: editing.is_unlimited ? null : editing.daily_limit,
          monthly_limit: editing.is_unlimited ? null : editing.monthly_limit,
          questions_per_session: editing.questions_per_session,
          model_override: editing.model_override || null,
          is_unlimited: editing.is_unlimited,
          is_active: editing.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);
      if (error) throw error;
      setEditing(null);
      await loadLimits();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  function planLabel(name: string | null) {
    if (!name) return 'Global Default';
    return PLAN_LABELS[name] || name;
  }

  function accessSummary(l: PlanLimit) {
    if (!l.is_active) return 'Disabled';
    if (l.is_unlimited) return 'Unlimited';
    if ((l.daily_limit ?? 0) === 0 && (l.monthly_limit ?? 0) === 0) return 'No Access';
    return `${l.daily_limit ?? '-'}/day, ${l.monthly_limit ?? '-'}/month`;
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  const labelStyle: React.CSSProperties = { color: 'var(--color-text-secondary)' };
  const thStyle: React.CSSProperties = { color: 'var(--color-text-tertiary)' };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
        <span style={{ color: 'var(--color-text-secondary)' }}>Loading plan limits...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Plan-Based Limits</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Configure Ask Doooda availability and usage limits per subscription plan. Changes apply immediately.
        </p>
      </div>

      <div
        className="rounded-lg shadow overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-light)' }}
      >
        <table className="min-w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase" style={thStyle}>Plan</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase" style={thStyle}>Access</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase" style={thStyle}>Per Session</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase" style={thStyle}>Model</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase" style={thStyle}>Status</th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase" style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {limits.map((limit) => (
              <tr key={limit.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <td className="px-5 py-4 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {planLabel(limit.plan_name)}
                </td>
                <td className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {accessSummary(limit)}
                </td>
                <td className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {limit.questions_per_session ? `${limit.questions_per_session} questions` : '-'}
                </td>
                <td className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {limit.model_override || 'Default'}
                </td>
                <td className="px-5 py-4 text-sm">
                  <span
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{
                      backgroundColor: limit.is_active
                        ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                        : 'color-mix(in srgb, var(--color-error) 15%, transparent)',
                      color: limit.is_active ? 'var(--color-success)' : 'var(--color-error)',
                    }}
                  >
                    {limit.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-5 py-4 text-right text-sm">
                  <button
                    onClick={() => setEditing({ ...limit })}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {limits.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                  No limits configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-xl shadow-xl max-w-md w-full p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {planLabel(editing.plan_name)} -- Ask Doooda Limits
            </h3>

            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Enabled</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_unlimited}
                  onChange={(e) => setEditing({ ...editing, is_unlimited: e.target.checked })}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Unlimited Access</span>
              </label>

              {!editing.is_unlimited && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Daily Limit</label>
                    <input
                      type="number"
                      value={editing.daily_limit ?? 0}
                      onChange={(e) => setEditing({ ...editing, daily_limit: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm rounded-lg"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Monthly Limit</label>
                    <input
                      type="number"
                      value={editing.monthly_limit ?? 0}
                      onChange={(e) => setEditing({ ...editing, monthly_limit: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm rounded-lg"
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  Questions Per Session (0 = unlimited)
                </label>
                <input
                  type="number"
                  value={editing.questions_per_session ?? 0}
                  onChange={(e) => setEditing({ ...editing, questions_per_session: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  Model Override (empty = default)
                </label>
                <input
                  type="text"
                  value={editing.model_override ?? ''}
                  onChange={(e) => setEditing({ ...editing, model_override: e.target.value })}
                  placeholder="e.g., gpt-4o-mini"
                  className="w-full px-3 py-2 text-sm rounded-lg"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <Button onClick={handleSave} loading={saving}>
                Save
              </Button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
