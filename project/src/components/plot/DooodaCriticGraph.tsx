import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  Plugin,
} from 'chart.js';
import { useTheme } from '../../contexts/ThemeContext';
import { AlertTriangle, Zap, Swords, Box, Target, RefreshCw } from 'lucide-react';
import { getProjectTypeConfig } from '../../utils/projectTypeConfig';
import type { ProjectType } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SceneScore {
  chapter_index: number;
  scene_index: number;
  chapter_title?: string;
  scene_title?: string;
  writer_tension?: number;
  ai_tension: number;
  writer_pace?: number;
  ai_pace: number;
  accuracy_score?: number;
  causality_score: number;
  dramatic_progress_score: number;
  filler_ratio: number;
  build_up_score: number;
  recommendation: string;
  comment?: string;
  has_climax?: boolean;
  scene_purpose?: 'conflict' | 'setup' | 'payoff' | 'transition';
}

interface ChapterScore {
  chapter_index: number;
  structure_score: number;
  tension_score: number;
  pacing_score: number;
  build_up_score: number;
  causality_score: number;
  recommendation: string;
}

interface GlobalStructure {
  detected_midpoint_scene_index?: number;
  detected_main_climax_scene_index?: number;
  act_breakpoints?: {
    act1_end: number;
    act2_mid: number;
    act2_end: number;
  };
}

interface PlotAnalysisResponse {
  overall_quality: number;
  structure_analysis: string;
  tension_analysis: string;
  pacing_analysis: string;
  climax_analysis: string;
  chapter_scores: ChapterScore[];
  scene_scores: SceneScore[];
  global_structure?: GlobalStructure;
  filler_scenes?: Array<{
    chapter_index: number;
    scene_index: number;
    reason: string;
  }>;
  unresolved_elements?: Array<{
    description: string;
    introduced_in: string;
    status: string;
  }>;
  structural_warnings?: string[];
  strengths?: string[];
  key_issues?: string[];
  recommendations?: string[];
}

interface PlotChapter {
  id: string;
  order_index: number;
  title: string;
}

interface PlotScene {
  id: string;
  chapter_id: string;
  order_index: number;
  title: string;
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

interface DooodaCriticGraphProps {
  analysis: PlotAnalysisResponse;
  chapters: PlotChapter[];
  scenes: Map<string, PlotScene[]>;
  language?: 'ar' | 'en';
  projectType?: ProjectType;
}

const TOOLTIP_W = 384;
const TOOLTIP_OFFSET = 15;

const SmartTooltip: React.FC<{
  x: number;
  y: number;
  theme: string;
  children: React.ReactNode;
}> = ({ x, y, theme, children }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({ visibility: 'hidden', position: 'fixed', zIndex: 50 });

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fitsRight = x + TOOLTIP_OFFSET + TOOLTIP_W <= vw;
    const fitsBelow = y + TOOLTIP_OFFSET + h <= vh;
    setStyle({
      position: 'fixed',
      zIndex: 50,
      left: Math.max(8, fitsRight ? x + TOOLTIP_OFFSET : x - TOOLTIP_OFFSET - TOOLTIP_W),
      top: Math.max(8, fitsBelow ? y + TOOLTIP_OFFSET : y - TOOLTIP_OFFSET - h),
      width: TOOLTIP_W,
      visibility: 'visible',
    });
  }, [x, y]);

  return (
    <div
      ref={ref}
      className={`pointer-events-none p-4 rounded-xl shadow-2xl backdrop-blur-sm ${
        theme === 'dark'
          ? 'bg-gray-900 bg-opacity-95 border border-gray-700'
          : 'bg-white bg-opacity-95 border border-gray-200'
      }`}
      style={style}
    >
      {children}
    </div>
  );
};

function isFilmType(pt?: ProjectType) {
  return pt === 'film_script';
}

function isTvType(pt?: ProjectType) {
  return pt === 'tv_series' || pt === 'radio_series';
}

function isChildrenType(pt?: ProjectType) {
  return pt === 'children_story';
}

function isTheatreType(pt?: ProjectType) {
  return pt === 'theatre_play';
}

function isNovelType(pt?: ProjectType) {
  return !pt || pt === 'novel' || pt === 'short_story' || pt === 'long_story';
}

function isNonFiction(pt?: ProjectType) {
  return pt === 'book';
}

const DooodaCriticGraph: React.FC<DooodaCriticGraphProps> = ({
  analysis,
  chapters,
  scenes,
  language = 'en',
  projectType,
}) => {
  const typeConfig = getProjectTypeConfig(projectType ?? 'novel');
  const { theme } = useTheme();
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [visibleDatasets, setVisibleDatasets] = useState({
    aiTension: true,
    aiPace: !isChildrenType(projectType) && !isNonFiction(projectType),
    buildUp: !isChildrenType(projectType),
    progress: true,
    causality: false,
    idealArc: false,
  });

  const [customTooltip, setCustomTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    sceneIndex: number;
  } | null>(null);

  const [heatmapHover, setHeatmapHover] = useState<number | null>(null);
  const [activeTvEpisode, setActiveTvEpisode] = useState<number | null>(null);

  const sceneScores = useMemo(() => {
    const scores: SceneScore[] = [];
    const noLevel2 = typeConfig.hasLevel2 === false;

    if (noLevel2) {
      chapters.forEach((chapter, chapterIdx) => {
        const analysisScore = analysis.scene_scores?.find(
          s => s.chapter_index === chapter.order_index && (s.scene_index === 1 || s.scene_index === chapter.order_index)
        ) ?? analysis.scene_scores?.find(
          s => s.scene_index === chapter.order_index
        ) ?? analysis.scene_scores?.[chapterIdx];

        scores.push({
          chapter_index: chapter.order_index,
          scene_index: chapter.order_index,
          chapter_title: chapter.title,
          scene_title: undefined,
          writer_tension: analysisScore?.writer_tension != null ? analysisScore.writer_tension : undefined,
          writer_pace: analysisScore?.writer_pace != null ? analysisScore.writer_pace : undefined,
          ai_tension: analysisScore?.ai_tension ?? 0.5,
          ai_pace: analysisScore?.ai_pace ?? 0.5,
          accuracy_score: analysisScore?.accuracy_score,
          causality_score: analysisScore?.causality_score ?? 0.5,
          dramatic_progress_score: analysisScore?.dramatic_progress_score ?? 0.5,
          filler_ratio: analysisScore?.filler_ratio ?? 0,
          build_up_score: analysisScore?.build_up_score ?? 0.5,
          has_climax: analysisScore?.has_climax,
          scene_purpose: analysisScore?.scene_purpose,
          recommendation: analysisScore?.recommendation ?? '',
          comment: analysisScore?.comment,
        });
      });
    } else {
      chapters.forEach(chapter => {
        const chapterScenes = scenes.get(chapter.id) || [];
        chapterScenes.forEach(scene => {
          const analysisScore = analysis.scene_scores?.find(
            s => s.chapter_index === chapter.order_index &&
              (s.scene_index === scene.order_index || (s as any).order_index === scene.order_index)
          );

          const writerTension = scene.writer_tension != null
            ? scene.writer_tension * 10
            : analysisScore?.writer_tension != null
            ? analysisScore.writer_tension
            : undefined;

          const writerPace = scene.writer_pace != null
            ? scene.writer_pace * 10
            : analysisScore?.writer_pace != null
            ? analysisScore.writer_pace
            : undefined;

          scores.push({
            chapter_index: chapter.order_index,
            scene_index: scene.order_index,
            chapter_title: chapter.title,
            scene_title: scene.title,
            writer_tension: writerTension,
            writer_pace: writerPace,
            ai_tension: scene.ai_tension ?? analysisScore?.ai_tension ?? 0.5,
            ai_pace: scene.ai_pace ?? analysisScore?.ai_pace ?? 0.5,
            accuracy_score: scene.accuracy_score ?? analysisScore?.accuracy_score,
            causality_score: scene.causality_score ?? analysisScore?.causality_score ?? 0.5,
            dramatic_progress_score: scene.dramatic_progress_score ?? analysisScore?.dramatic_progress_score ?? 0.5,
            filler_ratio: scene.filler_ratio ?? analysisScore?.filler_ratio ?? 0,
            build_up_score: scene.build_up_score ?? analysisScore?.build_up_score ?? 0.5,
            has_climax: analysisScore?.has_climax,
            scene_purpose: (scene.scene_purpose as any) ?? analysisScore?.scene_purpose,
            recommendation: scene.ai_comment ?? analysisScore?.recommendation ?? '',
            comment: scene.ai_comment ?? analysisScore?.comment,
          });
        });
      });
    }

    if (scores.length === 0 && analysis.scene_scores && analysis.scene_scores.length > 0) {
      analysis.scene_scores.forEach(s => {
        const matchedChapter = chapters.find(ch => ch.order_index === s.chapter_index);
        scores.push({
          chapter_index: s.chapter_index,
          scene_index: s.scene_index,
          chapter_title: matchedChapter?.title,
          scene_title: undefined,
          ai_tension: s.ai_tension ?? 0.5,
          ai_pace: s.ai_pace ?? 0.5,
          accuracy_score: s.accuracy_score,
          causality_score: s.causality_score ?? 0.5,
          dramatic_progress_score: s.dramatic_progress_score ?? 0.5,
          filler_ratio: s.filler_ratio ?? 0,
          build_up_score: s.build_up_score ?? 0.5,
          has_climax: s.has_climax,
          scene_purpose: s.scene_purpose,
          recommendation: s.recommendation ?? '',
          comment: s.comment,
        });
      });
    }

    return scores;
  }, [chapters, scenes, analysis.scene_scores, typeConfig.hasLevel2]);

  const sortedScenes = useMemo(
    () =>
      [...sceneScores].sort(
        (a, b) => a.chapter_index - b.chapter_index || a.scene_index - b.scene_index
      ),
    [sceneScores]
  );

  const conflictIntensities = useMemo(
    () =>
      sortedScenes.map((scene) => {
        const intensity =
          scene.ai_tension * 0.5 +
          scene.dramatic_progress_score * 0.3 +
          (1 - scene.filler_ratio) * 0.2;
        return Math.min(1, Math.max(0, intensity));
      }),
    [sortedScenes]
  );

  const { midpointIndex, climaxIndex, actBreakpoints } = useMemo(() => {
    const totalScenes = sortedScenes.length;

    const midpoint =
      analysis.global_structure?.detected_midpoint_scene_index ??
      sortedScenes.reduce((maxIdx, scene, idx, arr) => {
        if (idx === 0) return maxIdx;
        const jump = scene.dramatic_progress_score - arr[idx - 1].dramatic_progress_score;
        const currentMaxJump = arr[maxIdx].dramatic_progress_score - (maxIdx > 0 ? arr[maxIdx - 1].dramatic_progress_score : 0);
        return jump > currentMaxJump ? idx : maxIdx;
      }, Math.floor(totalScenes * 0.5));

    const climax =
      analysis.global_structure?.detected_main_climax_scene_index ??
      sortedScenes.reduce((maxIdx, scene, idx) => {
        const currentMax = sortedScenes[maxIdx];
        return scene.ai_tension > currentMax.ai_tension && scene.build_up_score > 0.7
          ? idx
          : maxIdx;
      }, 0);

    const breakpoints = analysis.global_structure?.act_breakpoints ?? {
      act1_end: Math.floor(totalScenes * 0.25),
      act2_mid: Math.floor(totalScenes * 0.5),
      act2_end: Math.floor(totalScenes * 0.75),
    };

    return {
      midpointIndex: midpoint,
      climaxIndex: climax,
      actBreakpoints: breakpoints,
    };
  }, [sortedScenes, analysis.global_structure]);

  const episodeGroups = useMemo(() => {
    if (!isTvType(projectType)) return null;
    const groups = new Map<number, SceneScore[]>();
    sortedScenes.forEach(scene => {
      if (!groups.has(scene.chapter_index)) {
        groups.set(scene.chapter_index, []);
      }
      groups.get(scene.chapter_index)!.push(scene);
    });
    return groups;
  }, [sortedScenes, projectType]);

  const seasonalArcData = useMemo(() => {
    if (!isTvType(projectType) || !episodeGroups) return null;
    const episodeIndices = [...episodeGroups.keys()].sort((a, b) => a - b);
    return episodeIndices.map(epIdx => {
      const epScenes = episodeGroups.get(epIdx) || [];
      return epScenes.reduce((sum, s) => sum + s.ai_tension, 0) / Math.max(epScenes.length, 1);
    });
  }, [episodeGroups, projectType]);

  const tvActiveScenes = useMemo(() => {
    if (!isTvType(projectType) || !episodeGroups || activeTvEpisode === null) return sortedScenes;
    return episodeGroups.get(activeTvEpisode) ?? sortedScenes;
  }, [sortedScenes, episodeGroups, activeTvEpisode, projectType]);

  const displayScenes = isTvType(projectType) && activeTvEpisode !== null ? tvActiveScenes : sortedScenes;

  const emotionalPeakIndices = useMemo(() => {
    if (!isChildrenType(projectType)) return new Set<number>();
    const peaks = new Set<number>();
    displayScenes.forEach((scene, idx) => {
      const prev = displayScenes[idx - 1];
      const next = displayScenes[idx + 1];
      if (
        scene.ai_tension > 0.65 &&
        (!prev || scene.ai_tension >= prev.ai_tension) &&
        (!next || scene.ai_tension >= next.ai_tension)
      ) {
        peaks.add(idx);
      }
    });
    return peaks;
  }, [displayScenes, projectType]);

  const dialogueDensities = useMemo(() => {
    if (!isTheatreType(projectType)) return null;
    return displayScenes.map(scene => {
      return Math.min(1, (scene.dramatic_progress_score * 0.6) + (scene.causality_score * 0.4));
    });
  }, [displayScenes, projectType]);

  const idealArcData = useMemo(() => {
    const totalScenes = displayScenes.length;
    if (totalScenes === 0) return [];

    if (isChildrenType(projectType)) {
      return displayScenes.map((_, idx) => {
        const progress = idx / Math.max(totalScenes - 1, 1);
        if (progress < 0.2) return 0.3 + progress * 1.0;
        if (progress < 0.5) return 0.5 + (progress - 0.2) * 0.5;
        if (progress < 0.8) return 0.65 + (progress - 0.5) * 0.5;
        return 0.8 - (progress - 0.8) * 2.0;
      });
    }

    if (isNonFiction(projectType)) {
      return displayScenes.map((_, idx) => {
        const progress = idx / Math.max(totalScenes - 1, 1);
        return 0.4 + progress * 0.4;
      });
    }

    if (isFilmType(projectType)) {
      return displayScenes.map((_, idx) => {
        const progress = idx / Math.max(totalScenes - 1, 1);
        if (progress < 0.25) return 0.35 + progress * 1.0;
        if (progress < 0.5) return 0.6 - (progress - 0.25) * 0.4;
        if (progress < 0.75) return 0.5 + (progress - 0.5) * 1.4;
        if (progress < 0.9) return 0.85 + (progress - 0.75) * 0.6;
        return 0.94 - (progress - 0.9) * 2.5;
      });
    }

    return displayScenes.map((_, idx) => {
      const progress = idx / Math.max(totalScenes - 1, 1);
      if (progress < 0.25) return 0.3 + progress * 0.8;
      if (progress < 0.5) return 0.5 - (progress - 0.25) * 0.4;
      if (progress < 0.85) return 0.4 + (progress - 0.5) * 1.4;
      return 0.9 - (progress - 0.85) * 1.5;
    });
  }, [displayScenes, projectType]);

  const warnings = useMemo(() => {
    const detected: Array<{ type: string; message: string; indices: number[] }> = [];
    const scenes = displayScenes;

    for (let i = 0; i < scenes.length - 2; i++) {
      const variance = Math.abs(scenes[i].ai_tension - scenes[i + 1].ai_tension) +
                      Math.abs(scenes[i + 1].ai_tension - scenes[i + 2].ai_tension);

      if (variance < 0.1) {
        detected.push({
          type: 'dead_zone',
          message: language === 'ar' ? 'منطقة ميتة - توتر ثابت' : 'Dead Zone - Flat Tension',
          indices: [i, i + 1, i + 2],
        });
        i += 2;
      }
    }

    for (let i = 0; i < scenes.length - 1; i++) {
      if (scenes[i].filler_ratio > 0.6 && scenes[i + 1].filler_ratio > 0.6) {
        detected.push({
          type: 'filler_cluster',
          message: language === 'ar' ? 'تجمع حشو' : 'Filler Cluster',
          indices: [i, i + 1],
        });
      }
    }

    if (isTvType(projectType)) {
      const episodeEnds = scenes.reduce<number[]>((acc, scene, idx) => {
        const next = scenes[idx + 1];
        if (!next || next.chapter_index !== scene.chapter_index) acc.push(idx);
        return acc;
      }, []);

      episodeEnds.forEach(endIdx => {
        if (scenes[endIdx].ai_tension < 0.5) {
          detected.push({
            type: 'weak_cliffhanger',
            message: language === 'ar' ? 'خطاف ضعيف في نهاية الحلقة' : 'Weak Episode Cliffhanger',
            indices: [endIdx],
          });
        }
      });
    }

    let consecutiveTransitions = 0;
    for (let i = 0; i < scenes.length; i++) {
      if (scenes[i].scene_purpose === 'transition') {
        consecutiveTransitions++;
        if (consecutiveTransitions > 3) {
          detected.push({
            type: 'structural_imbalance',
            message: language === 'ar' ? 'عدم توازن بنيوي' : 'Structural Imbalance',
            indices: [i - 3, i],
          });
        }
      } else {
        consecutiveTransitions = 0;
      }
    }

    return detected;
  }, [displayScenes, language, projectType]);

  const labels = displayScenes.map((scene, idx) => {
    if (typeConfig.hasLevel2 === false) {
      return scene.chapter_title
        || (language === 'ar'
          ? `${typeConfig.containerLabelAr} ${scene.chapter_index}`
          : `${typeConfig.containerLabelEn} ${scene.chapter_index}`);
    }
    const isNewChapter = idx === 0 || displayScenes[idx - 1].chapter_index !== scene.chapter_index;
    if (isNewChapter) {
      const chapterLabel = scene.chapter_title
        || (language === 'ar'
          ? `${typeConfig.containerLabelAr} ${scene.chapter_index}`
          : `${typeConfig.containerLabelEn} ${scene.chapter_index}`);
      const sceneLabel = scene.scene_title
        || (language === 'ar'
          ? `${typeConfig.unitLabelAr} ${scene.scene_index}`
          : `${typeConfig.unitLabelEn} ${scene.scene_index}`);
      return `${chapterLabel} | ${sceneLabel}`;
    }
    return scene.scene_title
      || (language === 'ar'
        ? `${typeConfig.unitLabelAr} ${scene.scene_index}`
        : `${typeConfig.unitLabelEn} ${scene.scene_index}`);
  });

  const getColor = (baseColor: string, opacity: number = 1) => {
    const colors: Record<string, string> = {
      red: `rgba(214, 40, 40, ${opacity})`,
      blue: `rgba(59, 130, 246, ${opacity})`,
      teal: `rgba(20, 184, 166, ${opacity})`,
      green: `rgba(34, 197, 94, ${opacity})`,
      grey: `rgba(156, 163, 175, ${opacity})`,
      gold: `rgba(251, 191, 36, ${opacity})`,
      pink: `rgba(236, 72, 153, ${opacity})`,
      orange: `rgba(249, 115, 22, ${opacity})`,
    };
    return colors[baseColor] || colors.grey;
  };

  const tensionColor = 'red';
  const paceColor = 'blue';

  const customPlugin: Plugin<'line'> = useMemo(() => ({
    id: 'dramaticStructure',
    afterDraw: (chart) => {
      const ctx = chart.ctx;
      const chartArea = chart.chartArea;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      ctx.save();

      const showActMarkers = isFilmType(projectType) || isNovelType(projectType) || isTheatreType(projectType);

      if (showActMarkers) {
        ctx.setLineDash([10, 5]);
        ctx.lineWidth = isFilmType(projectType) ? 2.5 : 1.5;

        const act1Color = isFilmType(projectType)
          ? (theme === 'dark' ? 'rgba(251,191,36,0.6)' : 'rgba(217,119,6,0.7)')
          : (theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)');

        ctx.strokeStyle = act1Color;

        const act1End = xScale.getPixelForValue(actBreakpoints.act1_end);
        const act2End = xScale.getPixelForValue(actBreakpoints.act2_end);

        ctx.beginPath();
        ctx.moveTo(act1End, chartArea.top);
        ctx.lineTo(act1End, chartArea.bottom);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(act2End, chartArea.top);
        ctx.lineTo(act2End, chartArea.bottom);
        ctx.stroke();

        ctx.setLineDash([]);

        ctx.font = isFilmType(projectType) ? 'bold 12px sans-serif' : '11px sans-serif';
        ctx.fillStyle = isFilmType(projectType)
          ? (theme === 'dark' ? '#fbbf24' : '#d97706')
          : (theme === 'dark' ? '#9ca3af' : '#6b7280');
        ctx.textAlign = 'center';

        const actLabels = isFilmType(projectType)
          ? (language === 'ar' ? ['الفصل الأول', 'الفصل الثاني', 'الفصل الثالث'] : ['Act I', 'Act II', 'Act III'])
          : (language === 'ar' ? ['القسم الأول', 'القسم الثاني', 'القسم الثالث'] : ['Part I', 'Part II', 'Part III']);

        const act1Center = (chartArea.left + act1End) / 2;
        const act2Center = (act1End + act2End) / 2;
        const act3Center = (act2End + chartArea.right) / 2;

        ctx.fillText(actLabels[0], act1Center, chartArea.top - 10);
        ctx.fillText(actLabels[1], act2Center, chartArea.top - 10);
        ctx.fillText(actLabels[2], act3Center, chartArea.top - 10);
      }

      const showMidpoint = isFilmType(projectType) || isNovelType(projectType);
      if (showMidpoint && midpointIndex >= 0 && midpointIndex < displayScenes.length) {
        const x = xScale.getPixelForValue(midpointIndex);
        const y = yScale.getPixelForValue(displayScenes[midpointIndex].ai_tension);

        if (isFilmType(projectType)) {
          ctx.fillStyle = 'rgba(251,191,36,0.1)';
          ctx.fillRect(x - 18, chartArea.top, 36, chartArea.bottom - chartArea.top);
        }

        ctx.strokeStyle = getColor('gold', 0.9);
        ctx.lineWidth = isFilmType(projectType) ? 3 : 2;
        ctx.beginPath();
        ctx.arc(x, y, isFilmType(projectType) ? 14 : 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = getColor('gold', 1);
        ctx.font = isFilmType(projectType) ? 'bold 11px sans-serif' : '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(language === 'ar' ? 'نقطة المنتصف' : 'Midpoint', x, y - (isFilmType(projectType) ? 22 : 18));
      }

      const showClimax = isFilmType(projectType) || isNovelType(projectType) || isTheatreType(projectType);
      if (showClimax && climaxIndex >= 0 && climaxIndex < displayScenes.length) {
        const x = xScale.getPixelForValue(climaxIndex);
        const yTop = chartArea.top;
        const yScene = yScale.getPixelForValue(displayScenes[climaxIndex].ai_tension);

        const gradient = ctx.createLinearGradient(x, yTop, x, yScene);
        gradient.addColorStop(0, 'rgba(214, 40, 40, 0.05)');
        gradient.addColorStop(1, isFilmType(projectType) ? 'rgba(214,40,40,0.4)' : 'rgba(214,40,40,0.25)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x - (isFilmType(projectType) ? 20 : 15), yTop, isFilmType(projectType) ? 40 : 30, yScene - yTop);

        ctx.strokeStyle = getColor('red', 0.6);
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(x, yTop);
        ctx.lineTo(x, yScene);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.shadowBlur = 15;
        ctx.shadowColor = getColor('red', 0.5);
        ctx.strokeStyle = getColor('red', 0.9);
        ctx.lineWidth = isFilmType(projectType) ? 4 : 3;
        ctx.beginPath();
        ctx.arc(x, yScene, isFilmType(projectType) ? 13 : 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = getColor('red', 1);
        ctx.font = isFilmType(projectType) ? 'bold 12px sans-serif' : 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(language === 'ar' ? 'الذروة' : 'Climax', x, yTop + 15);
      }

      if (isChildrenType(projectType)) {
        displayScenes.forEach((scene, idx) => {
          if (emotionalPeakIndices.has(idx)) {
            const x = xScale.getPixelForValue(idx);
            const y = yScale.getPixelForValue(scene.ai_tension);

            ctx.shadowBlur = 20;
            ctx.shadowColor = getColor('teal', 0.7);
            ctx.strokeStyle = getColor('teal', 0.9);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = getColor('teal', 0.9);
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(language === 'ar' ? 'ذروة عاطفية' : 'Emotional Peak', x, y - 20);
          }
        });
      }

      if (isTheatreType(projectType) && dialogueDensities) {
        displayScenes.forEach((_scene, idx) => {
          const density = dialogueDensities[idx];
          const x = xScale.getPixelForValue(idx);
          const barWidth = Math.max(8, (chartArea.right - chartArea.left) / displayScenes.length - 6);
          const barHeight = (chartArea.bottom - chartArea.top) * density * 0.3;

          ctx.fillStyle = `rgba(236, 72, 153, ${0.15 + density * 0.3})`;
          ctx.fillRect(x - barWidth / 2, chartArea.bottom - barHeight, barWidth, barHeight);
        });
      }

      if (isTvType(projectType) && episodeGroups && activeTvEpisode === null) {
        let sceneOffset = 0;
        const episodeIndices = [...episodeGroups.keys()].sort((a, b) => a - b);
        episodeIndices.forEach((epIdx, i) => {
          const epScenes = episodeGroups.get(epIdx) || [];
          const epStart = xScale.getPixelForValue(sceneOffset);
          const epEnd = xScale.getPixelForValue(sceneOffset + epScenes.length - 1);
          const centerX = (epStart + epEnd) / 2;

          ctx.fillStyle = i % 2 === 0
            ? (theme === 'dark' ? 'rgba(59,130,246,0.04)' : 'rgba(59,130,246,0.03)')
            : (theme === 'dark' ? 'rgba(34,197,94,0.04)' : 'rgba(34,197,94,0.03)');
          ctx.fillRect(epStart, chartArea.top, epEnd - epStart, chartArea.bottom - chartArea.top);

          ctx.font = '10px sans-serif';
          ctx.fillStyle = theme === 'dark' ? '#6b7280' : '#9ca3af';
          ctx.textAlign = 'center';
          ctx.fillText(
            language === 'ar' ? `ح${epIdx}` : `Ep${epIdx}`,
            centerX,
            chartArea.bottom + 20
          );

          const lastEpScene = epScenes[epScenes.length - 1];
          if (lastEpScene.ai_tension < 0.5 && i < episodeIndices.length - 1) {
            const endX = xScale.getPixelForValue(sceneOffset + epScenes.length - 1);
            ctx.strokeStyle = 'rgba(239,68,68,0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(endX, chartArea.top);
            ctx.lineTo(endX, chartArea.bottom);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          sceneOffset += epScenes.length;
        });
      }

      warnings.forEach((warning) => {
        if (warning.indices.length > 0) {
          const startX = xScale.getPixelForValue(warning.indices[0]);
          const endX = xScale.getPixelForValue(warning.indices[warning.indices.length - 1]);

          ctx.fillStyle =
            warning.type === 'dead_zone'
              ? 'rgba(156, 163, 175, 0.2)'
              : warning.type === 'weak_cliffhanger'
              ? 'rgba(239, 68, 68, 0.12)'
              : 'rgba(239, 68, 68, 0.15)';
          ctx.fillRect(startX - 10, chartArea.top, endX - startX + 20, chartArea.bottom - chartArea.top);
        }
      });

      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = theme === 'dark' ? 'rgba(156, 163, 175, 0.3)' : 'rgba(107, 114, 128, 0.3)';
      ctx.lineWidth = 1;

      displayScenes.forEach((scene, idx) => {
        if (idx > 0 && displayScenes[idx - 1].chapter_index !== scene.chapter_index) {
          const x = xScale.getPixelForValue(idx);
          ctx.beginPath();
          ctx.moveTo(x - 10, chartArea.top);
          ctx.lineTo(x - 10, chartArea.bottom);
          ctx.stroke();
        }
      });

      ctx.setLineDash([]);
      ctx.restore();
    },
  }), [
    theme, language, projectType, actBreakpoints, midpointIndex, climaxIndex,
    displayScenes, warnings, emotionalPeakIndices, dialogueDensities, episodeGroups, activeTvEpisode
  ]);

  const datasets = useMemo(() => {
    const baseDatasets = [
      {
        label: language === 'ar' ? 'القوس المثالي' : 'Ideal Arc',
        data: idealArcData,
        borderColor: theme === 'dark' ? 'rgba(156, 163, 175, 0.4)' : 'rgba(107, 114, 128, 0.4)',
        backgroundColor: 'transparent',
        segment: { borderDash: () => [8, 4] as number[] },
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.4,
        fill: false,
        hidden: !visibleDatasets.idealArc,
      },
      {
        label: language === 'ar' ? 'توتر دووودة' : 'Doooda Tension',
        data: displayScenes.map((s) => s.ai_tension),
        borderColor: getColor('red', 1),
        backgroundColor: getColor('red', 0.1),
        pointBackgroundColor: displayScenes.map((s, idx) => {
          if (idx === climaxIndex) return getColor('red', 1);
          if (s.filler_ratio > 0.7) return getColor('red', 1);
          return getColor('red', 0.8);
        }),
        pointBorderColor: displayScenes.map((s, idx) =>
          idx === midpointIndex ? getColor('gold', 1) : s.filler_ratio > 0.7 ? getColor('red', 1) : '#fff'
        ),
        pointBorderWidth: displayScenes.map((s, idx) => {
          if (isChildrenType(projectType) && emotionalPeakIndices.has(idx)) return 3;
          return idx === midpointIndex ? 3 : s.filler_ratio > 0.7 ? 3 : 2;
        }),
        pointRadius: displayScenes.map((s, idx) => {
          if (isChildrenType(projectType) && emotionalPeakIndices.has(idx)) return 9;
          return idx === climaxIndex ? 10 : s.filler_ratio > 0.7 ? 8 : isChildrenType(projectType) ? 6 : 5;
        }),
        pointHoverRadius: 10,
        tension: isChildrenType(projectType) ? 0.6 : 0.4,
        fill: true,
        hidden: !visibleDatasets.aiTension,
      },
      {
        label: language === 'ar' ? 'سرعة دووودة' : 'Doooda Pace',
        data: isTheatreType(projectType) && dialogueDensities ? dialogueDensities : displayScenes.map((s) => s.ai_pace),
        borderColor: getColor('blue', 1),
        backgroundColor: getColor('blue', 0.05),
        pointBackgroundColor: getColor('blue', 0.8),
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: isChildrenType(projectType) ? 4 : 5,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: false,
        hidden: !visibleDatasets.aiPace,
      },
      {
        label: language === 'ar' ? 'التصعيد' : 'Build-up',
        data: displayScenes.map((s) => s.build_up_score),
        borderColor: `rgba(147, 51, 234, 1)`,
        backgroundColor: `rgba(147, 51, 234, 0.05)`,
        pointBackgroundColor: `rgba(147, 51, 234, 0.8)`,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: isChildrenType(projectType) ? 3 : 5,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: false,
        hidden: !visibleDatasets.buildUp,
      },
      {
        label: language === 'ar' ? 'التقدم الدرامي' : 'Dramatic Progress',
        data: displayScenes.map((s) => s.dramatic_progress_score),
        borderColor: getColor('green', 1),
        backgroundColor: getColor('green', 0.05),
        pointBackgroundColor: displayScenes.map((s) =>
          s.dramatic_progress_score < 0.4 ? 'rgba(249, 115, 22, 0.8)' : getColor('green', 0.8)
        ),
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: isChildrenType(projectType) ? 3 : 5,
        pointHoverRadius: 8,
        tension: 0.4,
        fill: false,
        hidden: !visibleDatasets.progress,
      },
      {
        label: language === 'ar' ? 'السببية' : 'Causality',
        data: displayScenes.map((s) => s.causality_score),
        borderColor: getColor('grey', 0.7),
        backgroundColor: getColor('grey', 0.05),
        pointBackgroundColor: getColor('grey', 0.6),
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        tension: 0.4,
        fill: false,
        hidden: !visibleDatasets.causality,
      },
    ];

    if (isTvType(projectType) && seasonalArcData && activeTvEpisode === null) {
      baseDatasets.push({
        label: language === 'ar' ? 'القوس الموسمي' : 'Seasonal Arc',
        data: displayScenes.map((_, idx) => {
          const epCount = seasonalArcData.length;
          const epIdx = Math.floor((idx / displayScenes.length) * epCount);
          return seasonalArcData[Math.min(epIdx, epCount - 1)];
        }),
        borderColor: getColor('gold', 0.7),
        backgroundColor: getColor('gold', 0.03),
        pointRadius: 0,
        pointHoverRadius: 0,
        segment: { borderDash: () => [6, 3] as number[] },
        tension: 0.5,
        fill: false,
        hidden: false,
      } as any);
    }

    return baseDatasets;
  }, [
    language, idealArcData, displayScenes, visibleDatasets, tensionColor, paceColor,
    climaxIndex, midpointIndex, emotionalPeakIndices, dialogueDensities,
    projectType, seasonalArcData, activeTvEpisode, theme
  ]);

  const chartHeight = isChildrenType(projectType)
    ? (displayScenes.length > 20 ? 440 : 380)
    : (displayScenes.length > 20 ? 550 : 480);

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    animation: {
      duration: isChildrenType(projectType) ? 1000 : 1500,
      easing: isChildrenType(projectType) ? 'easeOutBounce' : 'easeInOutCubic',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: (context) => {
          const tooltipModel = context.tooltip;
          if (tooltipModel.opacity === 0 || !tooltipModel.dataPoints || tooltipModel.dataPoints.length === 0) {
            setCustomTooltip(null);
            return;
          }

          const dataIndex = tooltipModel.dataPoints[0].dataIndex;
          const position = context.chart.canvas.getBoundingClientRect();

          setCustomTooltip({
            visible: true,
            x: position.left + tooltipModel.caretX,
            y: position.top + tooltipModel.caretY,
            sceneIndex: dataIndex,
          });
        },
      },
    },
    layout: {
      padding: {
        top: isFilmType(projectType) || isNovelType(projectType) || isTheatreType(projectType) ? 25 : 10,
      },
    },
    scales: {
      x: {
        grid: {
          color: theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.5)',
        },
        ticks: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          font: {
            size: 11,
            family: language === 'ar' ? 'Arial, "Segoe UI", sans-serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
        },
      },
      y: {
        min: 0,
        max: 1,
        title: {
          display: true,
          text: isNovelType(projectType)
            ? (language === 'ar' ? 'مستوى التوتر' : 'Tension Level')
            : isFilmType(projectType)
            ? (language === 'ar' ? 'شدة المشهد' : 'Scene Intensity')
            : isNonFiction(projectType)
            ? (language === 'ar' ? 'قوة الحجة' : 'Argument Strength')
            : (language === 'ar' ? 'المستوى' : 'Level'),
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          font: { size: 11 },
        },
        grid: {
          color: theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.5)',
        },
        ticks: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          font: {
            size: 11,
            family: language === 'ar' ? 'Arial, "Segoe UI", sans-serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          callback: (value) => `${(Number(value) * 100).toFixed(0)}%`,
        },
      },
    },
  }), [theme, language, projectType]);

  const toggleDataset = (key: keyof typeof visibleDatasets) => {
    setVisibleDatasets((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (chartRef.current) {
        chartRef.current.resize();
        chartRef.current.update();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const currentScene = customTooltip && displayScenes[customTooltip.sceneIndex];

  const hasLevel2 = typeConfig.hasLevel2;

  const currentSceneTitle = useMemo(() => {
    if (!currentScene) return null;
    const chapterTitle = currentScene.chapter_title || (language === 'ar'
      ? `${typeConfig.containerLabelAr} ${currentScene.chapter_index}`
      : `${typeConfig.containerLabelEn} ${currentScene.chapter_index}`);
    if (!hasLevel2) {
      return { chapterTitle, sceneTitle: null };
    }
    const sceneTitle = currentScene.scene_title || (language === 'ar'
      ? `${typeConfig.unitLabelAr} ${currentScene.scene_index}`
      : `${typeConfig.unitLabelEn} ${currentScene.scene_index}`);
    return { chapterTitle, sceneTitle };
  }, [currentScene, language, typeConfig, hasLevel2]);

  const getHeatmapColor = (intensity: number) => {
    if (isChildrenType(projectType)) {
      if (intensity < 0.3) return theme === 'dark' ? '#4b5563' : '#d1d5db';
      if (intensity < 0.6) return '#14b8a6';
      return '#0d9488';
    }
    if (intensity < 0.3) return theme === 'dark' ? '#4b5563' : '#d1d5db';
    if (intensity < 0.6) return theme === 'dark' ? '#f97316' : '#fb923c';
    return '#d62828';
  };

  const getScenePurposeIcon = (purpose?: string) => {
    switch (purpose) {
      case 'conflict': return <Swords className="w-3 h-3" />;
      case 'setup': return <Box className="w-3 h-3" />;
      case 'payoff': return <Target className="w-3 h-3" />;
      case 'transition': return <RefreshCw className="w-3 h-3" />;
      default: return null;
    }
  };

  const getScenePurposeLabel = (purpose?: string) => {
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
  };

  const episodeList = episodeGroups ? [...episodeGroups.keys()].sort((a, b) => a - b) : [];

  const graphTitle = () => {
    if (isFilmType(projectType)) return language === 'ar' ? 'تحليل بنية السيناريو' : 'Screenplay Structure Analysis';
    if (isTvType(projectType)) return language === 'ar' ? 'تحليل المسلسل - القوس الموسمي' : 'Series Analysis - Season Arc';
    if (isChildrenType(projectType)) return language === 'ar' ? 'تحليل قصة الأطفال' : "Children's Story Analysis";
    if (isTheatreType(projectType)) return language === 'ar' ? 'تحليل المسرحية - كثافة الحوار' : 'Theatre Analysis - Dialogue Density';
    if (isNonFiction(projectType)) return language === 'ar' ? 'تحليل تسلسل الحجج' : 'Argument Progression Analysis';
    return language === 'ar' ? 'تحليل دووودة الناقد' : 'Doooda Critic Analysis';
  };

  const graphSubtitle = () => {
    if (isFilmType(projectType)) return language === 'ar'
      ? 'يعرض البنية ثلاثية الفصول، نقطة المنتصف، والذروة الرئيسية'
      : 'Showing 3-act structure, midpoint, and main climax markers';
    if (isTvType(projectType)) return language === 'ar'
      ? 'القوس الذهبي = متوسط توتر الموسم — اختر حلقة لعرضها بشكل منفصل'
      : 'Gold arc = season tension average — select episode for isolated view';
    if (isChildrenType(projectType)) return language === 'ar'
      ? 'القمم العاطفية مُعلَّمة — منحنى أبسط ومركز على المشاركة'
      : 'Emotional peaks highlighted — simplified arc focused on engagement';
    if (isTheatreType(projectType)) return language === 'ar'
      ? 'الأعمدة الوردية = كثافة الحوار في كل مشهد'
      : 'Pink bars = dialogue density per scene';
    return language === 'ar'
      ? 'تحليل شامل للحبكة مع تقييم التوتر، السرعة، والتقدم الدرامي'
      : 'Comprehensive plot analysis with tension, pace, and dramatic progress';
  };

  if (sortedScenes.length === 0) {
    return (
      <div className={`p-8 text-center rounded-lg ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {language === 'ar'
            ? 'لا توجد بيانات مشاهد للرسم البياني. قم بتحليل الحبكة أولاً.'
            : 'No scene data available for the chart. Run the analysis first.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="mb-4">
        <h4 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {graphTitle()}
        </h4>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {graphSubtitle()}
        </p>
      </div>

      {isTvType(projectType) && episodeList.length > 1 && (
        <div className={`flex flex-wrap gap-2 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-900 bg-opacity-50' : 'bg-gray-50'}`}>
          <button
            onClick={() => setActiveTvEpisode(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTvEpisode === null
                ? 'bg-blue-600 text-white shadow-md'
                : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {language === 'ar' ? 'عرض كامل' : 'Full View'}
          </button>
          {episodeList.map(epIdx => (
            <button
              key={epIdx}
              onClick={() => setActiveTvEpisode(activeTvEpisode === epIdx ? null : epIdx)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTvEpisode === epIdx
                  ? 'bg-green-600 text-white shadow-md'
                  : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {language === 'ar' ? `حلقة ${epIdx}` : `Ep ${epIdx}`}
            </button>
          ))}
        </div>
      )}

      <div
        className={`flex flex-wrap gap-2 p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-900 bg-opacity-50' : 'bg-gray-50'
        }`}
      >
        <button
          onClick={() => toggleDataset('aiTension')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            visibleDatasets.aiTension
              ? 'bg-red-600 text-white shadow-md'
              : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${visibleDatasets.aiTension ? 'bg-white' : 'bg-red-600'}`} />
            {language === 'ar' ? 'توتر دووودة' : 'Doooda Tension'}
          </span>
        </button>

        {!isNonFiction(projectType) && (
          <button
            onClick={() => toggleDataset('aiPace')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              visibleDatasets.aiPace
                ? 'bg-blue-600 text-white shadow-md'
                : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${visibleDatasets.aiPace ? 'bg-white' : 'bg-blue-600'}`} />
              {language === 'ar' ? 'سرعة دووودة' : 'Doooda Pace'}
            </span>
          </button>
        )}

        {!isChildrenType(projectType) && (
          <button
            onClick={() => toggleDataset('buildUp')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              visibleDatasets.buildUp
                ? 'bg-purple-600 text-white shadow-md'
                : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${visibleDatasets.buildUp ? 'bg-white' : 'bg-purple-600'}`} />
              {language === 'ar' ? 'التصعيد' : 'Build-up'}
            </span>
          </button>
        )}

        <button
          onClick={() => toggleDataset('progress')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            visibleDatasets.progress
              ? 'bg-green-600 text-white shadow-md'
              : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${visibleDatasets.progress ? 'bg-white' : 'bg-green-600'}`} />
            {language === 'ar' ? 'التقدم' : 'Progress'}
          </span>
        </button>

        {!isChildrenType(projectType) && (
          <button
            onClick={() => toggleDataset('causality')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              visibleDatasets.causality
                ? 'bg-gray-600 text-white shadow-md'
                : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${visibleDatasets.causality ? 'bg-white' : 'bg-gray-600'}`} />
              {language === 'ar' ? 'السببية' : 'Causality'}
            </span>
          </button>
        )}

        <button
          onClick={() => toggleDataset('idealArc')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            visibleDatasets.idealArc
              ? 'bg-gray-600 text-white shadow-md'
              : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full border-2 ${visibleDatasets.idealArc ? 'border-white' : 'border-gray-600'}`}
              style={{ borderStyle: 'dashed' }}
            />
            {language === 'ar' ? 'القوس المثالي' : 'Ideal Arc'}
          </span>
        </button>
      </div>

      {warnings.length > 0 && (
        <div
          className={`p-2.5 rounded-lg border-l-4 border-orange-500 ${
            theme === 'dark' ? 'bg-orange-900 bg-opacity-20' : 'bg-orange-50'
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {language === 'ar' ? 'تحذيرات بنيوية' : 'Structural Warnings'}
              </h4>
              <ul className="space-y-0.5">
                {warnings.map((warning, idx) => (
                  <li key={idx} className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {warning.message} ({language === 'ar' ? 'المشاهد' : 'Scenes'} {warning.indices.join(', ')})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div
          className={`w-16 rounded-lg overflow-hidden shadow-lg ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-white'
          }`}
        >
          <div className="p-2 text-center">
            <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {language === 'ar' ? 'صراع' : 'Heat'}
            </p>
          </div>
          <div className="flex flex-col">
            {conflictIntensities.map((intensity, idx) => (
              <div
                key={idx}
                className="relative cursor-pointer transition-all"
                style={{
                  height: `${100 / conflictIntensities.length}%`,
                  backgroundColor: getHeatmapColor(intensity),
                  opacity: heatmapHover === idx ? 1 : 0.85,
                  transform: heatmapHover === idx ? 'scaleX(1.1)' : 'scaleX(1)',
                }}
                onMouseEnter={() => setHeatmapHover(idx)}
                onMouseLeave={() => setHeatmapHover(null)}
                title={`Scene ${idx + 1}: ${(intensity * 100).toFixed(0)}%`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div
            className={`relative p-4 rounded-lg shadow-lg ${
              theme === 'dark' ? 'bg-gray-900 bg-opacity-30' : 'bg-white'
            }`}
            style={{ height: displayScenes.length > 20 ? `${chartHeight + 70}px` : `${chartHeight}px` }}
          >
            <div className={displayScenes.length > 20 ? 'overflow-x-auto' : ''}>
              <div style={{ minWidth: displayScenes.length > 20 ? `${displayScenes.length * 50}px` : '100%', height: `${chartHeight - 60}px` }}>
                <Line key={`chart-${displayScenes.length}-${projectType}`} ref={chartRef} data={{ labels, datasets }} options={options} plugins={[customPlugin]} />
              </div>
            </div>

            {!isChildrenType(projectType) && (
              <div className="flex justify-center gap-3 mt-3 flex-wrap">
                {displayScenes.map((scene, idx) => {
                  const icon = getScenePurposeIcon(scene.scene_purpose);
                  if (!icon) return null;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col items-center ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}
                      title={scene.scene_purpose}
                    >
                      {icon}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {isFilmType(projectType) && (
        <div className={`p-3 rounded-lg grid grid-cols-3 gap-3 ${theme === 'dark' ? 'bg-gray-900 bg-opacity-50' : 'bg-gray-50'}`}>
          <div className={`p-3 rounded-lg text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
              {language === 'ar' ? 'نقطة المنتصف' : 'Midpoint'}
            </div>
            <div className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {language === 'ar' ? `م${midpointIndex + 1}` : `S${midpointIndex + 1}`}
            </div>
          </div>
          <div className={`p-3 rounded-lg text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="text-xs font-medium mb-1 text-red-500">
              {language === 'ar' ? 'الذروة الرئيسية' : 'Main Climax'}
            </div>
            <div className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {language === 'ar' ? `م${climaxIndex + 1}` : `S${climaxIndex + 1}`}
            </div>
          </div>
          <div className={`p-3 rounded-lg text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {language === 'ar' ? 'نسبة الصراع' : 'Conflict Ratio'}
            </div>
            <div className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {((displayScenes.filter(s => s.scene_purpose === 'conflict').length / Math.max(displayScenes.length, 1)) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      {isTvType(projectType) && seasonalArcData && activeTvEpisode === null && (
        <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-900 bg-opacity-50' : 'bg-gray-50'}`}>
          <h5 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {language === 'ar' ? 'متوسط توتر الحلقات' : 'Episode Tension Average'}
          </h5>
          <div className="flex gap-2 flex-wrap">
            {seasonalArcData.map((avg, i) => {
              const epIdx = episodeList[i];
              const epScenes = episodeGroups?.get(epIdx) || [];
              const lastScene = epScenes[epScenes.length - 1];
              const hasWeakEnd = lastScene && lastScene.ai_tension < 0.5;
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all ${
                    theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
                  } ${hasWeakEnd ? 'ring-1 ring-red-500' : ''} shadow`}
                  onClick={() => setActiveTvEpisode(epIdx)}
                  title={hasWeakEnd ? (language === 'ar' ? 'خطاف ضعيف' : 'Weak cliffhanger') : undefined}
                >
                  <div className="text-xs font-medium" style={{ color: avg > 0.6 ? '#ef4444' : avg > 0.4 ? '#f59e0b' : '#6b7280' }}>
                    {(avg * 100).toFixed(0)}%
                  </div>
                  <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {language === 'ar' ? `ح${epIdx}` : `Ep${epIdx}`}
                  </div>
                  {hasWeakEnd && <div className="w-2 h-2 rounded-full bg-red-500 mt-1" title={language === 'ar' ? 'نهاية ضعيفة' : 'Weak end'} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {customTooltip?.visible && currentScene && (
        <SmartTooltip
          x={customTooltip.x}
          y={customTooltip.y}
          theme={theme}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {currentSceneTitle
                  ? (currentSceneTitle.sceneTitle
                    ? `${currentSceneTitle.chapterTitle} - ${currentSceneTitle.sceneTitle}`
                    : currentSceneTitle.chapterTitle)
                  : (hasLevel2
                    ? (language === 'ar'
                      ? `${typeConfig.containerLabelAr} ${currentScene.chapter_index} - ${typeConfig.unitLabelAr} ${currentScene.scene_index}`
                      : `${typeConfig.containerLabelEn} ${currentScene.chapter_index} - ${typeConfig.unitLabelEn} ${currentScene.scene_index}`)
                    : (language === 'ar'
                      ? `${typeConfig.containerLabelAr} ${currentScene.chapter_index}`
                      : `${typeConfig.containerLabelEn} ${currentScene.chapter_index}`))
                }
              </h4>
              <div className="flex items-center gap-1">
                {currentScene.scene_purpose && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-600 text-white text-xs rounded-md">
                    {getScenePurposeIcon(currentScene.scene_purpose)}
                    <span>{getScenePurposeLabel(currentScene.scene_purpose)}</span>
                  </div>
                )}
                {isChildrenType(projectType) && emotionalPeakIndices.has(customTooltip.sceneIndex) && (
                  <div className="px-2 py-1 bg-teal-500 text-white text-xs rounded-md font-semibold">
                    {language === 'ar' ? 'ذروة عاطفية' : 'Emotional Peak'}
                  </div>
                )}
                {currentScene.filler_ratio > 0.6 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs rounded-md">
                    <AlertTriangle className="w-3 h-3" />
                    {language === 'ar' ? 'حشو' : 'Filler'}
                  </div>
                )}
                {currentScene.writer_tension &&
                  Math.abs(currentScene.writer_tension / 10 - currentScene.ai_tension) > 0.4 && (
                    <Zap className="w-4 h-4 text-yellow-500" />
                  )}
              </div>
            </div>

            {currentScene.comment && (
              <div className={`px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <p className={`text-xs italic ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  "{currentScene.comment}"
                </p>
              </div>
            )}

            {currentScene.accuracy_score !== undefined && (
              <div className={`px-3 py-2 rounded-lg ${
                currentScene.accuracy_score > 0.7
                  ? 'bg-green-500 bg-opacity-20'
                  : currentScene.accuracy_score > 0.4
                  ? 'bg-yellow-500 bg-opacity-20'
                  : 'bg-red-500 bg-opacity-20'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {language === 'ar' ? 'دقة التوقعات:' : 'Accuracy:'}
                  </span>
                  <span className={`text-xs font-bold ${
                    currentScene.accuracy_score > 0.7
                      ? 'text-green-600 dark:text-green-400'
                      : currentScene.accuracy_score > 0.4
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {(currentScene.accuracy_score * 100).toFixed(0)}%
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
                  {currentScene.writer_tension != null ? `${currentScene.writer_tension}/10` : '-'}
                </span>
              </div>
              <div>
                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {language === 'ar' ? 'توتر (دووودة):' : 'Tension (Doooda):'}
                </span>
                <span className={`ml-1 font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  {(currentScene.ai_tension * 10).toFixed(1)}/10
                </span>
              </div>
              <div>
                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {language === 'ar' ? 'سرعة (توقع):' : 'Pace (Expected):'}
                </span>
                <span className={`ml-1 font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {currentScene.writer_pace != null ? `${currentScene.writer_pace}/10` : '-'}
                </span>
              </div>
              <div>
                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {language === 'ar'
                    ? (isTheatreType(projectType) ? 'كثافة الحوار:' : 'سرعة (دووودة):')
                    : (isTheatreType(projectType) ? 'Dialogue Density:' : 'Pace (Doooda):')}
                </span>
                <span className={`ml-1 font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                  {isTheatreType(projectType) && dialogueDensities
                    ? `${(dialogueDensities[customTooltip.sceneIndex] * 100).toFixed(0)}%`
                    : `${(currentScene.ai_pace * 10).toFixed(1)}/10`}
                </span>
              </div>
              <div>
                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {language === 'ar' ? 'التصعيد:' : 'Build-up:'}
                </span>
                <span className={`ml-1 font-semibold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                  {(currentScene.build_up_score * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {language === 'ar' ? 'التقدم:' : 'Progress:'}
                </span>
                <span className={`ml-1 font-semibold ${
                  currentScene.dramatic_progress_score < 0.4
                    ? 'text-orange-500'
                    : theme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`}>
                  {(currentScene.dramatic_progress_score * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {customTooltip.sceneIndex === midpointIndex && (isFilmType(projectType) || isNovelType(projectType)) && (
              <div className="px-2 py-1 rounded text-xs font-semibold bg-yellow-500 text-white text-center">
                {language === 'ar' ? 'نقطة المنتصف' : 'Midpoint'}
              </div>
            )}

            {customTooltip.sceneIndex === climaxIndex && (
              <div className="px-2 py-1 rounded text-xs font-semibold bg-red-600 text-white text-center">
                {language === 'ar' ? 'الذروة الرئيسية' : 'Main Climax'}
              </div>
            )}

            <div className={`pt-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {language === 'ar' ? 'توصية:' : 'Recommendation:'}
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {currentScene.recommendation}
              </p>
            </div>
          </div>
        </SmartTooltip>
      )}
    </div>
  );
};

export default DooodaCriticGraph;
