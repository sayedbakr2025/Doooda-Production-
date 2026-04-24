import { useState, useEffect } from 'react';
import { getProjectTypeSettings, updateProjectTypeSetting } from '../../services/api';
import type { ProjectTypeSetting } from '../../types';
import { getProjectTypeConfig } from '../../utils/projectTypeConfig';

export default function AdminProjectTypes() {
  const [settings, setSettings] = useState<ProjectTypeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [modelInput, setModelInput] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await getProjectTypeSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load project type settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleEnabled(projectType: string, current: boolean) {
    setSaving(projectType);
    try {
      await updateProjectTypeSetting(projectType, { is_enabled: !current });
      setSettings(prev => prev.map(s => s.project_type === projectType ? { ...s, is_enabled: !current } : s));
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setSaving(null);
    }
  }

  async function saveModel(projectType: string) {
    setSaving(projectType);
    try {
      await updateProjectTypeSetting(projectType, { ai_model_override: modelInput.trim() || null });
      setSettings(prev => prev.map(s => s.project_type === projectType ? { ...s, ai_model_override: modelInput.trim() || null } : s));
      setEditingModel(null);
    } catch (err) {
      console.error('Failed to update model:', err);
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        Project Types
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-tertiary)' }}>
        Enable or disable project types and optionally override the AI model per type.
      </p>

      <div className="space-y-3">
        {settings.map((setting) => {
          const cfg = getProjectTypeConfig(setting.project_type as any);
          const isEditingThisModel = editingModel === setting.project_type;
          const isSavingThis = saving === setting.project_type;

          return (
            <div
              key={setting.project_type}
              className="rounded-xl p-5 flex items-center gap-4"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: `1px solid var(--color-border-light)`,
                opacity: setting.is_enabled ? 1 : 0.6,
              }}
            >
              <span className="text-3xl shrink-0">{cfg.icon}</span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {setting.display_name_ar} / {setting.display_name_en}
                  </h4>
                  <code className="px-1.5 py-0.5 text-xs rounded font-mono" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                    {setting.project_type}
                  </code>
                </div>
                {setting.description_ar && (
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {setting.description_ar}
                  </p>
                )}

                <div className="mt-2">
                  {isEditingThisModel ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={modelInput}
                        onChange={(e) => setModelInput(e.target.value)}
                        placeholder="e.g. gpt-4o-mini, deepseek-chat (blank = default)"
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                      <button
                        onClick={() => saveModel(setting.project_type)}
                        disabled={isSavingThis}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg text-white"
                        style={{ backgroundColor: 'var(--color-accent)' }}
                      >
                        {isSavingThis ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingModel(null)}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg"
                        style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-tertiary)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingModel(setting.project_type);
                        setModelInput(setting.ai_model_override || '');
                      }}
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                    >
                      AI Model: {setting.ai_model_override || 'default'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-medium" style={{ color: setting.is_enabled ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}>
                  {setting.is_enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={() => toggleEnabled(setting.project_type, setting.is_enabled)}
                  disabled={isSavingThis}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                  style={{
                    backgroundColor: setting.is_enabled ? 'var(--color-success)' : 'var(--color-border)',
                  }}
                >
                  <span
                    className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    style={{ transform: setting.is_enabled ? 'translateX(24px)' : 'translateX(4px)' }}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Disabling a project type prevents new projects from being created with that type. Existing projects are not affected.
          The AI model override applies to analyze-plot for that project type. Leave blank to use the global default.
        </p>
      </div>
    </div>
  );
}
