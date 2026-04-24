import React, { useState, useRef } from 'react';
import { GripVertical, Trash2, Plus, FileEdit as Edit2, Check, X, Brain } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import SceneAnalysisPopup, { SceneAnalysisScore } from './SceneAnalysisPopup';

interface PlotChapter {
  id: string;
  plot_project_id: string;
  order_index: number;
  title: string;
  summary: string;
  goal: string | null;
  tension_level: number | null;
  pace_level: number | null;
  has_climax: boolean;
  system_notes: string | null;
  user_notes: string | null;
}

interface PlotChapterCardProps {
  chapter: PlotChapter;
  onUpdate: (updates: Partial<PlotChapter>) => void;
  onDelete: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onDragEnd: (e: React.MouseEvent) => void;
  onAddScene: () => void;
  isDragging: boolean;
  containerLabel: string;
  unitLabel: string;
  addUnitLabel: string;
  hasLevel2: boolean;
  language: 'ar' | 'en';
  analysisScore?: SceneAnalysisScore;
}

const PlotChapterCard: React.FC<PlotChapterCardProps> = ({
  chapter,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onAddScene,
  containerLabel,
  addUnitLabel,
  hasLevel2,
  language,
  analysisScore,
}) => {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const analysisIconRef = useRef<HTMLButtonElement>(null);
  const [editedTitle, setEditedTitle] = useState(chapter.title);
  const [editedSummary, setEditedSummary] = useState(chapter.summary);

  const isRTL = language === 'ar';

  const handleSave = () => {
    onUpdate({
      title: editedTitle,
      summary: editedSummary,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTitle(chapter.title);
    setEditedSummary(chapter.summary);
    setIsEditing(false);
  };

  const climaxLabel = isRTL ? 'ذروة' : 'Climax';
  const noSummaryLabel = isRTL ? 'لا يوجد ملخص' : 'No summary';
  const tensionLabel = isRTL ? 'التوتر' : 'Tension';
  const paceLabel = isRTL ? 'السرعة' : 'Pace';
  const containsClimaxLabel = isRTL
    ? `${containerLabel} يحتوي على ذروة`
    : `This ${containerLabel} contains a climax`;
  const deleteConfirmLabel = isRTL
    ? `هل أنت متأكد من حذف هذا ال${containerLabel}؟`
    : `Are you sure you want to delete this ${containerLabel}?`;

  return (
    <div
      className={`relative rounded-lg border-2 p-4 ${
        theme === 'dark'
          ? 'bg-gray-800 border-blue-500 shadow-lg shadow-blue-500/20'
          : 'bg-white border-blue-400 shadow-lg shadow-blue-400/20'
      }`}
      style={{ minHeight: hasLevel2 ? '280px' : '240px' }}
    >
      <div
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing"
        onMouseDown={onDragStart}
        onMouseUp={onDragEnd}
      >
        <GripVertical className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
      </div>

      <div className="flex items-start justify-between mb-3 ml-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-1 rounded ${
              theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
            }`}>
              {containerLabel} {chapter.order_index}
            </span>
            {chapter.has_climax && (
              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'
              }`}>
                {climaxLabel}
              </span>
            )}
          </div>

          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className={`w-full px-2 py-1 text-sm font-semibold rounded border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 className={`text-sm font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {chapter.title}
            </h3>
          )}
        </div>

        <div className="flex items-center gap-1 ml-2">
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
              <Brain className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </button>
          )}
          {isEditing ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
              >
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
              >
                <X className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Edit2 className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(deleteConfirmLabel)) {
                onDelete();
              }
            }}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <textarea
          value={editedSummary}
          onChange={(e) => setEditedSummary(e.target.value)}
          className={`w-full px-2 py-1 text-xs rounded border resize-none ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-gray-300'
              : 'bg-gray-50 border-gray-300 text-gray-700'
          }`}
          rows={3}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {chapter.summary || noSummaryLabel}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            {tensionLabel}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={chapter.tension_level || 5}
            onChange={(e) => {
              e.stopPropagation();
              onUpdate({ tension_level: parseInt(e.target.value) });
            }}
            className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-blue-200 dark:bg-blue-900"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="text-xs text-center text-gray-500">{chapter.tension_level || 5}/10</div>
        </div>

        <div>
          <label className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            {paceLabel}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={chapter.pace_level || 5}
            onChange={(e) => {
              e.stopPropagation();
              onUpdate({ pace_level: parseInt(e.target.value) });
            }}
            className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-green-200 dark:bg-green-900"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="text-xs text-center text-gray-500">{chapter.pace_level || 5}/10</div>
        </div>
      </div>

      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={chapter.has_climax}
          onChange={(e) => {
            e.stopPropagation();
            onUpdate({ has_climax: e.target.checked });
          }}
          className="rounded"
          onClick={(e) => e.stopPropagation()}
        />
        <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {containsClimaxLabel}
        </span>
      </label>

      {hasLevel2 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddScene();
          }}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded border-2 border-dashed transition-colors ${
            theme === 'dark'
              ? 'border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-400'
              : 'border-gray-300 hover:border-blue-400 text-gray-600 hover:text-blue-600'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs font-medium">{addUnitLabel}</span>
        </button>
      )}

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

export default PlotChapterCard;
