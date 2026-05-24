import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Download, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { IdeaSlotValidation } from '../../types';
import { validateIdeaBankImport, importIdeaBankToPlot } from '../../services/api';

interface IdeaBankImportModalProps {
  bankId: string;
  projectId: string;
  onClose: () => void;
  onImported: () => void;
}

const IdeaBankImportModal: React.FC<IdeaBankImportModalProps> = ({
  bankId,
  projectId,
  onClose,
  onImported,
}) => {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const [validation, setValidation] = useState<IdeaSlotValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ chaptersCreated: number; scenesCreated: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await validateIdeaBankImport(bankId);
        if (!cancelled) setValidation(v);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Validation failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bankId]);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const res = await importIdeaBankToPlot(bankId, projectId);
      if (res.success) {
        setResult({ chaptersCreated: res.chaptersCreated, scenesCreated: res.scenesCreated });
      } else {
        setError(res.error || 'Import failed');
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const isDark = theme === 'dark';

  if (result) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`w-full max-w-md rounded-lg shadow-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {language === 'ar' ? 'تم الاستيراد بنجاح' : 'Import Successful'}
            </h3>
          </div>
          <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {language === 'ar'
              ? `تم إنشاء ${result.chaptersCreated} فصل و ${result.scenesCreated} مشهد`
              : `Created ${result.chaptersCreated} chapter(s) and ${result.scenesCreated} scene(s)`}
          </p>
          <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {language === 'ar'
              ? 'يمكنك الآن عرض المخطط في محرر المخطط'
              : 'You can now view the plot in the Plot Editor'}
          </p>
          <button
            onClick={() => { onImported(); onClose(); }}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              isDark ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {language === 'ar' ? 'تم' : 'Done'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-lg rounded-lg shadow-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {language === 'ar' ? 'استيراد إلى المخطط' : 'Import to Plot'}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {language === 'ar' ? 'جاري التحقق...' : 'Validating...'}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {validation && !loading && (
          <>
            <div className={`mb-4 p-3 rounded-lg ${
              isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-50 text-yellow-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">
                  {language === 'ar' ? 'تحذير: هذا إجراء مدمر' : 'Warning: Destructive Action'}
                </span>
              </div>
              <p className="text-sm">
                {language === 'ar'
                  ? 'سيتم استبدال جميع الفصول والمشاهد الحالية في المخطط بأفكار بنك الأفكار المُحددة. هذا الإجراء لا يمكن التراجع عنه.'
                  : 'All existing chapters and scenes in the plot will be replaced with finalized ideas from the Idea Bank. This cannot be undone.'}
              </p>
            </div>

            {!validation.canImport && (
              <div className={`mb-4 p-3 rounded-lg ${
                isDark ? 'bg-red-900 text-red-200' : 'bg-red-50 text-red-800'
              }`}>
                <p className="font-semibold mb-2">
                  {language === 'ar' ? 'لا يمكن الاستيراد' : 'Cannot Import'}
                </p>
                <p className="text-sm mb-2">
                  {language === 'ar'
                    ? `هناك ${validation.unresolvedSlots.length} فتحة بدون فكرة مُحددة (finalized):`
                    : `${validation.unresolvedSlots.length} slot(s) have no finalized idea:`}
                </p>
                <ul className="text-sm list-disc list-inside">
                  {validation.unresolvedSlots.map(s => (
                    <li key={s.slotId}>
                      {s.slotTitle || `Level ${s.level} slot`}
                      {language === 'ar' ? ` (${s.ideaCount} أفكار)` : ` (${s.ideaCount} ideas)`}
                    </li>
                  ))}
                </ul>
                <p className="text-sm mt-2">
                  {language === 'ar'
                    ? 'يرجى تحديد فكرة واحدة في كل فتحة قبل الاستيراد.'
                    : 'Please finalize one idea in each slot before importing.'}
                </p>
              </div>
            )}

            {validation.canImport && (
              <p className={`mb-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {language === 'ar'
                  ? 'جميع الفتحات لديها فكرة مُحددة. يمكنك الآن الاستيراد.'
                  : 'All slots have a finalized idea. You can proceed with the import.'}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={importing}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              {validation.canImport && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    importing
                      ? 'bg-blue-400 cursor-not-allowed text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {importing
                    ? (language === 'ar' ? 'جاري الاستيراد...' : 'Importing...')
                    : (language === 'ar' ? 'موافق، استيراد الآن' : 'OK, Import Now')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default IdeaBankImportModal;