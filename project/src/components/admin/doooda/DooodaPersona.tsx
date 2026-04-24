import { useEffect, useState } from 'react';
import { supabase } from '../../../services/api';

interface PersonaVersion {
  id: string;
  version: number;
  persona_prompt_en: string;
  persona_prompt_ar: string;
  guardrails_en: string;
  guardrails_ar: string;
  is_active: boolean;
  is_locked: boolean;
  created_at: string;
  notes: string;
}

export default function DooodaPersona() {
  const [versions, setVersions] = useState<PersonaVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<PersonaVersion | null>(null);
  const [newVersion, setNewVersion] = useState({
    persona_prompt_en: '',
    persona_prompt_ar: '',
    guardrails_en: '',
    guardrails_ar: '',
    notes: '',
  });

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('doooda_persona_versions')
        .select('*')
        .order('version', { ascending: false });
      if (error) throw error;
      setVersions(data || []);
    } catch (err) {
      console.error('Failed to load persona versions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version)) + 1 : 1;
      const user = (await supabase.auth.getUser()).data.user;

      const { error } = await supabase
        .from('doooda_persona_versions')
        .insert([{
          version: nextVersion,
          persona_prompt_en: newVersion.persona_prompt_en,
          persona_prompt_ar: newVersion.persona_prompt_ar,
          guardrails_en: newVersion.guardrails_en,
          guardrails_ar: newVersion.guardrails_ar,
          notes: newVersion.notes,
          is_active: false,
          is_locked: false,
          created_by: user?.id,
        }]);
      if (error) throw error;

      await supabase.from('audit_logs').insert([{
        admin_id: user?.id,
        action: 'doooda_persona_created',
        resource_type: 'doooda_persona_versions',
        metadata: { version: nextVersion },
      }]);

      setCreating(false);
      setNewVersion({ persona_prompt_en: '', persona_prompt_ar: '', guardrails_en: '', guardrails_ar: '', notes: '' });
      loadVersions();
    } catch (err) {
      console.error('Failed to create version', err);
    } finally {
      setSaving(false);
    }
  };

  const activateVersion = async (version: PersonaVersion) => {
    if (saving) return;
    setSaving(true);
    try {
      await supabase
        .from('doooda_persona_versions')
        .update({ is_active: false })
        .eq('is_active', true);

      const { error } = await supabase
        .from('doooda_persona_versions')
        .update({ is_active: true })
        .eq('id', version.id);
      if (error) throw error;

      await supabase.from('audit_logs').insert([{
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'doooda_persona_activated',
        resource_type: 'doooda_persona_versions',
        resource_id: version.id,
        metadata: { version: version.version },
      }]);

      loadVersions();
    } catch (err) {
      console.error('Failed to activate version', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleLock = async (version: PersonaVersion) => {
    try {
      const { error } = await supabase
        .from('doooda_persona_versions')
        .update({ is_locked: !version.is_locked })
        .eq('id', version.id);
      if (error) throw error;
      loadVersions();
    } catch (err) {
      console.error('Failed to toggle lock', err);
    }
  };

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading persona versions...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Persona & Guardrails</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Versioned persona prompts and guardrails. Only one version can be active at a time.
            Locked versions cannot be accidentally edited.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          New Version
        </button>
      </div>

      <div className="space-y-3">
        {versions.map((v) => (
          <div
            key={v.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow p-5 border ${
              v.is_active
                ? 'border-green-400 dark:border-green-500'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  v{v.version}
                </span>
                {v.is_active && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">
                    Active
                  </span>
                )}
                {v.is_locked && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200">
                    Locked
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(v.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewing(v)}
                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  View
                </button>
                {!v.is_active && (
                  <button
                    onClick={() => activateVersion(v)}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50"
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={() => toggleLock(v)}
                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  {v.is_locked ? 'Unlock' : 'Lock'}
                </button>
              </div>
            </div>
            {v.notes && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{v.notes}</p>
            )}
          </div>
        ))}

        {versions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No persona versions yet. Create your first version to get started.
          </div>
        )}
      </div>

      {creating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full shadow-xl my-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Persona Version</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Persona Prompt (English)
                </label>
                <textarea
                  value={newVersion.persona_prompt_en}
                  onChange={(e) => setNewVersion({ ...newVersion, persona_prompt_en: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Persona Prompt (Arabic)
                </label>
                <textarea
                  value={newVersion.persona_prompt_ar}
                  onChange={(e) => setNewVersion({ ...newVersion, persona_prompt_ar: e.target.value })}
                  rows={5}
                  dir="rtl"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Guardrails (English)
                </label>
                <textarea
                  value={newVersion.guardrails_en}
                  onChange={(e) => setNewVersion({ ...newVersion, guardrails_en: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Guardrails (Arabic)
                </label>
                <textarea
                  value={newVersion.guardrails_ar}
                  onChange={(e) => setNewVersion({ ...newVersion, guardrails_ar: e.target.value })}
                  rows={3}
                  dir="rtl"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={newVersion.notes}
                  onChange={(e) => setNewVersion({ ...newVersion, notes: e.target.value })}
                  placeholder="What changed in this version?"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Version'}
              </button>
              <button
                onClick={() => setCreating(false)}
                className="flex-1 px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full shadow-xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Version {viewing.version}
              </h3>
              <button
                onClick={() => setViewing(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <Section title="Persona (EN)" content={viewing.persona_prompt_en} />
              <Section title="Persona (AR)" content={viewing.persona_prompt_ar} dir="rtl" />
              <Section title="Guardrails (EN)" content={viewing.guardrails_en} />
              <Section title="Guardrails (AR)" content={viewing.guardrails_ar} dir="rtl" />
              {viewing.notes && <Section title="Notes" content={viewing.notes} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, content, dir }: { title: string; content: string; dir?: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">{title}</h4>
      <pre
        dir={dir}
        className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 whitespace-pre-wrap font-mono overflow-x-auto"
      >
        {content || '(empty)'}
      </pre>
    </div>
  );
}
