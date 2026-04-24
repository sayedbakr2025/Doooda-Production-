import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface SecuritySetting {
  id: string;
  key: string;
  value: any;
  description: string;
}

interface LoginAttempt {
  id: string;
  email: string | null;
  ip_address: string | null;
  success: boolean;
  failure_reason: string | null;
  created_at: string;
}

export default function AdminSecurity() {
  const [settings, setSettings] = useState<SecuritySetting[]>([]);
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'logins' | 'blocklist'>('settings');
  const [ipInput, setIpInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [settingsRes, attemptsRes] = await Promise.all([
      supabase.from('security_settings').select('*').order('key'),
      supabase.from('login_attempts').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (settingsRes.error) setError(settingsRes.error.message);
    else setSettings(settingsRes.data || []);
    setAttempts(attemptsRes.data || []);
    setLoading(false);
  }

  async function saveSetting(id: string, newValue: any) {
    setSaving(id);
    const { error } = await supabase.from('security_settings').update({ value: newValue, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) setError(error.message);
    else setSettings(prev => prev.map(s => s.id === id ? { ...s, value: newValue } : s));
    setSaving(null);
  }

  function getSetting(key: string) { return settings.find(s => s.key === key); }

  async function addToBlocklist(ip: string) {
    const blocklist = getSetting('ip_blocklist');
    if (!blocklist) return;
    const current: string[] = Array.isArray(blocklist.value) ? blocklist.value : JSON.parse(String(blocklist.value) || '[]');
    if (!current.includes(ip)) {
      await saveSetting(blocklist.id, [...current, ip]);
    }
    setIpInput('');
  }

  async function removeFromBlocklist(ip: string) {
    const blocklist = getSetting('ip_blocklist');
    if (!blocklist) return;
    const current: string[] = Array.isArray(blocklist.value) ? blocklist.value : JSON.parse(String(blocklist.value) || '[]');
    await saveSetting(blocklist.id, current.filter(i => i !== ip));
  }

  const blocklist: string[] = (() => {
    const setting = getSetting('ip_blocklist');
    if (!setting) return [];
    return Array.isArray(setting.value) ? setting.value : JSON.parse(String(setting.value) || '[]');
  })();

  const EDITABLE_SETTINGS = settings.filter(s => s.key !== 'ip_blocklist');

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Security Panel</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Login attempts, IP blocklist, session settings, 2FA enforcement
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {(['settings', 'logins', 'blocklist'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize"
            style={{
              backgroundColor: activeTab === tab ? 'var(--color-accent)' : 'var(--color-surface)',
              color: activeTab === tab ? '#fff' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {tab === 'logins' ? 'Login Attempts' : tab === 'blocklist' ? 'IP Blocklist' : 'Settings'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--color-text-tertiary)' }}>Loading...</div>
      ) : activeTab === 'settings' ? (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          {EDITABLE_SETTINGS.map((setting, idx) => {
            const isBool = setting.value === true || setting.value === false;
            return (
              <div
                key={setting.id}
                className="flex items-center justify-between px-5 py-4 gap-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderBottom: idx < EDITABLE_SETTINGS.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {setting.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{setting.description}</p>
                </div>
                {isBool ? (
                  <button
                    onClick={() => saveSetting(setting.id, !setting.value)}
                    disabled={saving === setting.id}
                    className="relative inline-flex items-center w-12 h-6 rounded-full transition-colors shrink-0"
                    style={{ backgroundColor: setting.value ? 'var(--color-accent)' : 'var(--color-border)', opacity: saving === setting.id ? 0.6 : 1 }}
                  >
                    <span className="inline-block w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform" style={{ transform: setting.value ? 'translateX(26px)' : 'translateX(2px)' }} />
                  </button>
                ) : (
                  <input
                    type="number"
                    defaultValue={Number(setting.value)}
                    onBlur={(e) => saveSetting(setting.id, Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg text-sm w-24"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : activeTab === 'logins' ? (
        <div>
          {attempts.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-tertiary)' }}>No login attempts recorded yet</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <div className="grid grid-cols-5 gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
                <span>Email</span><span>IP Address</span><span>Status</span><span>Reason</span><span>Time</span>
              </div>
              {attempts.map((attempt, idx) => (
                <div key={attempt.id} className="grid grid-cols-5 gap-3 px-4 py-3 text-sm items-center" style={{ backgroundColor: 'var(--color-surface)', borderBottom: idx < attempts.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <span className="truncate" style={{ color: 'var(--color-text-primary)' }}>{attempt.email || '—'}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{attempt.ip_address || '—'}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium w-fit" style={{ backgroundColor: attempt.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: attempt.success ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {attempt.success ? 'Success' : 'Failed'}
                  </span>
                  <span className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>{attempt.failure_reason || '—'}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{new Date(attempt.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Enter IP address to block (e.g., 192.168.1.1)"
              value={ipInput}
              onChange={e => setIpInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              onKeyDown={e => e.key === 'Enter' && ipInput && addToBlocklist(ipInput)}
            />
            <button
              onClick={() => ipInput && addToBlocklist(ipInput)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: 'var(--color-error)', color: '#fff' }}
            >
              Block IP
            </button>
          </div>

          {blocklist.length === 0 ? (
            <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-tertiary)' }}>No IPs blocked</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              {blocklist.map((ip, idx) => (
                <div key={ip} className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: 'var(--color-surface)', borderBottom: idx < blocklist.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <code className="text-sm" style={{ color: 'var(--color-error)' }}>{ip}</code>
                  <button onClick={() => removeFromBlocklist(ip)} className="text-xs px-3 py-1 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
