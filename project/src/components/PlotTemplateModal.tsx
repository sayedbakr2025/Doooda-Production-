import { useState, useEffect } from 'react';
import { X, LayoutTemplate as BookTemplate, Crown, Info, AlertTriangle, Lock } from 'lucide-react';
import { getPlotTemplates } from '../services/api';
import Button from './Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface PlotTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  is_premium: boolean;
  stages: any[];
}

interface PlotTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onApply: (templateId: string, chapterCount: number) => Promise<void>;
}

const PlotTemplateModal: React.FC<PlotTemplateModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<PlotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<PlotTemplate | null>(null);
  const [chapterCount, setChapterCount] = useState<number>(10);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [applying, setApplying] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');

  const hasPaidPlan = userPlan !== 'free';

  const categories = [
    { key: 'all', label: 'الكل', labelAr: 'الكل' },
    { key: 'formal', label: 'الكلاسيكية', labelAr: 'الكلاسيكية' },
    { key: 'conflict', label: 'الصراعية', labelAr: 'الصراعية' },
    { key: 'thematic', label: 'الموضوعية', labelAr: 'الموضوعية' },
    { key: 'modern', label: 'الحديثة', labelAr: 'الحديثة' },
    { key: 'hybrid', label: 'المركبة', labelAr: 'المركبة' },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetchUserPlan();
    }
  }, [isOpen, user]);

  const fetchUserPlan = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle();
    if (data?.plan) setUserPlan(data.plan);
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await getPlotTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template: PlotTemplate) => {
    if (template.is_premium && !hasPaidPlan) return;
    setSelectedTemplate(template);
    setChapterCount(10);
    setShowConfirmation(false);
  };

  const isTemplateLocked = (template: PlotTemplate) => {
    return template.is_premium && !hasPaidPlan;
  };

  const handleConfirm = () => {
    setShowConfirmation(true);
  };

  const handleApply = async () => {
    if (!selectedTemplate) return;
    try {
      setApplying(true);
      await onApply(selectedTemplate.id, chapterCount);
      onClose();
    } catch (error) {
      console.error('Error applying template:', error);
      alert('حدث خطأ أثناء تطبيق القالب');
    } finally {
      setApplying(false);
    }
  };

  const handleCancel = () => {
    setSelectedTemplate(null);
    setShowConfirmation(false);
    setChapterCount(10);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <BookTemplate className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              نماذج الحبكات الجاهزة
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!selectedTemplate ? (
          <>
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat.key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {cat.label}
                    {cat.key === 'hybrid' && (
                      <Crown className="w-3 h-3 inline-block mr-1 text-amber-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">جاري التحميل...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => {
                    const isLocked = isTemplateLocked(template);
                    return (
                      <div
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className={`border rounded-xl p-5 transition-all relative overflow-hidden ${
                          isLocked
                            ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-base text-gray-900 dark:text-white leading-snug flex-1 ml-2">
                            {template.name}
                          </h3>
                          {template.is_premium && (
                            <span className="shrink-0 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow">
                              <Crown className="w-3 h-3" />
                              بريميوم
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4">
                          {template.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                            {template.stages.length} مراحل
                          </span>
                          {isLocked ? (
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              يتطلب ترقية
                            </span>
                          ) : (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              اختر هذا القالب ←
                            </span>
                          )}
                        </div>

                        {isLocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-gray-900/40 rounded-xl">
                            <div className="bg-white dark:bg-gray-700 rounded-full p-2.5 shadow-lg">
                              <Lock className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <Info className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">لا توجد نماذج في هذا التصنيف</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-2xl mx-auto">
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedTemplate.name}
                  </h3>
                  {selectedTemplate.is_premium && (
                    <span className="shrink-0 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow mr-3">
                      <Crown className="w-3 h-3" />
                      بريميوم
                    </span>
                  )}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm leading-relaxed">
                  {selectedTemplate.description}
                </p>
                <span className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-3 py-1 rounded-md">
                  عدد المراحل: {selectedTemplate.stages.length}
                </span>
              </div>

              {!showConfirmation ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      عدد الفصول المطلوبة
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={chapterCount}
                      onChange={(e) => setChapterCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      سيتم توزيع {selectedTemplate.stages.length} مراحل على {chapterCount} فصل
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleConfirm} variant="primary" className="flex-1">
                      متابعة
                    </Button>
                    <Button onClick={handleCancel} variant="secondary" className="flex-1">
                      إلغاء
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-red-900 dark:text-red-200 mb-2">
                          تحذير: سيتم استبدال الفصول الحالية
                        </h4>
                        <p className="text-red-700 dark:text-red-300 text-sm leading-relaxed">
                          تطبيق هذا القالب سيؤدي إلى حذف جميع الفصول الحالية واستبدالها بفصول جديدة. هذا الإجراء لا يمكن التراجع عنه.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">القالب:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedTemplate.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">عدد المراحل:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedTemplate.stages.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">عدد الفصول:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{chapterCount}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleApply}
                      variant="primary"
                      disabled={applying}
                      className="flex-1 bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
                    >
                      {applying ? 'جاري التطبيق...' : 'نعم، استبدل الفصول'}
                    </Button>
                    <Button
                      onClick={() => setShowConfirmation(false)}
                      variant="secondary"
                      disabled={applying}
                      className="flex-1"
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlotTemplateModal;
