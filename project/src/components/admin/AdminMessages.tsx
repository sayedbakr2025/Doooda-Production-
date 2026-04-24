import { useEffect, useState } from 'react';
import { supabase } from '../../services/api';
import Button from '../Button';

interface MessageTemplate {
  id: string;
  template_key: string;
  template_name: string;
  trigger_type: string | null;
  subject_en?: string;
  subject_ar?: string;
  content_en: string;
  content_ar: string;
  html_content_en?: string;
  html_content_ar?: string;
  is_enabled: boolean;
}

const TRIGGER_TYPES = [
  { value: 'paid_subscription', label: 'Paid Subscription' },
  { value: 'upgrade_subscription', label: 'Upgrade Subscription' },
  { value: 'downgrade_subscription', label: 'Downgrade Subscription' },
  { value: 'close_account', label: 'Close Account' },
  { value: 'book_completed_free', label: 'Book Completed (Free Plan)' },
];

export default function AdminMessages() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const { data, error: fetchError } = await supabase
        .from('message_templates')
        .select('*')
        .order('template_key', { ascending: true });

      if (fetchError) throw fetchError;
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load message templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    setSaving(true);
    try {
      const updateData = {
        template_name: editingTemplate.template_name,
        trigger_type: editingTemplate.trigger_type,
        subject_en: editingTemplate.subject_en,
        subject_ar: editingTemplate.subject_ar,
        content_en: editingTemplate.content_en,
        content_ar: editingTemplate.content_ar,
        html_content_en: editingTemplate.html_content_en,
        html_content_ar: editingTemplate.html_content_ar,
        is_enabled: editingTemplate.is_enabled,
        updated_at: new Date().toISOString()
      };

      const { error } = editingTemplate.id
        ? await supabase
            .from('message_templates')
            .update(updateData)
            .eq('id', editingTemplate.id)
        : await supabase
            .from('message_templates')
            .insert([{ ...updateData, template_key: editingTemplate.template_key }]);

      if (error) throw error;

      setEditingTemplate(null);
      setCreating(false);
      loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = () => {
    setCreating(true);
    setEditingTemplate({
      id: '',
      template_key: '',
      template_name: '',
      trigger_type: null,
      subject_en: '',
      subject_ar: '',
      content_en: '',
      content_ar: '',
      html_content_en: '',
      html_content_ar: '',
      is_enabled: true
    });
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
        <span style={{ color: 'var(--color-text-secondary)' }}>Loading templates...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Message Templates</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Create and manage email templates with triggers
          </p>
        </div>
        <Button onClick={handleCreateNew}>+ New Template</Button>
      </div>

      {error && (
        <div
          className="rounded-lg p-4 mb-4 text-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
        >
          {error}
        </div>
      )}

      <div className="space-y-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-lg shadow p-6"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {template.template_name || template.template_key}
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  {template.subject_en || 'No subject'}
                </p>
                {template.trigger_type && (
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}>
                    {TRIGGER_TYPES.find(t => t.value === template.trigger_type)?.label || template.trigger_type}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 text-xs rounded-full`}
                  style={{
                    backgroundColor: template.is_enabled ? 'color-mix(in srgb, var(--color-success) 15%, transparent)' : 'color-mix(in srgb, var(--color-text-tertiary) 15%, transparent)',
                    color: template.is_enabled ? 'var(--color-success)' : 'var(--color-text-tertiary)'
                  }}
                >
                  {template.is_enabled ? 'Active' : 'Inactive'}
                </span>
                <Button onClick={() => { setEditingTemplate(template); setCreating(false); }}>Edit</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  English Version
                </div>
                <div className="text-sm line-clamp-3" style={{ color: 'var(--color-text-tertiary)' }}>
                  {template.html_content_en ? 'HTML Content' : template.content_en}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Arabic Version
                </div>
                <div className="text-sm line-clamp-3" style={{ color: 'var(--color-text-tertiary)' }} dir="rtl">
                  {template.html_content_ar ? 'محتوى HTML' : template.content_ar}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto z-50">
          <div className="rounded-lg p-6 max-w-5xl w-full my-8" style={{ backgroundColor: 'var(--color-surface)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {creating ? 'Create New Template' : `Edit Template: ${editingTemplate.template_name}`}
            </h3>

            <div className="space-y-6">
              {creating && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Template Key (unique identifier)
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.template_key}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, template_key: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                    placeholder="e.g., welcome_email"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  Template Name
                </label>
                <input
                  type="text"
                  value={editingTemplate.template_name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, template_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={labelStyle}>
                  Email Trigger
                </label>
                <select
                  value={editingTemplate.trigger_type || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, trigger_type: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                >
                  <option value="">No trigger (manual only)</option>
                  {TRIGGER_TYPES.map(trigger => (
                    <option key={trigger.value} value={trigger.value}>{trigger.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Subject (English)
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.subject_en || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    Subject (Arabic)
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.subject_ar || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject_ar: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    HTML Content (English)
                  </label>
                  <textarea
                    value={editingTemplate.html_content_en || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, html_content_en: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                    style={inputStyle}
                    placeholder="<html>..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={labelStyle}>
                    HTML Content (Arabic)
                  </label>
                  <textarea
                    value={editingTemplate.html_content_ar || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, html_content_ar: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                    style={inputStyle}
                    placeholder="<html dir='rtl'>..."
                    dir="rtl"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingTemplate.is_enabled}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, is_enabled: e.target.checked })}
                  className="rounded"
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Template Active</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <Button onClick={handleSaveTemplate} loading={saving}>
                Save Changes
              </Button>
              <button
                onClick={() => { setEditingTemplate(null); setCreating(false); }}
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
