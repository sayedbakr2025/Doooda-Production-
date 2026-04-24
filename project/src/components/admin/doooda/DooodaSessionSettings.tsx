import { useEffect, useState } from 'react';
import { supabase } from '../../../services/api';

interface SessionConfig {
  id: string;
  session_memory_enabled: boolean;
  max_context_length: number;
  cooldown_seconds: number;
}

export default function DooodaSessionSettings() {
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ session_memory_enabled: true, max_context_length: 4000, cooldown_seconds: 0 });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('doooda_config')
        .select('id, session_memory_enabled, max_context_length, cooldown_seconds')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setConfig(data);
        setForm({
          session_memory_enabled: data.session_memory_enabled,
          max_context_length: data.max_context_length,
          cooldown_seconds: data.cooldown_seconds,
        });
      }
    } catch (err) {
      console.error('Failed to load session settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('doooda_config')
        .update({
          session_memory_enabled: form.session_memory_enabled,
          max_context_length: form.max_context_length,
          cooldown_seconds: form.cooldown_seconds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);
      if (error) throw error;
      setConfig({ ...config, ...form });
      setEditing(false);
    } catch (err) {
      console.error('Failed to save session settings', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;
  if (!config) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Session & Memory</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Control session memory, context length, and cooldown behavior.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.session_memory_enabled}
              onChange={(e) => setForm({ ...form, session_memory_enabled: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Session Memory Enabled</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Context Length (characters)
            </label>
            <input
              type="number"
              value={form.max_context_length}
              onChange={(e) => setForm({ ...form, max_context_length: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cooldown Between Questions (seconds, 0 = none)
            </label>
            <input
              type="number"
              value={form.cooldown_seconds}
              onChange={(e) => setForm({ ...form, cooldown_seconds: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setForm({
                  session_memory_enabled: config.session_memory_enabled,
                  max_context_length: config.max_context_length,
                  cooldown_seconds: config.cooldown_seconds,
                });
              }}
              className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Session Memory</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {config.session_memory_enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Max Context Length</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {config.max_context_length.toLocaleString()} chars
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cooldown</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {config.cooldown_seconds === 0 ? 'None' : `${config.cooldown_seconds}s`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
