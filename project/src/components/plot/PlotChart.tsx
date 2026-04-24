import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getProjectTypeConfig } from '../../utils/projectTypeConfig';
import type { ProjectType } from '../../types';

interface ChapterScore {
  chapter_index: number;
  score: number;
  recommendation: string;
}

interface SceneScore {
  chapter_index: number;
  scene_index: number;
  score: number;
  recommendation: string;
}

interface PlotChartProps {
  chapterScores: ChapterScore[];
  sceneScores: SceneScore[];
  language: 'ar' | 'en';
  projectType?: ProjectType;
}

interface TooltipPopupProps {
  tooltipRef: React.RefObject<HTMLDivElement>;
  tooltip: { x: number; y: number; content: string; score: number };
  theme: string;
  getScoreColorClass: (score: number) => string;
}

const TOOLTIP_OFFSET = 14;
const TOOLTIP_WIDTH = 280;

const TooltipPopup: React.FC<TooltipPopupProps> = ({ tooltipRef, tooltip, theme, getScoreColorClass }) => {
  const [style, setStyle] = React.useState<React.CSSProperties>({ visibility: 'hidden', position: 'fixed', zIndex: 50 });

  React.useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;

    const height = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const fitsRight = tooltip.x + TOOLTIP_OFFSET + TOOLTIP_WIDTH <= vw;
    const fitsBelow = tooltip.y + TOOLTIP_OFFSET + height <= vh;

    const left = fitsRight
      ? tooltip.x + TOOLTIP_OFFSET
      : tooltip.x - TOOLTIP_OFFSET - TOOLTIP_WIDTH;

    const top = fitsBelow
      ? tooltip.y + TOOLTIP_OFFSET
      : tooltip.y - TOOLTIP_OFFSET - height;

    setStyle({
      position: 'fixed',
      zIndex: 50,
      left: Math.max(8, left),
      top: Math.max(8, top),
      visibility: 'visible',
      width: TOOLTIP_WIDTH,
    });
  }, [tooltip.x, tooltip.y, tooltipRef]);

  return (
    <div
      ref={tooltipRef}
      className={`p-3 rounded-lg shadow-xl pointer-events-none ${
        theme === 'dark' ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
      }`}
      style={style}
    >
      <div className={`text-xs font-semibold mb-2 px-2 py-1 rounded inline-block ${getScoreColorClass(tooltip.score)}`}>
        {(tooltip.score * 100).toFixed(0)}%
      </div>
      <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
        {tooltip.content}
      </p>
    </div>
  );
};

const PlotChart: React.FC<PlotChartProps> = ({ chapterScores, sceneScores, language, projectType }) => {
  const typeConfig = getProjectTypeConfig(projectType ?? 'novel');
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
    score: number;
  } | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const PADDING = 60;
  const BOTTOM_PADDING = 70;
  const CHART_HEIGHT = 420;

  useEffect(() => {
    drawChart();
  }, [chapterScores, sceneScores, theme, hoverX]);

  const getScoreColor = (score: number): string => {
    if (score >= 0.75) {
      return theme === 'dark' ? '#60a5fa' : '#3b82f6'; // Blue
    } else if (score >= 0.45) {
      return theme === 'dark' ? '#fbbf24' : '#f59e0b'; // Yellow
    } else {
      return theme === 'dark' ? '#ef4444' : '#dc2626'; // Red
    }
  };

  const getGradient = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, score1: number, score2: number) => {
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, getScoreColor(score1));
    gradient.addColorStop(1, getScoreColor(score2));
    return gradient;
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Group scenes by chapter
    const groupedScenes = new Map<number, SceneScore[]>();
    sceneScores.forEach(scene => {
      if (!groupedScenes.has(scene.chapter_index)) {
        groupedScenes.set(scene.chapter_index, []);
      }
      groupedScenes.get(scene.chapter_index)!.push(scene);
    });

    // Calculate total scenes for width
    const totalScenes = sceneScores.length;
    const sceneSpacing = 60;
    const chapterGap = 30;
    const sortedChapters = [...chapterScores].sort((a, b) => a.chapter_index - b.chapter_index);
    const numChapters = sortedChapters.length;

    const width = Math.max(800, totalScenes * sceneSpacing + (numChapters - 1) * chapterGap + PADDING * 2);

    canvas.width = width * dpr;
    canvas.height = CHART_HEIGHT * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${CHART_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, CHART_HEIGHT);

    // Background grid
    ctx.strokeStyle = theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = PADDING + (CHART_HEIGHT - PADDING - BOTTOM_PADDING) * (i / 10);
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(width - PADDING, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = theme === 'dark' ? '#9ca3af' : '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${100 - i * 10}%`, PADDING - 10, y + 4);
    }

    // X-axis
    ctx.strokeStyle = theme === 'dark' ? '#4b5563' : '#d1d5db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PADDING, CHART_HEIGHT - BOTTOM_PADDING);
    ctx.lineTo(width - PADDING, CHART_HEIGHT - BOTTOM_PADDING);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING);
    ctx.lineTo(PADDING, CHART_HEIGHT - BOTTOM_PADDING);
    ctx.stroke();

    if (sceneScores.length === 0) return;

    // Build scene points with positions
    const scenePoints: Array<{ x: number; y: number; score: number; scene: SceneScore }> = [];
    let currentX = PADDING;

    sortedChapters.forEach((chapter, chapterIdx) => {
      const chapterScenes = groupedScenes.get(chapter.chapter_index) || [];
      const sortedScenes = [...chapterScenes].sort((a, b) => a.scene_index - b.scene_index);

      sortedScenes.forEach((scene) => {
        const y = PADDING + (CHART_HEIGHT - PADDING - BOTTOM_PADDING) * (1 - scene.score);
        scenePoints.push({ x: currentX, y, score: scene.score, scene });
        currentX += sceneSpacing;
      });

      // Add gap between chapters
      if (chapterIdx < sortedChapters.length - 1) {
        currentX += chapterGap;
      }
    });

    // Draw smooth curve through scene points
    if (scenePoints.length > 0) {
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;

      // Draw smooth curve using cubic bezier for better smoothness
      if (scenePoints.length === 1) {
        // Single point - just draw the point
        const p = scenePoints[0];
        ctx.strokeStyle = getScoreColor(p.score);
        ctx.shadowColor = getScoreColor(p.score);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (scenePoints.length === 2) {
        // Two points - simple line
        const p0 = scenePoints[0];
        const p1 = scenePoints[1];
        const gradient = getGradient(ctx, p0.x, p0.y, p1.x, p1.y, p0.score, p1.score);
        ctx.strokeStyle = gradient;
        ctx.shadowColor = getScoreColor(p0.score);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      } else {
        // Three or more points - smooth curve using cardinal splines
        for (let i = 0; i < scenePoints.length - 1; i++) {
          const p0 = i > 0 ? scenePoints[i - 1] : scenePoints[i];
          const p1 = scenePoints[i];
          const p2 = scenePoints[i + 1];
          const p3 = i + 2 < scenePoints.length ? scenePoints[i + 2] : p2;

          // Calculate control points for smooth curve (Catmull-Rom to Bezier conversion)
          const tension = 0.5;
          const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
          const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
          const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
          const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

          const gradient = getGradient(ctx, p1.x, p1.y, p2.x, p2.y, p1.score, p2.score);
          ctx.strokeStyle = gradient;
          ctx.shadowColor = getScoreColor(p1.score);

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
          ctx.stroke();
        }
      }

      // Draw scene points
      scenePoints.forEach(point => {
        ctx.shadowBlur = 8;
        ctx.shadowColor = getScoreColor(point.score);
        ctx.fillStyle = getScoreColor(point.score);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.shadowBlur = 0;

      // Draw scene and chapter labels
      currentX = PADDING;
      sortedChapters.forEach((chapter, chapterIdx) => {
        const chapterScenes = groupedScenes.get(chapter.chapter_index) || [];
        const sortedScenes = [...chapterScenes].sort((a, b) => a.scene_index - b.scene_index);

        const chapterStartX = currentX;

        // Draw scene labels
        sortedScenes.forEach((scene) => {
          ctx.fillStyle = theme === 'dark' ? '#9ca3af' : '#6b7280';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`S${scene.scene_index}`, currentX, CHART_HEIGHT - BOTTOM_PADDING + 18);
          currentX += sceneSpacing;
        });

        // Calculate chapter label position (center of scenes)
        const chapterEndX = currentX - sceneSpacing;
        const chapterCenterX = (chapterStartX + chapterEndX) / 2;

        // Draw chapter label
        ctx.fillStyle = theme === 'dark' ? '#e5e7eb' : '#374151';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          language === 'ar'
            ? `${typeConfig.containerLabelAr} ${chapter.chapter_index}`
            : `${typeConfig.containerLabelEn} ${chapter.chapter_index}`,
          chapterCenterX,
          CHART_HEIGHT - BOTTOM_PADDING + 40
        );

        // Add gap between chapters
        if (chapterIdx < sortedChapters.length - 1) {
          currentX += chapterGap;
        }
      });
    }

    // Draw hover line
    if (hoverX !== null) {
      ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(hoverX, PADDING);
      ctx.lineTo(hoverX, CHART_HEIGHT - BOTTOM_PADDING);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHoverX(x);

    // Group scenes by chapter
    const groupedScenes = new Map<number, SceneScore[]>();
    sceneScores.forEach(scene => {
      if (!groupedScenes.has(scene.chapter_index)) {
        groupedScenes.set(scene.chapter_index, []);
      }
      groupedScenes.get(scene.chapter_index)!.push(scene);
    });

    const sceneSpacing = 60;
    const chapterGap = 30;
    const sortedChapters = [...chapterScores].sort((a, b) => a.chapter_index - b.chapter_index);

    // Build scene points with positions
    type ScenePoint = { x: number; y: number; score: number; scene: SceneScore };
    const scenePoints: ScenePoint[] = [];
    let currentX = PADDING;

    sortedChapters.forEach((chapter, chapterIdx) => {
      const chapterScenes = groupedScenes.get(chapter.chapter_index) || [];
      const sortedScenes = [...chapterScenes].sort((a, b) => a.scene_index - b.scene_index);

      sortedScenes.forEach((scene) => {
        const sceneY = PADDING + (CHART_HEIGHT - PADDING - BOTTOM_PADDING) * (1 - scene.score);
        scenePoints.push({ x: currentX, y: sceneY, score: scene.score, scene });
        currentX += sceneSpacing;
      });

      if (chapterIdx < sortedChapters.length - 1) {
        currentX += chapterGap;
      }
    });

    // Find closest scene
    let closestScene: SceneScore | null = null;
    let closestDistance = Infinity;

    scenePoints.forEach((point: ScenePoint) => {
      const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);

      if (distance < 20 && distance < closestDistance) {
        closestDistance = distance;
        closestScene = point.scene;
      }
    });

    if (closestScene !== null) {
      const scene = closestScene as SceneScore;
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        content: scene.recommendation,
        score: scene.score,
      });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
    setHoverX(null);
  };

  const getScoreColorClass = (score: number): string => {
    if (score >= 0.75) return 'bg-blue-600 text-white';
    if (score >= 0.45) return 'bg-yellow-500 text-white';
    return 'bg-red-600 text-white';
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
            {language === 'ar' ? 'ممتاز (75%+)' : 'Excellent (75%+)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
            {language === 'ar' ? 'متوسط (45-74%)' : 'Average (45-74%)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
            {language === 'ar' ? 'ضعيف (<45%)' : 'Weak (<45%)'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair"
        />
      </div>

      {tooltip && (
        <TooltipPopup
          tooltipRef={tooltipRef}
          tooltip={tooltip}
          theme={theme}
          getScoreColorClass={getScoreColorClass}
        />
      )}
    </div>
  );
};

export default PlotChart;
