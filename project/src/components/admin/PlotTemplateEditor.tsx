import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import Ajv from 'ajv';
import { useTheme } from '../../contexts/ThemeContext';

const ajv = new Ajv({ allErrors: true });

const plotStageSchema = {
  type: 'array',
  minItems: 1,
  items: {
    type: 'object',
    required: ['key', 'label', 'guidance', 'default_tension', 'default_pace', 'is_climax_stage'],
    properties: {
      key: {
        type: 'string',
        pattern: '^[a-z0-9_]+$',
      },
      label: {
        type: 'string',
        minLength: 1,
      },
      guidance: {
        type: 'string',
        minLength: 10,
      },
      default_tension: {
        type: 'integer',
        minimum: 1,
        maximum: 3,
      },
      default_pace: {
        type: 'integer',
        minimum: 1,
        maximum: 3,
      },
      is_climax_stage: {
        type: 'boolean',
      },
    },
    additionalProperties: false,
  },
};

const validate = ajv.compile(plotStageSchema);

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

interface Props {
  template: PlotTemplate | null;
  onClose: () => void;
  onSave: (template: Partial<PlotTemplate>) => Promise<void>;
}

export default function PlotTemplateEditor({ template, onClose, onSave }: Props) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PlotTemplate['category']>('formal');
  const [description, setDescription] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [stagesJson, setStagesJson] = useState('[]');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category);
      setDescription(template.description || '');
      setIsPremium(template.is_premium);
      setStagesJson(JSON.stringify(template.stages || [], null, 2));
      validateJson(JSON.stringify(template.stages || [], null, 2));
    }
  }, [template]);

  const validateJson = (json: string): boolean => {
    try {
      if (!json.trim()) {
        setErrors(['JSON is empty']);
        return false;
      }

      const parsed = JSON.parse(json);
      const valid = validate(parsed);

      if (!valid && validate.errors) {
        const errorMessages = validate.errors.map(err => {
          const path = err.instancePath || 'root';
          return `${path}: ${err.message}`;
        });
        setErrors(errorMessages);
        return false;
      }

      setErrors([]);
      return true;
    } catch (error: any) {
      setErrors([`JSON Parse Error: ${error.message}`]);
      return false;
    }
  };

  const handleJsonChange = (value: string | undefined) => {
    const newValue = value || '';
    setStagesJson(newValue);
    validateJson(newValue);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrors(['Template name is required']);
      return;
    }

    if (!description.trim()) {
      setErrors(['Description is required']);
      return;
    }

    const isValid = validateJson(stagesJson);

    let stages: any[] = [];
    let isActive = false;

    if (stagesJson.trim()) {
      try {
        stages = JSON.parse(stagesJson);
        if (isValid && stages.length > 0) {
          isActive = true;
        }
      } catch (error) {
        stages = [];
        isActive = false;
      }
    }

    setIsSaving(true);
    try {
      await onSave({
        id: template?.id,
        name: name.trim(),
        category,
        description: description.trim(),
        stages,
        is_premium: isPremium,
        is_active: isActive,
      });
      onClose();
    } catch (error: any) {
      setErrors([error.message || 'Failed to save template']);
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = name.trim() && description.trim() && errors.length === 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold dark:text-white">
            {template ? 'Edit Plot Template' : 'New Plot Template'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                Template Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter template name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PlotTemplate['category'])}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="formal">Formal</option>
                <option value="thematic">Thematic</option>
                <option value="conflict">Conflict</option>
                <option value="modern">Modern</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter template description"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium dark:text-gray-300">Premium Template</span>
            </label>

            <div className="flex items-center gap-2 text-sm dark:text-gray-400">
              <div className={`w-3 h-3 rounded-full ${errors.length === 0 && stagesJson.trim() ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>
                Status: {errors.length === 0 && stagesJson.trim() ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">
              Stages JSON
            </label>
            <div className="border dark:border-gray-600 rounded-lg overflow-hidden">
              <Editor
                height="400px"
                defaultLanguage="json"
                value={stagesJson}
                onChange={handleJsonChange}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  formatOnPaste: true,
                  formatOnType: true,
                }}
              />
            </div>
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-900 dark:text-red-300 mb-2">
                    Validation Errors:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-400">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
