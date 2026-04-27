import { useEffect, useState } from 'react';
import { supabase } from '../../services/api';
import Button from '../Button';
import { Check, Zap } from 'lucide-react';

interface Plan {
  name: string;
  code: string;
  name_ar: string;
  name_en: string;
  monthly_tokens: number;
  multiplier: number;
  price: number;
  tokens_initial: number;
  tokens_recurring: number;
  allow_token_purchase: boolean;
  max_token_cap: number | null;
  features: Record<string, any>;
  price_monthly: number;
  created_at?: string;
  updated_at?: string;
}

interface TokenPackage {
  id: number;
  tokens: number;
  price: number;
}

function FeatureRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingPackage, setEditingPackage] = useState<TokenPackage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (plansError) throw plansError;

      const { data: packagesData, error: packagesError } = await supabase
        .from('token_packages')
        .select('*')
        .order('tokens', { ascending: true });

      if (packagesError) throw packagesError;

      setPlans(plansData || []);
      setPackages(packagesData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePlan() {
    if (!editingPlan) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('plans')
        .update({
          monthly_tokens: editingPlan.monthly_tokens,
          multiplier: editingPlan.multiplier,
          price: editingPlan.price,
          name_ar: editingPlan.name_ar,
          name_en: editingPlan.name_en,
          tokens_initial: editingPlan.tokens_initial,
          tokens_recurring: editingPlan.tokens_recurring,
          allow_token_purchase: editingPlan.allow_token_purchase,
          max_token_cap: editingPlan.max_token_cap || null,
          price_monthly: editingPlan.price_monthly,
          features: editingPlan.features,
          updated_at: new Date().toISOString()
        })
        .eq('name', editingPlan.name);

      if (error) throw error;

      setEditingPlan(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save plan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePackage() {
    if (!editingPackage) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('token_packages')
        .update({
          tokens: editingPackage.tokens,
          price: editingPackage.price,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPackage.id);

      if (error) throw error;

      setEditingPackage(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save package.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--color-text-secondary)',
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
        <span style={{ color: 'var(--color-text-secondary)' }}>Loading plans...</span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Plans & Token Packages</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-tertiary)' }}>
        Configure subscription plans and one-time token packages.
      </p>

      {error && (
        <div
          className="rounded-lg p-4 mb-4 text-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
        >
          {error}
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Subscription Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isPro = (plan.code || plan.name) === 'pro';
            const isFree = (plan.code || plan.name) === 'free';

            const planFeatures: string[] = plan.features?.features_list || [];
            const features = planFeatures.length > 0
              ? planFeatures
              : isFree
              ? ['Unlimited projects', '10,000 gift tokens', 'Some ready-made plots', 'Some free courses', 'Doooda community access']
              : isPro
              ? ['120,000 tokens/month', 'Unlimited projects', 'Free + premium plots', 'Export PDF + Word', 'Marketing & Publishing', 'All courses free', 'Doooda community access']
              : ['300,000 tokens/month', 'Unlimited projects', 'All plots available', 'Export PDF + Word', 'Marketing & Publishing', 'All courses free', 'Doooda community access'];

            const disabledFeatures = isFree ? ['No export', 'No marketing'] : [];
            const badge = isPro ? 'Most Popular' : null;
            const tokensLabel = plan.allow_token_purchase ? 'Buy extra tokens anytime' : null;

            return (
              <div
                key={plan.name}
                className="relative rounded-2xl overflow-hidden"
                style={{
                  border: isPro ? '2px solid #d62828' : '1.5px solid var(--color-border)',
                  backgroundColor: isPro ? 'color-mix(in srgb, #d62828 5%, var(--color-surface))' : 'var(--color-surface)',
                  boxShadow: isPro ? '0 8px 32px rgba(214,40,40,0.10)' : 'none',
                }}
              >
                {badge && (
                  <div className="text-center py-2 text-xs font-bold text-white" style={{ backgroundColor: '#d62828' }}>
                    {badge}
                  </div>
                )}

                <div className="p-6">
                  <h4 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {plan.name_ar || (isFree ? 'كاتب هاوي' : isPro ? 'كاتب جاد' : 'كاتب محترف')}
                    <span className="ms-2 text-xs font-normal opacity-50">({plan.name_en || plan.name})</span>
                  </h4>

                  <div className="mb-5 mt-3">
                    <span
                      className="text-4xl font-black"
                      style={{ color: isPro ? '#d62828' : 'var(--color-text-primary)' }}
                    >
                      {isFree ? 'Free' : `$${plan.price}`}
                    </span>
                    {!isFree && (
                      <span className="text-sm ms-1" style={{ color: 'var(--color-text-tertiary)' }}>/month</span>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-5">
                    {features.map((feat, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm">
                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: isPro ? '#d62828' : '#10b981' }} />
                        <span style={{ color: 'var(--color-text-secondary)' }}>{feat}</span>
                      </li>
                    ))}
                    {disabledFeatures.map((feat, j) => (
                      <li key={`d-${j}`} className="flex items-center gap-2.5 text-sm">
                        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                          <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: 'var(--color-text-tertiary)' }} />
                        </div>
                        <span style={{ color: 'var(--color-text-tertiary)', textDecoration: 'line-through' }}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {tokensLabel && (
                    <div
                      className="flex items-center gap-2 text-xs mb-4 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-primary)' }}
                    >
                      <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                      {tokensLabel}
                    </div>
                  )}

                  <div
                    className="pt-4 mt-2 space-y-1"
                    style={{ borderTop: '1px solid var(--color-border-light)' }}
                  >
                    <FeatureRow label="Monthly Tokens" value={plan.monthly_tokens.toLocaleString()} />
                    <FeatureRow label="Initial Tokens" value={plan.tokens_initial?.toLocaleString() || '0'} />
                    {plan.tokens_recurring > 0 && <FeatureRow label="Recurring Tokens" value={plan.tokens_recurring.toLocaleString()} />}
                    <FeatureRow label="Token Multiplier" value={`${plan.multiplier}x`} />
                    <FeatureRow label="Price" value={isFree ? 'Free' : `$${plan.price}/mo`} />
                    <FeatureRow label="Token Purchase" value={plan.allow_token_purchase ? '✅ Enabled' : '❌ Disabled'} />
                    <FeatureRow label="Max Token Cap" value={plan.max_token_cap ? plan.max_token_cap.toLocaleString() : '∞ (No limit)'} />
                  </div>

                  <div className="mt-4">
                    <Button onClick={() => setEditingPlan({ ...plan })} variant="secondary">
                      Edit Plan
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>One-Time Token Packages</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-lg p-5"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="text-center mb-4">
                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {pkg.tokens.toLocaleString()}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>tokens</div>
              </div>

              <div className="text-center mb-4">
                <span className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>
                  ${pkg.price.toString()}
                </span>
              </div>

              <Button onClick={() => setEditingPackage({ ...pkg })} variant="secondary" className="w-full">
                Edit
              </Button>
            </div>
          ))}
        </div>
      </div>

      {editingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-xl shadow-xl max-w-md w-full p-6"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
<h3 className="text-xl font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>
                Edit {editingPlan.name_en || editingPlan.name} Plan
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Name (AR)</label>
                    <input
                      type="text"
                      value={editingPlan.name_ar}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name_ar: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={inputStyle}
                      placeholder="كاتب هاوي"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Name (EN)</label>
                    <input
                      type="text"
                      value={editingPlan.name_en}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name_en: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={inputStyle}
                      placeholder="Hobbyist Writer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Monthly Tokens</label>
                <input
                  type="number"
                  value={editingPlan.monthly_tokens}
                  onChange={(e) => setEditingPlan({ ...editingPlan, monthly_tokens: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                  min="0"
                />
              </div>

<div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Token Multiplier</label>
                  <input
                    type="number"
                    value={editingPlan.multiplier}
                    onChange={(e) => setEditingPlan({ ...editingPlan, multiplier: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                    min="0"
                    step="0.1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Initial Tokens</label>
                    <input
                      type="number"
                      value={editingPlan.tokens_initial || 0}
                      onChange={(e) => setEditingPlan({ ...editingPlan, tokens_initial: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={inputStyle}
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={labelStyle}>Recurring Tokens</label>
                    <input
                      type="number"
                      value={editingPlan.tokens_recurring || 0}
                      onChange={(e) => setEditingPlan({ ...editingPlan, tokens_recurring: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={inputStyle}
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Price ($)</label>
                  <input
                    type="number"
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Monthly Price ($)</label>
                  <input
                    type="number"
                    value={editingPlan.price_monthly ?? 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="allow_token_purchase"
                    checked={editingPlan.allow_token_purchase ?? false}
                    onChange={(e) => setEditingPlan({ ...editingPlan, allow_token_purchase: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="allow_token_purchase" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Allow token purchase
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>Max Token Cap (null = no limit)</label>
                  <input
                    type="number"
                    value={editingPlan.max_token_cap ?? ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, max_token_cap: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                    min="0"
                    placeholder="∞ No limit"
                  />
                </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <Button onClick={handleSavePlan} loading={saving}>
                Save Changes
              </Button>
              <button
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-xl shadow-xl max-w-md w-full p-6"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <h3 className="text-xl font-bold mb-5" style={{ color: 'var(--color-text-primary)' }}>
              Edit Token Package
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Tokens</label>
                <input
                  type="number"
                  value={editingPackage.tokens}
                  onChange={(e) => setEditingPackage({ ...editingPackage, tokens: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>Price ($)</label>
                <input
                  type="number"
                  value={editingPackage.price}
                  onChange={(e) => setEditingPackage({ ...editingPackage, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <Button onClick={handleSavePackage} loading={saving}>
                Save Changes
              </Button>
              <button
                onClick={() => setEditingPackage(null)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
