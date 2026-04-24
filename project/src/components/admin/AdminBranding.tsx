import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface BrandingSetting {
  id: string;
  key: string;
  value: string;
  description: string;
}

const GROUPS = [
  {
    title: 'Identity',
    keys: ['platform_name_ar', 'platform_name_en', 'logo_url', 'favicon_url'],
  },
  {
    title: 'Colors',
    keys: ['color_primary', 'color_accent'],
  },
  {
    title: 'Footer',
    keys: ['footer_text_ar', 'footer_text_en', 'support_email'],
  },
  {
    title: 'Legal Links',
    keys: ['legal_privacy_url', 'legal_terms_url', 'legal_cookies_url'],
  },
];

export default function AdminBranding() {
  const [settings, setSettings] = useState<BrandingSetting[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('branding_settings').select('*').order('key');
    if (error) setError(error.message);
    else {
      setSettings(data || []);
      const init: Record<string, string> = {};
      (data || []).forEach(s => { init[s.key] = s.value; });
      setEdits(init);
    }
    setLoading(false);
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    for (const setting of settings) {
      const newVal = edits[setting.key] ?? setting.value;
      if (newVal !== setting.value) {
        const { error } = await supabase
          .from('branding_settings')
          .update({ value: newVal, updated_at: new Date().toISOString() })
          .eq('id', setting.id);
        if (error) { setError(error.message); setSaving(false); return; }
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    await load();
  }

  function isColor(key: string) { return key.startsWith('color_'); }
  function isUrl(key: string) { return key.endsWith('_url'); }

  if (loading) return <div className="text-center py-12" style={{ color: 'var(--color-text-tertiary)' }}>Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Branding Settings</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Logo, colors, footer text, and legal links
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ backgroundColor: saved ? 'var(--color-success)' : 'var(--color-accent)', color: '#fff', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Changes'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      <div className="space-y-6">
        {GROUPS.map(group => {
          const groupSettings = settings.filter(s => group.keys.includes(s.key));
          if (groupSettings.length === 0) return null;
          return (
            <div key={group.title} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <div className="px-5 py-3" style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
                  {group.title}
                </h3>
              </div>
              <div style={{ backgroundColor: 'var(--color-surface)' }}>
                {groupSettings.map((setting, idx) => (
                  <div
                    key={setting.id}
                    className="flex items-center gap-4 px-5 py-4"
                    style={{ borderBottom: idx < groupSettings.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                  >
                    <div className="flex-1 min-w-0">
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                        {setting.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </label>
                      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{setting.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {isColor(setting.key) && (
                        <div
                          className="w-8 h-8 rounded-lg border-2"
                          style={{ backgroundColor: edits[setting.key] || '#ccc', borderColor: 'var(--color-border)' }}
                        />
                      )}
                      <input
                        type={isColor(setting.key) ? 'text' : isUrl(setting.key) ? 'url' : 'text'}
                        value={edits[setting.key] ?? ''}
                        onChange={e => setEdits(prev => ({ ...prev, [setting.key]: e.target.value }))}
                        placeholder={isColor(setting.key) ? '#3B82F6' : isUrl(setting.key) ? 'https://' : ''}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-primary)',
                          width: isColor(setting.key) ? '140px' : '280px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Note: Logo and favicon changes require deployment of updated assets. Color changes take effect immediately for new sessions.
        </p>
      </div>
    </div>
  );
}
