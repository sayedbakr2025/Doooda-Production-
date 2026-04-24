import React, { useState, useRef } from 'react';
import { GripVertical, Trash2, FileEdit as Edit2, Check, X, Brain } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import SceneAnalysisPopup, { SceneAnalysisScore } from './SceneAnalysisPopup';

interface PlotScene {
  id: string;
  chapter_id: string;
  order_index: number;
  title: string;
  summary: string;
  hook: string | null;
  tension_level: number | null;
  pace_level: number | null;
  has_climax: boolean;
  system_notes: string | null;
  user_notes: string | null;
}

interface PlotSceneCardProps {
  scene: PlotScene;
  onUpdate: (updates: Partial<PlotScene>) => void;
  onDelete: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onDragEnd: (e: React.MouseEvent) => void;
  isDragging: boolean;
  unitLabel: string;
  language: 'ar' | 'en';
  analysisScore?: SceneAnalysisScore;
}

const PlotSceneCard: React.FC<PlotSceneCardProps> = ({
  scene,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  unitLabel,
  language,
  analysisScore,
}) => {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const analysisIconRef = useRef<HTMLButtonElement>(null);
  const [editedTitle, setEditedTitle] = useState(scene.title);
  const [editedSummary, setEditedSummary] = useState(scene.summary);
  const [editedHook, setEditedHook] = useState(scene.hook || '');
  const [editedTension, setEditedTension] = useState(scene.tension_level || 5);
  const [editedPace, setEditedPace] = useState(scene.pace_level || 5);
  const [editedClimax, setEditedClimax] = useState(scene.has_climax);

  const isRTL = language === 'ar';

  const noSummaryLabel = isRTL ? 'لا يوجد ملخص' : 'No summary';
  const summaryPlaceholder = isRTL ? 'ملخص' : 'Summary';
  const hookPlaceholder = isRTL ? 'الخطاف (Hook)' : 'Hook';
  const tensionLabel = isRTL ? 'التوتر' : 'Tension';
  const paceLabel = isRTL ? 'السرعة' : 'Pace';
  const climaxLabel = isRTL ? 'يحتوي على ذروة' : 'Contains climax';
  const deleteConfirmLabel = isRTL
    ? `هل أنت متأكد من حذف هذا ال${unitLabel}؟`
    : `Are you sure you want to delete this ${unitLabel}?`;

  const handleSave = () => {
    onUpdate({
      title: editedTitle,
      summary: editedSummary,
      hook: editedHook || null,
      tension_level: editedTension,
      pace_level: editedPace,
      has_climax: editedClimax,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTitle(scene.title);
    setEditedSummary(scene.summary);
    setEditedHook(scene.hook || '');
    setEditedTension(scene.tension_level || 5);
    setEditedPace(scene.pace_level || 5);
    setEditedClimax(scene.has_climax);
    setIsEditing(false);
  };

  return (
    <div
      className={`relative rounded-lg border p-3 flex flex-col ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700 shadow-md'
          : 'bg-white border-gray-200 shadow-md'
      }`}
      style={{
        height: isEditing ? '320px' : '200px',
        overflow: 'hidden',
        transition: 'height 0.3s ease-in-out'
      }}
    >
      <div
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing"
        onMouseDown={onDragStart}
        onMouseUp={onDragEnd}
      >
        <GripVertical className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
      </div>

      <div className="flex items-start justify-between mb-2 ml-5">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}>
              {unitLabel} {scene.order_index}
            </span>
            {scene.has_climax && (
              <span className="text-xs">🔥</span>
            )}
          </div>

          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className={`w-full px-2 py-1 text-xs font-medium rounded border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h4 className={`text-xs font-medium ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {scene.title}
            </h4>
          )}
        </div>

        <div className="flex items-center gap-1">
          {analysisScore && (
            <button
              ref={analysisIconRef}
              onClick={(e) => { e.stopPropagation(); setShowAnalysis(v => !v); }}
              onMouseEnter={() => setShowAnalysis(true)}
              onMouseLeave={() => setShowAnalysis(false)}
              className={`p-1 rounded transition-colors ${
                showAnalysis
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : 'hover:bg-blue-50 dark:hover:bg-blue-950'
              }`}
              title={language === 'ar' ? 'تحليل دووودة' : 'Doooda Analysis'}
            >
              <Brain className={`w-3 h-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </button>
          )}
          {isEditing ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900"
              >
                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
              >
                <X className="w-3 h-3 text-red-600 dark:text-red-400" />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Edit2 className={`w-3 h-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(deleteConfirmLabel)) {
                onDelete();
              }
            }}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
          >
            <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-2" style={{ minHeight: '60px', maxHeight: isEditing ? '150px' : '100px' }}>
        {isEditing ? (
          <>
            <textarea
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              className={`w-full px-2 py-1 text-xs rounded border resize-none mb-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-gray-300'
                  : 'bg-gray-50 border-gray-300 text-gray-700'
              }`}
              rows={2}
              placeholder={summaryPlaceholder}
              onClick={(e) => e.stopPropagation()}
            />
            <textarea
              value={editedHook}
              onChange={(e) => setEditedHook(e.target.value)}
              className={`w-full px-2 py-1 text-xs rounded border resize-none mb-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-gray-300'
                  : 'bg-gray-50 border-gray-300 text-gray-700'
              }`}
              rows={2}
              placeholder={hookPlaceholder}
              onClick={(e) => e.stopPropagation()}
            />

            <div className="space-y-2 mt-2">
              <div>
                <label className={`text-xs flex items-center justify-between mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span>{tensionLabel}: {editedTension}/10</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={editedTension}
                  onChange={(e) => setEditedTension(Number(e.target.value))}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-1 bg-blue-200 dark:bg-blue-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className={`text-xs flex items-center justify-between mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span>{paceLabel}: {editedPace}/10</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={editedPace}
                  onChange={(e) => setEditedPace(Number(e.target.value))}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-1 bg-green-200 dark:bg-green-900 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editedClimax}
                  onChange={(e) => setEditedClimax(e.target.checked)}
                  className="w-3 h-3 rounded accent-red-500"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {climaxLabel} 🔥
                </span>
              </label>
            </div>
          </>
        ) : (
          <>
            <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {scene.summary || noSummaryLabel}
            </p>
            {scene.hook && (
              <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                🎣 {scene.hook}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs mt-auto">
        <div className="flex items-center gap-1 flex-1">
          <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>T:</span>
          <div className="flex-1 h-1 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 dark:bg-blue-400"
              style={{ width: `${((scene.tension_level || 5) / 10) * 100}%` }}
            />
          </div>
          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {scene.tension_level || 5}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-1">
          <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>P:</span>
          <div className="flex-1 h-1 bg-green-200 dark:bg-green-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 dark:bg-green-400"
              style={{ width: `${((scene.pace_level || 5) / 10) * 100}%` }}
            />
          </div>
          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {scene.pace_level || 5}
          </span>
        </div>
      </div>

      {showAnalysis && analysisScore && analysisIconRef.current && createPortal(
        <SceneAnalysisPopup
          score={analysisScore}
          language={language}
          anchorRef={analysisIconRef as React.RefObject<HTMLElement>}
        />,
        document.body
      )}
    </div>
  );
};

export default PlotSceneCard;
