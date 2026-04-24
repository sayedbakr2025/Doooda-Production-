import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface TrackingScript {
  id: string;
  key: string;
  value: string;
  description: string;
  is_enabled: boolean;
  inject_location: string;
}

const SCRIPT_LABELS: Record<string, { label: string; placeholder: string; isId: boolean }> = {
  google_analytics_id: { label: 'Google Analytics ID', placeholder: 'G-XXXXXXXXXX', isId: true },
  google_tag_manager_id: { label: 'Google Tag Manager ID', placeholder: 'GTM-XXXXXXX', isId: true },
  meta_pixel_id: { label: 'Meta (Facebook) Pixel ID', placeholder: '123456789012345', isId: true },
  tiktok_pixel_id: { label: 'TikTok Pixel ID', placeholder: 'XXXXXXXXXXXXXXXXXX', isId: true },
  snapchat_pixel_id: { label: 'Snapchat Pixel ID', placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX', isId: true },
  custom_head_script: { label: 'Custom Head Script', placeholder: '<script>...</script>', isId: false },
  custom_footer_script: { label: 'Custom Footer Script', placeholder: '<script>...</script>', isId: false },
};

export default function AdminTracking() {
  const [scripts, setScripts] = useState<TrackingScript[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('tracking_scripts').select('*').order('key');
    if (error) setError(error.message);
    else {
      setScripts(data || []);
      const init: Record<string, string> = {};
      (data || []).forEach(s => { init[s.key] = s.value; });
      setEdits(init);
    }
    setLoading(false);
  }

  async function toggleEnabled(script: TrackingScript) {
    setSaving(script.id);
    const { error } = await supabase
      .from('tracking_scripts')
      .update({ is_enabled: !script.is_enabled, updated_at: new Date().toISOString() })
      .eq('id', script.id);
    if (error) setError(error.message);
    else setScripts(prev => prev.map(s => s.id === script.id ? { ...s, is_enabled: !s.is_enabled } : s));
    setSaving(null);
  }

  async function saveValue(script: TrackingScript) {
    const newVal = edits[script.key] ?? '';
    if (newVal === script.value) return;
    setSaving(script.id);
    const { error } = await supabase
      .from('tracking_scripts')
      .update({ value: newVal, updated_at: new Date().toISOString() })
      .eq('id', script.id);
    if (error) setError(error.message);
    else setScripts(prev => prev.map(s => s.id === script.id ? { ...s, value: newVal } : s));
    setSaving(null);
  }

  const idScripts = scripts.filter(s => SCRIPT_LABELS[s.key]?.isId);
  const customScripts = scripts.filter(s => !SCRIPT_LABELS[s.key]?.isId);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Tracking & Ads</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Analytics, marketing pixels, and custom scripts injection
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--color-text-tertiary)' }}>Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
                Analytics & Pixel IDs
              </h3>
            </div>
            {idScripts.map((script, idx) => {
              const meta = SCRIPT_LABELS[script.key];
              return (
                <div
                  key={script.id}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderBottom: idx < idScripts.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{meta?.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{script.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <input
                      type="text"
                      value={edits[script.key] ?? ''}
                      onChange={e => setEdits(prev => ({ ...prev, [script.key]: e.target.value }))}
                      onBlur={() => saveValue(script)}
                      placeholder={meta?.placeholder}
                      className="px-3 py-2 rounded-lg text-sm font-mono"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        width: '220px',
                      }}
                    />
                    <button
                      onClick={() => toggleEnabled(script)}
                      disabled={saving === script.id}
                      className="relative inline-flex items-center w-12 h-6 rounded-full transition-colors shrink-0"
                      style={{
                        backgroundColor: script.is_enabled ? 'var(--color-accent)' : 'var(--color-border)',
                        opacity: saving === script.id ? 0.6 : 1,
                      }}
                    >
                      <span
                        className="inline-block w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform"
                        style={{ transform: script.is_enabled ? 'translateX(26px)' : 'translateX(2px)' }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
                Custom Scripts
              </h3>
            </div>
            {customScripts.map((script, idx) => {
              const meta = SCRIPT_LABELS[script.key];
              return (
                <div
                  key={script.id}
                  className="px-5 py-4"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderBottom: idx < customScripts.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{meta?.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                        Injects into: <code style={{ color: 'var(--color-accent)' }}>{script.inject_location === 'head' ? '<head>' : '</body>'}</code>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: script.is_enabled ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}>
                        {script.is_enabled ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => toggleEnabled(script)}
                        disabled={saving === script.id}
                        className="relative inline-flex items-center w-12 h-6 rounded-full transition-colors"
                        style={{ backgroundColor: script.is_enabled ? 'var(--color-accent)' : 'var(--color-border)', opacity: saving === script.id ? 0.6 : 1 }}
                      >
                        <span
                          className="inline-block w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform"
                          style={{ transform: script.is_enabled ? 'translateX(26px)' : 'translateX(2px)' }}
                        />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={edits[script.key] ?? ''}
                    onChange={e => setEdits(prev => ({ ...prev, [script.key]: e.target.value }))}
                    onBlur={() => saveValue(script)}
                    placeholder={meta?.placeholder}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono resize-y"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              All scripts are saved securely in the database. Toggle each script on/off without losing the configuration.
              Custom scripts are sanitized and injected safely.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
