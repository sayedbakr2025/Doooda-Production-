import { useEffect, useState } from 'react';
import { updateUserPlan, getUserOverrides, createUserOverride, deactivateUserOverride } from '../../services/api';
import Button from '../Button';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  pen_name?: string;
  plan: string;
  tokens_balance: number;
  admin_role?: string;
}

interface UserOverride {
  id: string;
  override_type: string;
  override_value: Record<string, unknown>;
  reason?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}

const PLANS = ['free', 'pro', 'max'] as const;

const PLAN_LABELS: Record<string, string> = {
  free: 'كاتب هاوي (free)',
  pro:  'كاتب جاد (pro)',
  max:  'كاتب محترف (max)',
};
const OVERRIDE_TYPES = [
  { value: 'max_projects', label: 'Max Projects' },
  { value: 'max_chapters', label: 'Max Chapters / Project' },
  { value: 'max_words', label: 'Max Words / Project' },
  { value: 'doooda_daily', label: 'Doooda Daily Limit' },
  { value: 'doooda_monthly', label: 'Doooda Monthly Limit' },
  { value: 'doooda_unlimited', label: 'Doooda Unlimited' },
];

function formatDate(iso?: string) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function UserManageModal({ user, onClose, onSaved }: Props) {
  const [plan, setPlan] = useState(user.plan || 'free');
  const [tokensBalance, setTokensBalance] = useState(user.tokens_balance ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [overrides, setOverrides] = useState<UserOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [newOverrideType, setNewOverrideType] = useState(OVERRIDE_TYPES[0].value);
  const [newOverrideValue, setNewOverrideValue] = useState('');
  const [newOverrideReason, setNewOverrideReason] = useState('');
  const [newOverrideExpires, setNewOverrideExpires] = useState('');
  const [addingOverride, setAddingOverride] = useState(false);

  useEffect(() => {
    loadOverrides();
  }, [user.id]);

  async function loadOverrides() {
    try {
      setLoadingOverrides(true);
      const data = await getUserOverrides(user.id);
      setOverrides(data);
    } catch {
      // silently fail
    } finally {
      setLoadingOverrides(false);
    }
  }

  async function handleSavePlan() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateUserPlan(user.id, {
        plan,
        tokens_balance: tokensBalance,
      });
      setSuccess('User updated successfully.');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddOverride() {
    if (!newOverrideValue && newOverrideType !== 'doooda_unlimited') return;
    setAddingOverride(true);
    setError('');
    try {
      const value = newOverrideType === 'doooda_unlimited'
        ? { enabled: true }
        : { limit: parseInt(newOverrideValue, 10) };

      await createUserOverride({
        user_id: user.id,
        override_type: newOverrideType,
        override_value: value,
        reason: newOverrideReason || undefined,
        expires_at: newOverrideExpires || null,
      });
      setNewOverrideValue('');
      setNewOverrideReason('');
      setNewOverrideExpires('');
      await loadOverrides();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add override');
    } finally {
      setAddingOverride(false);
    }
  }

  async function handleDeactivateOverride(overrideId: string) {
    try {
      await deactivateUserOverride(overrideId);
      await loadOverrides();
    } catch {
      setError('Failed to deactivate override');
    }
  }

  const isAdmin = user.role === 'admin';
  const activeOverrides = overrides.filter(o => o.is_active);
  const inactiveOverrides = overrides.filter(o => !o.is_active);

  const selectStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--color-text-secondary)',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Manage User
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {user.email}
            </p>
          </div>
          {isAdmin && (
            <span
              className="px-3 py-1 text-xs font-semibold rounded-full"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', color: 'var(--color-warning)' }}
            >
              ADMIN
            </span>
          )}
        </div>

        {error && (
          <div
            className="rounded-lg p-3 mb-4 text-sm"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="rounded-lg p-3 mb-4 text-sm"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, transparent)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}
          >
            {success}
          </div>
        )}

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={labelStyle}>
              Plan & Tokens
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={selectStyle}
                >
                  {PLANS.map(p => (
                    <option key={p} value={p}>{PLAN_LABELS[p] || p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Tokens Balance</label>
                <input
                  type="number"
                  value={tokensBalance}
                  onChange={(e) => setTokensBalance(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={selectStyle}
                  min="0"
                />
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={handleSavePlan} loading={saving}>
                Save Changes
              </Button>
            </div>
          </section>

          <hr style={{ borderColor: 'var(--color-border)' }} />

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={labelStyle}>
              Limit Overrides
            </h3>

            {loadingOverrides ? (
              <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Loading overrides...</p>
            ) : (
              <>
                {activeOverrides.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {activeOverrides.map(o => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between p-3 rounded-lg text-sm"
                        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)' }}
                      >
                        <div>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {OVERRIDE_TYPES.find(t => t.value === o.override_type)?.label || o.override_type}
                          </span>
                          <span className="ml-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {JSON.stringify(o.override_value)}
                          </span>
                          {o.reason && (
                            <span className="ml-2" style={{ color: 'var(--color-text-tertiary)' }}>
                              — {o.reason}
                            </span>
                          )}
                          {o.expires_at && (
                            <span className="ml-2 text-xs" style={{ color: 'var(--color-warning)' }}>
                              Expires: {formatDate(o.expires_at)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeactivateOverride(o.id)}
                          className="text-xs px-2 py-1 rounded transition-colors"
                          style={{ color: 'var(--color-error)' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeOverrides.length === 0 && (
                  <p className="text-sm mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
                    No active overrides. This user follows plan defaults.
                  </p>
                )}

                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={labelStyle}>
                    Add Override
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={labelStyle}>Type</label>
                      <select
                        value={newOverrideType}
                        onChange={(e) => setNewOverrideType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={selectStyle}
                      >
                        {OVERRIDE_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {newOverrideType !== 'doooda_unlimited' && (
                      <div>
                        <label className="block text-xs mb-1" style={labelStyle}>Value</label>
                        <input
                          type="number"
                          value={newOverrideValue}
                          onChange={(e) => setNewOverrideValue(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm"
                          style={selectStyle}
                          placeholder="e.g. 50"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs mb-1" style={labelStyle}>Reason (optional)</label>
                      <input
                        type="text"
                        value={newOverrideReason}
                        onChange={(e) => setNewOverrideReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={selectStyle}
                        placeholder="Why this override?"
                      />
                    </div>

                    <div>
                      <label className="block text-xs mb-1" style={labelStyle}>Expires (optional)</label>
                      <input
                        type="date"
                        value={newOverrideExpires}
                        onChange={(e) => setNewOverrideExpires(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={selectStyle}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <Button onClick={handleAddOverride} loading={addingOverride} variant="secondary">
                      Add Override
                    </Button>
                  </div>
                </div>

                {inactiveOverrides.length > 0 && (
                  <details className="mt-4">
                    <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-text-tertiary)' }}>
                      {inactiveOverrides.length} inactive override(s)
                    </summary>
                    <div className="mt-2 space-y-1">
                      {inactiveOverrides.map(o => (
                        <div key={o.id} className="text-xs p-2 rounded opacity-50" style={{ color: 'var(--color-text-tertiary)' }}>
                          {o.override_type}: {JSON.stringify(o.override_value)}
                          {o.reason && ` — ${o.reason}`}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </section>
        </div>

        <div className="flex justify-end mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
