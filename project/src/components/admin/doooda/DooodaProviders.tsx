import { useEffect, useState } from 'react';
import { supabase } from '../../../services/api';
import Button from '../../Button';

interface AIProvider {
  id: string;
  provider_name: string;
  api_key_encrypted: string;
  api_endpoint: string | null;
  model_name: string;
  max_tokens: number;
  temperature: number;
  is_enabled: boolean;
  is_default: boolean;
  daily_request_limit: number;
  last_test_at: string | null;
  last_test_result: string | null;
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'copilot', label: 'GitHub Copilot' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'anthropic', label: 'Anthropic Claude' },
];

export default function DooodaProviders() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AIProvider | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      setError('');
      const { data, error: fetchError } = await supabase
        .from('ai_providers')
        .select('*')
        .order('provider_name', { ascending: true });

      if (fetchError) throw fetchError;
      setProviders(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load AI providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updateData = {
        api_key_encrypted: editing.api_key_encrypted,
        api_endpoint: editing.api_endpoint,
        model_name: editing.model_name,
        max_tokens: editing.max_tokens,
        temperature: editing.temperature,
        is_enabled: editing.is_enabled,
        is_default: editing.is_default,
        daily_request_limit: editing.daily_request_limit,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('ai_providers')
        .update(updateData)
        .eq('id', editing.id);

      if (error) throw error;

      setEditing(null);
      loadProviders();
    } catch (err: any) {
      setError(err.message || 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (providerId: string) => {
    setTesting(providerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-ai-provider`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider_id: providerId })
      });

      if (!response.ok) throw new Error('Test failed');

      await loadProviders();
    } catch (err: any) {
      setError(err.message || 'Failed to test provider');
    } finally {
      setTesting(null);
    }
  };

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
        <span style={{ color: 'var(--color-text-secondary)' }}>Loading providers...</span>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        AI Providers Configuration
      </h3>

      {error && (
        <div
          className="rounded-lg p-4 mb-4 text-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
        >
          {error}
        </div>
      )}

      <div className="space-y-4">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="rounded-lg shadow p-5"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h4 className="text-base font-semibold capitalize" style={{ color: 'var(--color-text-primary)' }}>
                  {PROVIDERS.find(p => p.value === provider.provider_name)?.label || provider.provider_name}
                </h4>
                {provider.is_default && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
                    Default
                  </span>
                )}
                {provider.is_enabled ? (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)', color: 'var(--color-success)' }}>
                    Enabled
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 15%, transparent)', color: 'var(--color-error)' }}>
                    Disabled
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTest(provider.id)}
                  disabled={testing === provider.id}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
                    color: 'var(--color-info)',
                  }}
                >
                  {testing === provider.id ? 'Testing...' : 'Test'}
                </button>
                <Button onClick={() => setEditing(provider)} variant="secondary">
                  Configure
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span style={{ color: 'var(--color-text-tertiary)' }}>Model:</span>
                <span className="ml-2" style={{ color: 'var(--color-text-primary)' }}>{provider.model_name}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-tertiary)' }}>Max Tokens:</span>
                <span className="ml-2" style={{ color: 'var(--color-text-primary)' }}>{provider.max_tokens}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-tertiary)' }}>Daily Limit:</span>
                <span className="ml-2" style={{ color: 'var(--color-text-primary)' }}>{provider.daily_request_limit}</span>
              </div>
            </div>

            {provider.last_test_at && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  Last tested: {new Date(provider.last_test_at).toLocaleString()}
                  {provider.last_test_result && (
                    <span className="ml-2">({provider.last_test_result})</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto z-50">
          <div className="rounded-lg p-6 max-w-2xl w-full" style={{ backgroundColor: 'var(--color-surface)' }}>
            <h3 className="text-lg font-semibold mb-4 capitalize" style={{ color: 'var(--color-text-primary)' }}>
              Configure {PROVIDERS.find(p => p.value === editing.provider_name)?.label}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  API Key
                </label>
                <input
                  type="password"
                  value={editing.api_key_encrypted}
                  onChange={(e) => setEditing({ ...editing, api_key_encrypted: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                  placeholder="Enter new API key to update"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  API Endpoint (Optional)
                </label>
                <input
                  type="text"
                  value={editing.api_endpoint || ''}
                  onChange={(e) => setEditing({ ...editing, api_endpoint: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                  placeholder="Leave empty for default"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  Model Name
                </label>
                <input
                  type="text"
                  value={editing.model_name}
                  onChange={(e) => setEditing({ ...editing, model_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={editing.max_tokens}
                    onChange={(e) => setEditing({ ...editing, max_tokens: parseInt(e.target.value) || 2000 })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Temperature
                  </label>
                  <input
                    type="number"
                    value={editing.temperature}
                    onChange={(e) => setEditing({ ...editing, temperature: parseFloat(e.target.value) || 0.7 })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                    min="0"
                    max="2"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Daily Limit
                  </label>
                  <input
                    type="number"
                    value={editing.daily_request_limit}
                    onChange={(e) => setEditing({ ...editing, daily_request_limit: parseInt(e.target.value) || 1000 })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                    min="1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_enabled}
                    onChange={(e) => setEditing({ ...editing, is_enabled: e.target.checked })}
                    className="rounded"
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Enabled</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_default}
                    onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
                    className="rounded"
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Set as Default</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <Button onClick={handleSave} loading={saving}>
                Save Changes
              </Button>
              <button
                onClick={() => setEditing(null)}
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
