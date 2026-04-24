import React, { useRef, useState, useLayoutEffect } from 'react';
import { AlertTriangle, Zap, Swords, Box, Target, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface SceneAnalysisScore {
  ai_tension: number;
  ai_pace: number;
  writer_tension?: number | null;
  writer_pace?: number | null;
  accuracy_score?: number | null;
  causality_score: number;
  dramatic_progress_score: number;
  filler_ratio: number;
  build_up_score: number;
  recommendation: string;
  comment?: string | null;
  has_climax?: boolean;
  scene_purpose?: string | null;
  is_midpoint?: boolean;
  is_climax?: boolean;
}

interface Props {
  score: SceneAnalysisScore;
  language: 'ar' | 'en';
  projectType?: string;
  anchorRef: React.RefObject<HTMLElement>;
}

const POPUP_W = 340;

function getPurposeIcon(purpose?: string | null) {
  switch (purpose) {
    case 'conflict': return <Swords className="w-3 h-3" />;
    case 'setup': return <Box className="w-3 h-3" />;
    case 'payoff': return <Target className="w-3 h-3" />;
    case 'transition': return <RefreshCw className="w-3 h-3" />;
    default: return null;
  }
}

function getPurposeLabel(purpose?: string | null, language: 'ar' | 'en' = 'en') {
  if (!purpose) return '';
  if (language === 'ar') {
    switch (purpose) {
      case 'conflict': return 'صراع';
      case 'setup': return 'تمهيد';
      case 'payoff': return 'حصاد';
      case 'transition': return 'انتقال';
      default: return purpose;
    }
  }
  return purpose.charAt(0).toUpperCase() + purpose.slice(1);
}

const SceneAnalysisPopup: React.FC<Props> = ({ score, language, anchorRef }) => {
  const { theme } = useTheme();
  const popupRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden', position: 'fixed', zIndex: 9999 });

  useLayoutEffect(() => {
    const popup = popupRef.current;
    const anchor = anchorRef.current;
    if (!popup || !anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popupH = popup.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const OFFSET = 8;

    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;

    const fitsRight = anchorRect.right + OFFSET + POPUP_W <= vw;
    const fitsLeft = anchorRect.left - OFFSET - POPUP_W >= 0;
    const fitsBelow = anchorRect.bottom + OFFSET + popupH <= vh;
    const fitsAbove = anchorRect.top - OFFSET - popupH >= 0;

    let left: number;
    let top: number;

    if (fitsRight) {
      left = anchorRect.right + OFFSET;
      top = Math.max(8, Math.min(vh - popupH - 8, anchorCenterY - popupH / 2));
    } else if (fitsLeft) {
      left = anchorRect.left - OFFSET - POPUP_W;
      top = Math.max(8, Math.min(vh - popupH - 8, anchorCenterY - popupH / 2));
    } else if (fitsBelow) {
      left = Math.max(8, Math.min(vw - POPUP_W - 8, anchorCenterX - POPUP_W / 2));
      top = anchorRect.bottom + OFFSET;
    } else if (fitsAbove) {
      left = Math.max(8, Math.min(vw - POPUP_W - 8, anchorCenterX - POPUP_W / 2));
      top = anchorRect.top - OFFSET - popupH;
    } else {
      left = Math.max(8, Math.min(vw - POPUP_W - 8, anchorCenterX - POPUP_W / 2));
      top = Math.max(8, Math.min(vh - popupH - 8, anchorCenterY - popupH / 2));
    }

    setStyle({ position: 'fixed', zIndex: 9999, left, top, width: POPUP_W, visibility: 'visible' });
  }, [anchorRef]);

  const isTheatre = false;

  return (
    <div
      ref={popupRef}
      className={`pointer-events-none p-4 rounded-xl shadow-2xl backdrop-blur-sm ${
        theme === 'dark'
          ? 'bg-gray-900 bg-opacity-97 border border-gray-700'
          : 'bg-white bg-opacity-97 border border-gray-200'
      }`}
      style={style}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
            {language === 'ar' ? 'تحليل دووودة' : 'Doooda Analysis'}
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {score.scene_purpose && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-600 text-white text-xs rounded-md">
                {getPurposeIcon(score.scene_purpose)}
                <span>{getPurposeLabel(score.scene_purpose, language)}</span>
              </div>
            )}
            {score.filler_ratio > 0.6 && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-xs rounded-md">
                <AlertTriangle className="w-3 h-3" />
                {language === 'ar' ? 'حشو' : 'Filler'}
              </div>
            )}
            {score.writer_tension != null &&
              Math.abs(score.writer_tension / 10 - score.ai_tension) > 0.4 && (
                <Zap className="w-4 h-4 text-yellow-500" />
              )}
          </div>
        </div>

        {score.comment && (
          <div className={`px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <p className={`text-xs italic ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              "{score.comment}"
            </p>
          </div>
        )}

        {score.accuracy_score != null && (
          <div className={`px-3 py-2 rounded-lg ${
            score.accuracy_score > 0.7
              ? 'bg-green-500 bg-opacity-20'
              : score.accuracy_score > 0.4
              ? 'bg-yellow-500 bg-opacity-20'
              : 'bg-red-500 bg-opacity-20'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {language === 'ar' ? 'دقة التوقعات:' : 'Accuracy:'}
              </span>
              <span className={`text-xs font-bold ${
                score.accuracy_score > 0.7
                  ? 'text-green-600 dark:text-green-400'
                  : score.accuracy_score > 0.4
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {(score.accuracy_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {language === 'ar' ? 'توتر (توقع):' : 'Tension (Expected):'}
            </span>
            <span className={`ml-1 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {score.writer_tension != null ? `${score.writer_tension}/10` : '-'}
            </span>
          </div>
          <div>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {language === 'ar' ? 'توتر (دووودة):' : 'Tension (Doooda):'}
            </span>
            <span className={`ml-1 font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
              {(score.ai_tension * 10).toFixed(1)}/10
            </span>
          </div>
          <div>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {language === 'ar' ? 'سرعة (توقع):' : 'Pace (Expected):'}
            </span>
            <span className={`ml-1 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {score.writer_pace != null ? `${score.writer_pace}/10` : '-'}
            </span>
          </div>
          <div>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {language === 'ar'
                ? (isTheatre ? 'كثافة الحوار:' : 'سرعة (دووودة):')
                : (isTheatre ? 'Dialogue Density:' : 'Pace (Doooda):')}
            </span>
            <span className={`ml-1 font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
              {(score.ai_pace * 10).toFixed(1)}/10
            </span>
          </div>
          <div>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {language === 'ar' ? 'التصعيد:' : 'Build-up:'}
            </span>
            <span className={`ml-1 font-semibold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
              {(score.build_up_score * 100).toFixed(0)}%
            </span>
          </div>
          <div>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {language === 'ar' ? 'التقدم:' : 'Progress:'}
            </span>
            <span className={`ml-1 font-semibold ${
              score.dramatic_progress_score < 0.4
                ? 'text-orange-500'
                : theme === 'dark' ? 'text-green-400' : 'text-green-600'
            }`}>
              {(score.dramatic_progress_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {score.is_midpoint && (
          <div className="px-2 py-1 rounded text-xs font-semibold bg-yellow-500 text-white text-center">
            {language === 'ar' ? 'نقطة المنتصف' : 'Midpoint'}
          </div>
        )}
        {score.is_climax && (
          <div className="px-2 py-1 rounded text-xs font-semibold bg-red-600 text-white text-center">
            {language === 'ar' ? 'الذروة الرئيسية' : 'Main Climax'}
          </div>
        )}

        {score.recommendation && (
          <div className={`pt-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {language === 'ar' ? 'توصية:' : 'Recommendation:'}
            </p>
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {score.recommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneAnalysisPopup;
