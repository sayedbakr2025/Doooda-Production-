import { useEffect, useState } from 'react';
import { supabase } from '../../../services/api';

interface DooodaConfig {
  id: string;
  is_enabled: boolean;
  disabled_message_en: string;
  disabled_message_ar: string;
  updated_at: string;
}

export default function DooodaGlobalToggle() {
  const [config, setConfig] = useState<DooodaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMessages, setEditMessages] = useState(false);
  const [msgEn, setMsgEn] = useState('');
  const [msgAr, setMsgAr] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('doooda_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setConfig(data);
        setMsgEn(data.disabled_message_en);
        setMsgAr(data.disabled_message_ar);
      }
    } catch (err) {
      console.error('Failed to load doooda config', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async () => {
    if (!config || saving) return;
    setSaving(true);
    try {
      const newValue = !config.is_enabled;
      const { error } = await supabase
        .from('doooda_config')
        .update({ is_enabled: newValue, updated_at: new Date().toISOString() })
        .eq('id', config.id);
      if (error) throw error;
      setConfig({ ...config, is_enabled: newValue });

      await supabase.from('audit_logs').insert([{
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: newValue ? 'doooda_enabled' : 'doooda_disabled',
        resource_type: 'doooda_config',
        resource_id: config.id,
        metadata: { is_enabled: newValue },
      }]);
    } catch (err) {
      console.error('Failed to toggle', err);
    } finally {
      setSaving(false);
    }
  };

  const saveMessages = async () => {
    if (!config || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('doooda_config')
        .update({
          disabled_message_en: msgEn,
          disabled_message_ar: msgAr,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);
      if (error) throw error;
      setConfig({ ...config, disabled_message_en: msgEn, disabled_message_ar: msgAr });
      setEditMessages(false);
    } catch (err) {
      console.error('Failed to save messages', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading configuration...</div>;
  }

  if (!config) {
    return <div className="text-red-500">Configuration not found. Please check the database.</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Ask Doooda Global Toggle
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            When disabled, writers see a neutral message. No AI calls are made.
          </p>
        </div>
        <button
          onClick={toggleEnabled}
          disabled={saving}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            config.is_enabled
              ? 'bg-green-500'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
              config.is_enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-block w-2 h-2 rounded-full ${config.is_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {config.is_enabled ? 'Active' : 'Disabled'}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
          Last updated: {new Date(config.updated_at).toLocaleString()}
        </span>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Disabled Message (shown to writers)
          </h4>
          {!editMessages && (
            <button
              onClick={() => setEditMessages(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {editMessages ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">English</label>
              <textarea
                value={msgEn}
                onChange={(e) => setMsgEn(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Arabic</label>
              <textarea
                value={msgAr}
                onChange={(e) => setMsgAr(e.target.value)}
                rows={2}
                dir="rtl"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveMessages}
                disabled={saving}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditMessages(false);
                  setMsgEn(config.disabled_message_en);
                  setMsgAr(config.disabled_message_ar);
                }}
                className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">EN:</span> {config.disabled_message_en}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400" dir="rtl">
              <span className="font-medium">AR:</span> {config.disabled_message_ar}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
