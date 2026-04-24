import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface PlatformSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
}

const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'features', label: 'Features' },
  { id: 'ai', label: 'AI Features' },
  { id: 'limits', label: 'Limits' },
];

export default function AdminPlatformSettings() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('general');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .order('category')
      .order('key');
    if (error) setError(error.message);
    else setSettings(data || []);
    setLoading(false);
  }

  async function toggleBoolean(setting: PlatformSetting) {
    const current = setting.value === true || setting.value === 'true';
    await saveSetting(setting.id, !current);
  }

  async function saveSetting(id: string, newValue: any) {
    setSaving(id);
    const { error } = await supabase
      .from('platform_settings')
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) setError(error.message);
    else {
      setSettings(prev =>
        prev.map(s => s.id === id ? { ...s, value: newValue } : s)
      );
    }
    setSaving(null);
  }

  function isBoolean(val: any) {
    return val === true || val === false || val === 'true' || val === 'false';
  }

  const filtered = settings.filter(s => s.category === activeCategory);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Platform Settings</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Control platform-wide features, maintenance mode, and global toggles
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeCategory === cat.id ? 'var(--color-accent)' : 'var(--color-surface)',
              color: activeCategory === cat.id ? '#fff' : 'var(--color-text-secondary)',
              border: `1px solid var(--color-border)`,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--color-text-tertiary)' }}>Loading settings...</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          {filtered.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--color-text-tertiary)' }}>No settings in this category</div>
          ) : (
            filtered.map((setting, idx) => (
              <div
                key={setting.id}
                className="flex items-center justify-between p-4 gap-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderBottom: idx < filtered.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {setting.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{setting.description}</p>
                  <code className="text-xs mt-0.5 block" style={{ color: 'var(--color-text-quaternary, #9ca3af)' }}>key: {setting.key}</code>
                </div>
                <div className="shrink-0">
                  {isBoolean(setting.value) ? (
                    <button
                      onClick={() => toggleBoolean(setting)}
                      disabled={saving === setting.id}
                      className="relative inline-flex items-center w-12 h-6 rounded-full transition-colors"
                      style={{
                        backgroundColor: (setting.value === true || setting.value === 'true') ? 'var(--color-accent)' : 'var(--color-border)',
                        opacity: saving === setting.id ? 0.6 : 1,
                      }}
                    >
                      <span
                        className="inline-block w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform"
                        style={{
                          transform: (setting.value === true || setting.value === 'true') ? 'translateX(26px)' : 'translateX(2px)',
                        }}
                      />
                    </button>
                  ) : (
                    <input
                      type="text"
                      defaultValue={typeof setting.value === 'string' ? setting.value.replace(/^"|"$/g, '') : String(setting.value)}
                      onBlur={(e) => {
                        const newVal = isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value);
                        saveSetting(setting.id, newVal);
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm w-40"
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
            <svg className="w-4 h-4" style={{ color: 'var(--color-error)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>Maintenance Mode</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              When enabled, all users except admins will see the maintenance message
            </p>
          </div>
          {settings.find(s => s.key === 'maintenance_mode') && (
            <button
              onClick={() => {
                const s = settings.find(s => s.key === 'maintenance_mode')!;
                toggleBoolean(s);
              }}
              className="ml-auto px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: settings.find(s => s.key === 'maintenance_mode')?.value ? 'var(--color-error)' : 'var(--color-surface)',
                color: settings.find(s => s.key === 'maintenance_mode')?.value ? '#fff' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {settings.find(s => s.key === 'maintenance_mode')?.value === true ? 'ACTIVE - Click to Disable' : 'Enable Maintenance Mode'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
