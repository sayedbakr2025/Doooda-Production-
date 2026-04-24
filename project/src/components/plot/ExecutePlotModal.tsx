import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { AlertTriangle, X } from 'lucide-react';
import Button from '../Button';

interface ExecutePlotModalProps {
  language: 'ar' | 'en';
  onConfirm: () => void;
  onCancel: () => void;
  executing: boolean;
}

const ExecutePlotModal: React.FC<ExecutePlotModalProps> = ({
  language,
  onConfirm,
  onCancel,
  executing,
}) => {
  const { theme } = useTheme();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-md rounded-lg shadow-2xl p-6 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className={`text-xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {language === 'ar' ? 'تحذير هام' : 'Important Warning'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={executing}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`mb-6 space-y-3 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          <p className="text-lg font-semibold">
            {language === 'ar'
              ? 'تنفيذ المخطط يتم مرة واحدة فقط لكل مشروع.'
              : 'Plot execution can only be done once per project.'}
          </p>
          <p>
            {language === 'ar'
              ? 'سيتم نقل جميع الفصول والمشاهد إلى المشروع الرئيسي.'
              : 'All chapters and scenes will be transferred to the main project.'}
          </p>
          <p className="text-sm">
            {language === 'ar'
              ? 'أي تعديلات لاحقة على المخطط لن تنعكس تلقائياً ويجب نقلها يدوياً.'
              : 'Any future edits to the plot will not be reflected automatically and must be transferred manually.'}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="secondary"
            disabled={executing}
            className="flex-1"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={executing}
            className="flex-1"
          >
            {executing
              ? (language === 'ar' ? 'جاري التنفيذ...' : 'Executing...')
              : (language === 'ar' ? 'موافق، نفذ الآن' : 'OK, Execute Now')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExecutePlotModal;
