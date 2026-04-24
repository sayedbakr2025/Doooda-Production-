import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, Check, X } from 'lucide-react';
import PlotTemplateEditor from './PlotTemplateEditor';
import { supabase } from '../../lib/supabaseClient';

interface PlotTemplate {
  id: string;
  name: string;
  category: 'formal' | 'thematic' | 'conflict' | 'modern' | 'hybrid';
  description: string;
  stages: any[];
  is_premium: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminPlotTemplates() {
  const [templates, setTemplates] = useState<PlotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<PlotTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plot_templates')
        .select('*')
        .order('category')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: PlotTemplate) => {
    setSelectedTemplate(template);
    setShowEditor(true);
  };

  const handleNew = () => {
    setSelectedTemplate(null);
    setShowEditor(true);
  };

  const handleSave = async (templateData: Partial<PlotTemplate>) => {
    try {
      if (templateData.id) {
        const { error } = await supabase
          .from('plot_templates')
          .update({
            name: templateData.name,
            category: templateData.category,
            description: templateData.description,
            stages: templateData.stages,
            is_premium: templateData.is_premium,
            is_active: templateData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', templateData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('plot_templates')
          .insert([{
            name: templateData.name,
            category: templateData.category,
            description: templateData.description,
            stages: templateData.stages,
            is_premium: templateData.is_premium,
            is_active: templateData.is_active,
          }]);

        if (error) throw error;
      }

      await loadTemplates();
      setShowEditor(false);
      setSelectedTemplate(null);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('plot_templates')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      await loadTemplates();
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting template:', error);
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      formal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      thematic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      conflict: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      modern: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      hybrid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    };

    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Plot Templates Manager</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage plot templates for writers
          </p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Premium
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Updated
                </th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {templates.map((template) => (
                <tr
                  key={template.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                  onClick={() => handleEdit(template)}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium dark:text-white">{template.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                      {template.description}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getCategoryBadge(template.category)}`}>
                      {template.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {template.is_premium ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                        Premium
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        Free
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {template.is_active ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Check className="w-4 h-4" />
                        <span className="text-sm">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <X className="w-4 h-4" />
                        <span className="text-sm">Inactive</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(template.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEdit(template)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      {deleteConfirm === template.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 rounded-lg transition"
                            title="Confirm Delete"
                          >
                            <Check className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition"
                            title="Cancel"
                          >
                            <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(template.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition"
                          title="Deactivate"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEditor && (
        <PlotTemplateEditor
          template={selectedTemplate}
          onClose={() => {
            setShowEditor(false);
            setSelectedTemplate(null);
          }}
          onSave={handleSave}
        />
      )}

      {deleteConfirm && (
        <div className="fixed bottom-4 right-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 dark:text-yellow-300">
                Deactivate Template?
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-400 mt-1">
                This will set is_active to false. The template will not be deleted.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
