import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import PlotChapterCard from './PlotChapterCard';
import PlotSceneCard from './PlotSceneCard';
import type { SceneAnalysisScore } from './SceneAnalysisPopup';

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
  ai_tension?: number | null;
  ai_pace?: number | null;
  writer_tension?: number | null;
  writer_pace?: number | null;
  accuracy_score?: number | null;
  causality_score?: number | null;
  dramatic_progress_score?: number | null;
  filler_ratio?: number | null;
  build_up_score?: number | null;
  scene_purpose?: string | null;
  ai_comment?: string | null;
}

interface PlotCanvasProps {
  chapters: PlotChapter[];
  scenes: Map<string, PlotScene[]>;
  onUpdateChapter: (chapterId: string, updates: Partial<PlotChapter>) => void;
  onUpdateScene: (sceneId: string, updates: Partial<PlotScene>) => void;
  onDeleteChapter: (chapterId: string) => void;
  onDeleteScene: (sceneId: string, chapterId: string) => void;
  onReorderChapters: (chapters: PlotChapter[]) => void;
  onReorderScenes: (chapterId: string, scenes: PlotScene[]) => void;
  onAddScene: (chapterId: string, pageType?: 'single' | 'double') => void;
  containerLabel: string;
  unitLabel: string;
  addUnitLabel: string;
  hasLevel2: boolean;
  language: 'ar' | 'en';
  analysis?: any;
  projectType?: string;
}

const CHAPTER_WIDTH = 300;
const CHAPTER_GAP = 100;
const CHAPTER_Y = 100;
const CHAPTER_HEIGHT = 280;
const SCENE_HEIGHT = 200;
const SCENE_GAP = 40;
const SCENE_START_Y = CHAPTER_Y + CHAPTER_HEIGHT + SCENE_GAP;

const PlotCanvas: React.FC<PlotCanvasProps> = ({
  chapters,
  scenes,
  onUpdateChapter,
  onUpdateScene,
  onDeleteChapter,
  onDeleteScene,
  onReorderChapters,
  onReorderScenes,
  onAddScene,
  containerLabel,
  unitLabel,
  addUnitLabel,
  hasLevel2,
  language,
  analysis,
}) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [draggedChapter, setDraggedChapter] = useState<string | null>(null);
  const [draggedScene, setDraggedScene] = useState<{ sceneId: string; chapterId: string } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const draggedChapterRef = useRef<string | null>(null);
  const draggedSceneRef = useRef<{ sceneId: string; chapterId: string } | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragStartScrollRef = useRef({ x: 0, y: 0 });
  const autoScrollRef = useRef<number | null>(null);

  useEffect(() => {
    drawConnections();
  }, [chapters, scenes, theme]);

  const drawConnections = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const neonColor = theme === 'dark' ? '#60a5fa' : '#3b82f6';
    const glowColor = theme === 'dark' ? 'rgba(96, 165, 250, 0.5)' : 'rgba(59, 130, 246, 0.5)';

    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = glowColor;

    if (chapters.length === 0) return;

    const startX = 50 + CHAPTER_WIDTH / 2;
    const endX = 50 + (chapters.length - 1) * (CHAPTER_WIDTH + CHAPTER_GAP) + CHAPTER_WIDTH / 2;
    const lineY = CHAPTER_Y + 60;

    ctx.beginPath();
    ctx.moveTo(startX, lineY);
    ctx.lineTo(endX, lineY);
    ctx.stroke();

    chapters.forEach((chapter, chapterIndex) => {
      const chapterScenes = scenes.get(chapter.id) || [];
      if (chapterScenes.length === 0) return;

      const chapterCenterX = 50 + chapterIndex * (CHAPTER_WIDTH + CHAPTER_GAP) + CHAPTER_WIDTH / 2;
      const lastSceneY = SCENE_START_Y + (chapterScenes.length - 1) * (SCENE_HEIGHT + SCENE_GAP) + SCENE_HEIGHT / 2;

      ctx.beginPath();
      ctx.moveTo(chapterCenterX, lineY);
      ctx.lineTo(chapterCenterX, lastSceneY);
      ctx.stroke();

      chapterScenes.forEach((_, sceneIndex) => {
        const sceneY = SCENE_START_Y + sceneIndex * (SCENE_HEIGHT + SCENE_GAP) + SCENE_HEIGHT / 2;
        ctx.beginPath();
        ctx.arc(chapterCenterX, sceneY, 5, 0, Math.PI * 2);
        ctx.fillStyle = neonColor;
        ctx.fill();
      });

      ctx.beginPath();
      ctx.arc(chapterCenterX, lineY, 6, 0, Math.PI * 2);
      ctx.fillStyle = neonColor;
      ctx.fill();
    });
  };

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current !== null) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const startAutoScroll = useCallback((scrollX: number, scrollY: number) => {
    stopAutoScroll();
    const scroll = () => {
      const container = containerRef.current;
      if (!container) return;
      if (scrollX !== 0) container.scrollLeft += scrollX;
      if (scrollY !== 0) container.scrollTop += scrollY;

      if (draggedChapterRef.current) {
        const scrollDeltaX = container.scrollLeft - dragStartScrollRef.current.x;
        setDragOffset({
          x: (lastMousePosRef.current.x - dragStartRef.current.x) + scrollDeltaX,
          y: 0,
        });
      } else if (draggedSceneRef.current) {
        const scrollDeltaY = container.scrollTop - dragStartScrollRef.current.y;
        setDragOffset({
          x: 0,
          y: (lastMousePosRef.current.y - dragStartRef.current.y) + scrollDeltaY,
        });
      }

      autoScrollRef.current = requestAnimationFrame(scroll);
    };
    autoScrollRef.current = requestAnimationFrame(scroll);
  }, [stopAutoScroll]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    const container = containerRef.current;

    if (draggedChapterRef.current) {
      const scrollDeltaX = container ? container.scrollLeft - dragStartScrollRef.current.x : 0;
      setDragOffset({
        x: (e.clientX - dragStartRef.current.x) + scrollDeltaX,
        y: 0,
      });

      if (container) {
        const rect = container.getBoundingClientRect();
        const edgeSize = 80;
        const speed = 12;
        let scrollX = 0;
        if (e.clientX < rect.left + edgeSize) scrollX = -speed;
        else if (e.clientX > rect.right - edgeSize) scrollX = speed;
        if (scrollX !== 0) startAutoScroll(scrollX, 0);
        else stopAutoScroll();
      }
    } else if (draggedSceneRef.current) {
      const scrollDeltaY = container ? container.scrollTop - dragStartScrollRef.current.y : 0;
      setDragOffset({
        x: 0,
        y: (e.clientY - dragStartRef.current.y) + scrollDeltaY,
      });

      if (container) {
        const rect = container.getBoundingClientRect();
        const edgeSize = 80;
        const speed = 12;
        let scrollY = 0;
        if (e.clientY < rect.top + edgeSize) scrollY = -speed;
        else if (e.clientY > rect.bottom - edgeSize) scrollY = speed;
        if (scrollY !== 0) startAutoScroll(0, scrollY);
        else stopAutoScroll();
      }
    }
  }, [startAutoScroll, stopAutoScroll]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    const container = containerRef.current;
    if (draggedChapterRef.current) {
      const scrollDeltaX = container ? container.scrollLeft - dragStartScrollRef.current.x : 0;
      const deltaX = (e.clientX - dragStartRef.current.x) + scrollDeltaX;
      const movedSlots = Math.round(deltaX / (CHAPTER_WIDTH + CHAPTER_GAP));

      if (movedSlots !== 0) {
        const currentChapters = [...chapters];
        const chapterIndex = currentChapters.findIndex(ch => ch.id === draggedChapterRef.current);
        const newIndex = Math.max(0, Math.min(currentChapters.length - 1, chapterIndex + movedSlots));

        if (newIndex !== chapterIndex) {
          const [moved] = currentChapters.splice(chapterIndex, 1);
          currentChapters.splice(newIndex, 0, moved);
          onReorderChapters(currentChapters);
        }
      }

      stopAutoScroll();
      draggedChapterRef.current = null;
      setDraggedChapter(null);
      setDragOffset({ x: 0, y: 0 });
    } else if (draggedSceneRef.current) {
      const scrollDeltaY = container ? container.scrollTop - dragStartScrollRef.current.y : 0;
      const deltaY = (e.clientY - dragStartRef.current.y) + scrollDeltaY;
      const movedSlots = Math.round(deltaY / (SCENE_HEIGHT + SCENE_GAP));

      if (movedSlots !== 0) {
        const chapterScenes = [...(scenes.get(draggedSceneRef.current.chapterId) || [])];
        const sceneIndex = chapterScenes.findIndex(s => s.id === draggedSceneRef.current!.sceneId);
        const newIndex = Math.max(0, Math.min(chapterScenes.length - 1, sceneIndex + movedSlots));

        if (newIndex !== sceneIndex) {
          const [moved] = chapterScenes.splice(sceneIndex, 1);
          chapterScenes.splice(newIndex, 0, moved);
          onReorderScenes(draggedSceneRef.current.chapterId, chapterScenes);
        }
      }

      stopAutoScroll();
      draggedSceneRef.current = null;
      setDraggedScene(null);
      setDragOffset({ x: 0, y: 0 });
    }

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [chapters, scenes, onReorderChapters, onReorderScenes, handleMouseMove, stopAutoScroll]);

  const handleChapterDragStart = (chapterId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    draggedChapterRef.current = chapterId;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragStartScrollRef.current = { x: container?.scrollLeft ?? 0, y: container?.scrollTop ?? 0 };
    setDraggedChapter(chapterId);
    setDragOffset({ x: 0, y: 0 });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSceneDragStart = (sceneId: string, chapterId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    draggedSceneRef.current = { sceneId, chapterId };
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragStartScrollRef.current = { x: container?.scrollLeft ?? 0, y: container?.scrollTop ?? 0 };
    setDraggedScene({ sceneId, chapterId });
    setDragOffset({ x: 0, y: 0 });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const calculateCanvasSize = () => {
    const width = Math.max(1200, 50 + chapters.length * (CHAPTER_WIDTH + CHAPTER_GAP) + 50);
    let maxScenes = 0;
    scenes.forEach(chapterScenes => {
      maxScenes = Math.max(maxScenes, chapterScenes.length);
    });
    const height = Math.max(800, SCENE_START_Y + maxScenes * (SCENE_HEIGHT + SCENE_GAP) + 100);
    return { width, height };
  };

  const { width: canvasWidth, height: canvasHeight } = calculateCanvasSize();

  const getChapterAnalysisScore = (chapter: PlotChapter): SceneAnalysisScore | undefined => {
    if (!analysis?.scene_scores) return undefined;
    const score =
      analysis.scene_scores.find(
        (s: any) =>
          s.chapter_index === 1 &&
          (s.scene_index === chapter.order_index || s.order_index === chapter.order_index)
      ) ??
      analysis.scene_scores.find(
        (s: any) => s.chapter_index === chapter.order_index && (s.scene_index === 1 || s.scene_index == null)
      );
    if (!score) return undefined;
    return {
      ai_tension: score.ai_tension ?? 0.5,
      ai_pace: score.ai_pace ?? 0.5,
      writer_tension: score.writer_tension,
      writer_pace: score.writer_pace,
      accuracy_score: score.accuracy_score,
      causality_score: score.causality_score ?? 0.5,
      dramatic_progress_score: score.dramatic_progress_score ?? 0.5,
      filler_ratio: score.filler_ratio ?? 0,
      build_up_score: score.build_up_score ?? 0.5,
      recommendation: score.recommendation ?? '',
      comment: score.comment,
      has_climax: score.has_climax,
      scene_purpose: score.scene_purpose,
    };
  };

  const getSceneAnalysisScore = (chapter: PlotChapter, scene: PlotScene): SceneAnalysisScore | undefined => {
    if (
      scene.ai_tension == null &&
      scene.ai_pace == null &&
      scene.causality_score == null
    ) {
      if (!analysis?.scene_scores) return undefined;
      const score = analysis.scene_scores.find(
        (s: any) => s.chapter_index === chapter.order_index && s.scene_index === scene.order_index
      );
      if (!score) return undefined;
      return {
        ai_tension: score.ai_tension ?? 0.5,
        ai_pace: score.ai_pace ?? 0.5,
        writer_tension: score.writer_tension,
        writer_pace: score.writer_pace,
        accuracy_score: score.accuracy_score,
        causality_score: score.causality_score ?? 0.5,
        dramatic_progress_score: score.dramatic_progress_score ?? 0.5,
        filler_ratio: score.filler_ratio ?? 0,
        build_up_score: score.build_up_score ?? 0.5,
        recommendation: score.recommendation ?? '',
        comment: score.comment,
        has_climax: score.has_climax,
        scene_purpose: score.scene_purpose,
      };
    }
    return {
      ai_tension: scene.ai_tension ?? 0.5,
      ai_pace: scene.ai_pace ?? 0.5,
      writer_tension: scene.writer_tension != null ? scene.writer_tension * 10 : undefined,
      writer_pace: scene.writer_pace != null ? scene.writer_pace * 10 : undefined,
      accuracy_score: scene.accuracy_score,
      causality_score: scene.causality_score ?? 0.5,
      dramatic_progress_score: scene.dramatic_progress_score ?? 0.5,
      filler_ratio: scene.filler_ratio ?? 0,
      build_up_score: scene.build_up_score ?? 0.5,
      recommendation: scene.ai_comment ?? '',
      comment: scene.ai_comment,
      scene_purpose: scene.scene_purpose,
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto"
      style={{
        height: 'calc(100vh - 80px)',
        background: theme === 'dark'
          ? 'radial-gradient(circle at 20px 20px, rgba(75, 85, 99, 0.5) 1px, transparent 0), radial-gradient(circle at 20px 20px, rgba(75, 85, 99, 0.5) 1px, transparent 0)'
          : 'radial-gradient(circle at 20px 20px, rgba(209, 213, 219, 0.5) 1px, transparent 0), radial-gradient(circle at 20px 20px, rgba(209, 213, 219, 0.5) 1px, transparent 0)',
        backgroundSize: '40px 40px',
        backgroundPosition: '0 0, 20px 20px',
        userSelect: 'none',
      }}
    >
      <div
        className="relative"
        style={{
          width: canvasWidth,
          height: canvasHeight,
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: canvasWidth, height: canvasHeight }}
        />

        {chapters.map((chapter, index) => {
          const isDragging = draggedChapter === chapter.id;
          const translateX = isDragging ? dragOffset.x : 0;

          return (
            <div
              key={chapter.id}
              className="absolute"
              style={{
                left: 50 + index * (CHAPTER_WIDTH + CHAPTER_GAP),
                top: CHAPTER_Y,
                width: CHAPTER_WIDTH,
                transform: `translateX(${translateX}px)`,
                opacity: 1,
                zIndex: isDragging ? 100 : 1,
                transition: isDragging ? 'none' : 'transform 0.2s ease',
              }}
            >
              <PlotChapterCard
                chapter={chapter}
                onUpdate={(updates) => onUpdateChapter(chapter.id, updates)}
                onDelete={() => onDeleteChapter(chapter.id)}
                onDragStart={(e) => handleChapterDragStart(chapter.id, e)}
                onDragEnd={() => {}}
                onAddScene={() => onAddScene(chapter.id)}
                isDragging={isDragging}
                containerLabel={containerLabel}
                unitLabel={unitLabel}
                addUnitLabel={addUnitLabel}
                hasLevel2={hasLevel2}
                language={language}
                analysisScore={!hasLevel2 ? getChapterAnalysisScore(chapter) : undefined}
              />
            </div>
          );
        })}

        {hasLevel2 && chapters.map((chapter, chapterIndex) => {
          const chapterScenes = scenes.get(chapter.id) || [];
          return (
            <div
              key={`scenes-${chapter.id}`}
              className="absolute flex flex-col"
              style={{
                left: 50 + chapterIndex * (CHAPTER_WIDTH + CHAPTER_GAP),
                top: SCENE_START_Y,
                width: CHAPTER_WIDTH,
                gap: `${SCENE_GAP}px`,
              }}
            >
              {chapterScenes.map((scene) => {
                const isDragging = draggedScene?.sceneId === scene.id;
                const translateY = isDragging ? dragOffset.y : 0;

                return (
                  <div
                    key={scene.id}
                    style={{
                      transform: `translateY(${translateY}px)`,
                      opacity: 1,
                      zIndex: isDragging ? 100 : 1,
                      transition: isDragging ? 'none' : 'transform 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <PlotSceneCard
                      scene={scene}
                      onUpdate={(updates) => onUpdateScene(scene.id, updates)}
                      onDelete={() => onDeleteScene(scene.id, chapter.id)}
                      onDragStart={(e) => handleSceneDragStart(scene.id, chapter.id, e)}
                      onDragEnd={() => {}}
                      isDragging={isDragging}
                      unitLabel={unitLabel}
                      language={language}
                      analysisScore={getSceneAnalysisScore(chapter, scene)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlotCanvas;
