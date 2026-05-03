import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, invokeWithAuth } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/LanguageContext';
import { Save, Plus, Brain, LayoutTemplate as BookTemplate } from 'lucide-react';
import PlotCanvas from '../components/plot/PlotCanvas';
import PlotAnalysisView from '../components/plot/PlotAnalysisView';
import ExecutePlotModal from '../components/plot/ExecutePlotModal';
import PlotTemplateModal from '../components/PlotTemplateModal';
import Button from '../components/Button';
import ThemeToggle from '../components/ThemeToggle';
import { applyPlotTemplate, api, getProjectGenres, getProjectTone } from '../services/api';
import { getProjectTypeConfig } from '../utils/projectTypeConfig';
import type { Project, Genre, Tone } from '../types';

interface PlotProject {
  id: string;
  project_id: string;
  executed: boolean;
  last_analysis_at: string | null;
  updated_at: string;
}

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
  accuracy_score?: number | null;
  causality_score?: number | null;
  dramatic_progress_score?: number | null;
  filler_ratio?: number | null;
  build_up_score?: number | null;
  scene_purpose?: string | null;
  ai_comment?: string | null;
  page_type?: 'single' | 'double';
}

const PlotEditor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [plotProject, setPlotProject] = useState<PlotProject | null>(null);
  const [chapters, setChapters] = useState<PlotChapter[]>([]);
  const [scenes, setScenes] = useState<Map<string, PlotScene[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isAnalysisOutdated, setIsAnalysisOutdated] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [mainProject, setMainProject] = useState<Project | null>(null);
  const [mainProjectGenres, setMainProjectGenres] = useState<Genre[]>([]);
  const [mainProjectTone, setMainProjectTone] = useState<Tone | null>(null);

  useEffect(() => {
    loadPlotData();
    loadTokenBalance();
    if (projectId) {
      api.getProject(projectId).then(setMainProject).catch(() => {});
      getProjectGenres(projectId).then(setMainProjectGenres).catch(() => {});
      getProjectTone(projectId).then(setMainProjectTone).catch(() => {});
    }
  }, [projectId]);

  const loadTokenBalance = async () => {
    try {
      setLoadingTokens(true);
      const { data, error, requiresAuth } = await invokeWithAuth<{
        id: string;
        tokens_balance: number;
        plan: string;
      }>('me', { method: 'GET' });

      if (requiresAuth) {
        setTokenBalance(0);
        return;
      }

      if (error) {
        console.error('Error loading token balance:', error);
        setTokenBalance(0);
        return;
      }

      setTokenBalance(data?.tokens_balance ?? 0);
    } catch (error) {
      console.error('Error loading token balance:', error);
      setTokenBalance(0);
    } finally {
      setLoadingTokens(false);
    }
  };

  const loadPlotData = async () => {
    if (!projectId) return;

    try {
      setLoading(true);

      // Load plot project
      let { data: plotProjectData, error: plotProjectError } = await supabase
        .from('plot_projects')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (plotProjectError) throw plotProjectError;

      // Create plot project if doesn't exist
      if (!plotProjectData) {
        const { data: newPlotProject, error: createError } = await supabase
          .from('plot_projects')
          .insert({ project_id: projectId })
          .select()
          .single();

        if (createError) throw createError;
        plotProjectData = newPlotProject;
      }

      setPlotProject(plotProjectData);

      // Load analysis
      const { data: analysisData } = await supabase
        .from('plot_analysis')
        .select('*')
        .eq('plot_project_id', plotProjectData.id)
        .maybeSingle();

      if (analysisData) {
        setAnalysis(analysisData.analysis_json);
        setIsAnalysisOutdated(false);
      }

      // Load chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('plot_chapters')
        .select('*')
        .eq('plot_project_id', plotProjectData.id)
        .order('order_index', { ascending: true });

      if (chaptersError) throw chaptersError;
      setChapters(chaptersData || []);

      // Load scenes for each chapter
      if (chaptersData && chaptersData.length > 0) {
        const chapterIds = chaptersData.map(c => c.id);
        const { data: scenesData, error: scenesError } = await supabase
          .from('plot_scenes')
          .select('*')
          .in('chapter_id', chapterIds)
          .order('order_index', { ascending: true });

        if (scenesError) throw scenesError;

        const scenesMap = new Map<string, PlotScene[]>();
        scenesData?.forEach(scene => {
          const chapterScenes = scenesMap.get(scene.chapter_id) || [];
          chapterScenes.push(scene);
          scenesMap.set(scene.chapter_id, chapterScenes);
        });

        setScenes(scenesMap);
      }
    } catch (error) {
      console.error('Error loading plot data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAnalysisOutdatedIfExists = () => {
    if (analysis) {
      setIsAnalysisOutdated(true);
    }
  };

  const handleAddChapter = () => {
    if (!plotProject) return;

    const currentTypeConfig = getProjectTypeConfig(
      (mainProject?.project_type as any) ?? 'novel'
    );
    const newChapter: PlotChapter = {
      id: `temp-${Date.now()}`,
      plot_project_id: plotProject.id,
      order_index: chapters.length + 1,
      title: currentTypeConfig.hasLevel2
        ? (language === 'ar' ? `${currentTypeConfig.containerLabelAr} جديد` : `New ${currentTypeConfig.containerLabelEn}`)
        : (language === 'ar' ? `${currentTypeConfig.unitLabelAr} جديد` : `New ${currentTypeConfig.unitLabelEn}`),
      summary: '',
      goal: null,
      tension_level: 5,
      pace_level: 5,
      has_climax: false,
      system_notes: null,
      user_notes: null,
    };

    setChapters([...chapters, newChapter]);
    setHasChanges(true);
    markAnalysisOutdatedIfExists();
  };

  const handleAddScene = (chapterId: string, pageType: 'single' | 'double' = 'single') => {
    const chapterScenes = scenes.get(chapterId) || [];
    const currentTypeConfig = getProjectTypeConfig(
      (mainProject?.project_type as any) ?? 'novel'
    );
    const isChildrenStory = mainProject?.project_type === 'children_story';
    const newScene: PlotScene = {
      id: `temp-${Date.now()}`,
      chapter_id: chapterId,
      order_index: chapterScenes.length + 1,
      title: language === 'ar'
        ? `${currentTypeConfig.unitLabelAr} جديد`
        : `New ${currentTypeConfig.unitLabelEn}`,
      summary: '',
      hook: null,
      tension_level: 5,
      pace_level: 5,
      has_climax: false,
      system_notes: null,
      user_notes: null,
      ...(isChildrenStory && { page_type: pageType }),
    };

    const newScenes = new Map(scenes);
    newScenes.set(chapterId, [...chapterScenes, newScene]);
    setScenes(newScenes);
    setHasChanges(true);
    markAnalysisOutdatedIfExists();
  };

  const handleUpdateChapter = (chapterId: string, updates: Partial<PlotChapter>) => {
    setChapters(chapters.map(ch =>
      ch.id === chapterId ? { ...ch, ...updates } : ch
    ));
    setHasChanges(true);
    markAnalysisOutdatedIfExists();
  };

  const handleUpdateScene = (sceneId: string, updates: Partial<PlotScene>) => {
    const newScenes = new Map(scenes);
    scenes.forEach((chapterScenes, chapterId) => {
      const updatedScenes = chapterScenes.map(scene =>
        scene.id === sceneId ? { ...scene, ...updates } : scene
      );
      newScenes.set(chapterId, updatedScenes);
    });
    setScenes(newScenes);
    setHasChanges(true);
    markAnalysisOutdatedIfExists();
  };

  const handleDeleteChapter = (chapterId: string) => {
    setChapters(chapters.filter(ch => ch.id !== chapterId));
    scenes.delete(chapterId);
    setScenes(new Map(scenes));
    setHasChanges(true);
    markAnalysisOutdatedIfExists();
  };

  const handleDeleteScene = (sceneId: string, chapterId: string) => {
    const chapterScenes = scenes.get(chapterId) || [];
    const newScenes = new Map(scenes);
    newScenes.set(chapterId, chapterScenes.filter(s => s.id !== sceneId));
    setScenes(newScenes);
    setHasChanges(true);
    markAnalysisOutdatedIfExists();
  };

  const handleReorderChapters = (reorderedChapters: PlotChapter[]) => {
    const chaptersWithNewOrder = reorderedChapters.map((ch, index) => ({
      ...ch,
      order_index: index + 1,
    }));
    setChapters(chaptersWithNewOrder);
    setHasChanges(true);
    markAnalysisOutdatedIfExists();
  };

  const handleReorderScenes = (chapterId: string, reorderedScenes: PlotScene[]) => {
    const scenesWithNewOrder = reorderedScenes.map((scene, index) => ({
      ...scene,
      order_index: index + 1,
    }));
    const newScenes = new Map(scenes);
    newScenes.set(chapterId, scenesWithNewOrder);
    setScenes(newScenes);
    setHasChanges(true);
    markAnalysisOutdatedIfExists();
  };

  const handleExecutePlot = async () => {
    if (!plotProject) return;

    if (plotProject.executed) {
      alert(
        language === 'ar'
          ? 'تم تنفيذ المخطط مسبقاً'
          : 'Plot has already been executed'
      );
      return;
    }

    if (hasChanges) {
      alert(
        language === 'ar'
          ? 'يجب حفظ التغييرات أولاً'
          : 'Please save changes first'
      );
      return;
    }

    setShowExecuteModal(true);
  };

  const handleConfirmExecution = async () => {
    if (!plotProject) return;

    try {
      setExecuting(true);

      const { data, error, requiresAuth } = await invokeWithAuth('execute-plot', {
        body: {
          plot_project_id: plotProject.id,
          project_id: plotProject.project_id,
        },
      });

      if (requiresAuth) {
        alert(language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'You must be logged in');
        setExecuting(false);
        return;
      }

      if (error) {
        throw error;
      }

      const result = data;

      if (result?.code === 'ALREADY_EXECUTED') {
        alert(
          language === 'ar'
            ? 'تم تنفيذ المخطط مسبقاً'
            : 'Plot has already been executed'
        );

        setPlotProject({ ...plotProject, executed: true });
        setShowExecuteModal(false);
        return;
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      setPlotProject({ ...plotProject, executed: true });
      setShowExecuteModal(false);

      if (typeConfig.hasLevel2) {
        alert(
          language === 'ar'
            ? `تم تنفيذ المخطط بنجاح!\nتم إنشاء ${result.chapters_created} ${typeConfig.containerLabelAr} و ${result.scenes_created} ${typeConfig.unitLabelAr}`
            : `Plot executed successfully!\nCreated ${result.chapters_created} ${typeConfig.containerLabelPluralEn} and ${result.scenes_created} ${typeConfig.unitLabelPluralEn}`
        );
      } else {
        alert(
          language === 'ar'
            ? `تم تنفيذ المخطط بنجاح!\nتم إنشاء ${result.chapters_created} ${typeConfig.unitLabelAr}`
            : `Plot executed successfully!\nCreated ${result.chapters_created} ${typeConfig.unitLabelPluralEn}`
        );
      }

      navigate(`/projects/${plotProject.project_id}`);
    } catch (error) {
      console.error('Error executing plot:', error);
      alert(
        language === 'ar'
          ? 'فشل تنفيذ المخطط'
          : 'Failed to execute plot'
      );
    } finally {
      setExecuting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!plotProject) return;

    try {
      setAnalyzing(true);

      let chaptersData: any[];
      let scenesData: any[];

      const isChildrenStory = mainProject?.project_type === 'children_story';
      
      if (!typeConfig.hasLevel2) {
        chaptersData = [];
        scenesData = chapters.map(ch => ({
          chapter_index: 1,
          order_index: ch.order_index,
          title: ch.title,
          summary: ch.summary,
          hook: ch.user_notes || '',
          tension_level: ch.tension_level || 5,
          pace_level: ch.pace_level || 5,
          has_climax: ch.has_climax,
          ...(isChildrenStory && { page_type: 'single' }),
        }));
      } else {
        chaptersData = chapters.map(ch => ({
          order_index: ch.order_index,
          title: ch.title,
          summary: ch.summary,
          tension_level: ch.tension_level || 5,
          pace_level: ch.pace_level || 5,
          has_climax: ch.has_climax,
        }));

        scenesData = [];
        scenes.forEach((chapterScenes, chapterId) => {
          const chapter = chapters.find(ch => ch.id === chapterId);
          if (!chapter) return;

          chapterScenes.forEach(scene => {
            const sceneData: any = {
              chapter_index: chapter.order_index,
              order_index: scene.order_index,
              title: scene.title,
              summary: scene.summary,
              hook: scene.hook || '',
              tension_level: scene.tension_level || 5,
              pace_level: scene.pace_level || 5,
              has_climax: scene.has_climax,
            };
            if (isChildrenStory && scene.page_type) {
              sceneData.page_type = scene.page_type;
            }
            scenesData.push(sceneData);
          });
        });
      }

      const { data, error, requiresAuth } = await invokeWithAuth('analyze-plot', {
        body: {
          plot_project_id: plotProject.id,
          chapters: chaptersData,
          scenes: scenesData,
          language,
          project_type: mainProject?.project_type,
          genres: mainProjectGenres.map(g => g.slug),
          tone: mainProjectTone?.slug,
        },
      });

      if (requiresAuth) {
        alert(language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'You must be logged in');
        return;
      }

      if (error) {
        throw error;
      }

      const result = data;

      if (result?.status === 402 || result?.error?.includes('token')) {
        alert(result.error || (language === 'ar' ? 'رصيد التوكنز غير كافٍ' : 'Insufficient token balance'));
        return;
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      setAnalysis(result.analysis);
      setIsAnalysisOutdated(false);
      setShowAnalysis(true);

      if (result.tokens_remaining !== undefined) {
        setTokenBalance(result.tokens_remaining);
      }

      if (result.analysis?.scene_scores) {
        const sceneScores = result.analysis.scene_scores;

        for (const scoreData of sceneScores) {
          const chapter = chapters.find(ch => ch.order_index === scoreData.chapter_index);
          if (!chapter) continue;

          const chapterScenes = scenes.get(chapter.id);
          if (!chapterScenes) continue;

          const sceneIdx = scoreData.scene_index ?? scoreData.order_index;
          const scene = chapterScenes.find(s => s.order_index === sceneIdx);
          if (!scene) continue;

          const writerTension = scoreData.writer_tension
            ? scoreData.writer_tension / 10
            : scene.tension_level
            ? scene.tension_level / 10
            : null;
          const writerPace = scoreData.writer_pace
            ? scoreData.writer_pace / 10
            : scene.pace_level
            ? scene.pace_level / 10
            : null;

          const { error: updateError } = await supabase
            .from('plot_scenes')
            .update({
              ai_tension: scoreData.ai_tension,
              ai_pace: scoreData.ai_pace,
              writer_tension: writerTension,
              writer_pace: writerPace,
              accuracy_score: scoreData.accuracy_score,
              causality_score: scoreData.causality_score,
              dramatic_progress_score: scoreData.dramatic_progress_score,
              filler_ratio: scoreData.filler_ratio,
              build_up_score: scoreData.build_up_score,
              scene_purpose: scoreData.scene_purpose,
              ai_comment: scoreData.comment,
            })
            .eq('id', scene.id);

          if (updateError) {
            console.error('Failed to update scene scores:', updateError);
          }
        }

        await loadPlotData();
      }

      alert(
        language === 'ar'
          ? `تم التحليل بنجاح! استهلك ${result.tokens_used} توكن. الرصيد المتبقي: ${result.tokens_remaining}`
          : `Analysis complete! Used ${result.tokens_used} tokens. Remaining: ${result.tokens_remaining}`
      );
    } catch (error) {
      console.error('Error analyzing plot:', error);
      alert(
        language === 'ar'
          ? 'فشل تحليل الحبكة'
          : 'Failed to analyze plot'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyTemplate = async (templateId: string, chapterCount: number) => {
    if (!projectId) return;

    try {
      await applyPlotTemplate(projectId, templateId, chapterCount);

      setShowTemplateModal(false);

      await loadPlotData();

      setHasChanges(false);

      alert(
        language === 'ar'
          ? `تم تطبيق القالب بنجاح! تم إنشاء ${chapterCount} ${typeConfig.containerLabelAr}`
          : `Template applied successfully! Created ${chapterCount} ${typeConfig.containerLabelPluralEn}`
      );
    } catch (error) {
      console.error('Error applying template:', error);
      alert(language === 'ar' ? 'فشل تطبيق القالب' : 'Failed to apply template');
      throw error;
    }
  };

  const handleSave = async () => {
    if (!plotProject) return;

    try {
      setSaving(true);

      // Delete existing chapters and scenes
      const existingChapterIds = chapters
        .filter(ch => !ch.id.startsWith('temp-'))
        .map(ch => ch.id);

      if (existingChapterIds.length > 0) {
        await supabase
          .from('plot_chapters')
          .delete()
          .eq('plot_project_id', plotProject.id);
      }

      // Insert chapters with validation
      const chaptersToInsert = chapters.map(ch => ({
        plot_project_id: plotProject.id,
        order_index: Math.max(1, ch.order_index || 1),
        title: ch.title,
        summary: ch.summary,
        goal: ch.goal,
        tension_level: ch.tension_level ? Math.max(1, Math.min(10, ch.tension_level)) : null,
        pace_level: ch.pace_level ? Math.max(1, Math.min(10, ch.pace_level)) : null,
        has_climax: ch.has_climax,
        system_notes: ch.system_notes,
        user_notes: ch.user_notes,
      }));

      const { data: insertedChapters, error: chaptersError } = await supabase
        .from('plot_chapters')
        .insert(chaptersToInsert)
        .select();

      if (chaptersError) throw chaptersError;

      // Create mapping from temp IDs to real IDs
      const idMapping = new Map<string, string>();
      chapters.forEach((tempChapter, index) => {
        if (insertedChapters && insertedChapters[index]) {
          idMapping.set(tempChapter.id, insertedChapters[index].id);
        }
      });

      // Insert scenes with correct chapter IDs and validation
      const allScenes: any[] = [];
      scenes.forEach((chapterScenes, oldChapterId) => {
        const newChapterId = idMapping.get(oldChapterId) || oldChapterId;
        chapterScenes.forEach(scene => {
          allScenes.push({
            chapter_id: newChapterId,
            order_index: Math.max(1, scene.order_index || 1),
            title: scene.title,
            summary: scene.summary,
            hook: scene.hook || null,
            tension_level: scene.tension_level ? Math.max(1, Math.min(10, scene.tension_level)) : null,
            pace_level: scene.pace_level ? Math.max(1, Math.min(10, scene.pace_level)) : null,
            has_climax: scene.has_climax,
            system_notes: scene.system_notes,
            user_notes: scene.user_notes,
          });
        });
      });

      if (allScenes.length > 0) {
        const { error: scenesError } = await supabase
          .from('plot_scenes')
          .insert(allScenes);

        if (scenesError) throw scenesError;
      }

      setHasChanges(false);
      await loadPlotData();
    } catch (error) {
      console.error('Error saving plot:', error);
      alert(language === 'ar' ? 'فشل حفظ خط الحبكة' : 'Failed to save plot');
    } finally {
      setSaving(false);
    }
  };

  const typeConfig = getProjectTypeConfig(
    (mainProject?.project_type as any) ?? 'novel'
  );
  const containerLabel = language === 'ar' ? typeConfig.containerLabelAr : typeConfig.containerLabelEn;
  const unitLabel = language === 'ar' ? typeConfig.unitLabelAr : typeConfig.unitLabelEn;
  const addUnitLabel = language === 'ar' ? typeConfig.addUnitLabelAr : typeConfig.addUnitLabelEn;
  const addContainerLabel = typeConfig.hasLevel2
    ? (language === 'ar' ? typeConfig.addContainerLabelAr : typeConfig.addContainerLabelEn)
    : (language === 'ar' ? typeConfig.addUnitLabelAr : typeConfig.addUnitLabelEn);
  const plotLevel1Label = typeConfig.hasLevel2
    ? containerLabel
    : (language === 'ar' ? typeConfig.unitLabelAr : typeConfig.unitLabelEn);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center justify-center rounded-lg shrink-0"
              style={{ width: 32, height: 32, backgroundColor: '#111', gap: 3 }}
              title={language === 'ar' ? 'المشاريع' : 'Projects'}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'white', display: 'inline-block' }} />
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'white', display: 'inline-block' }} />
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'white', display: 'inline-block' }} />
            </Link>
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
            >
              {language === 'ar' ? 'رجوع' : 'Back'}
            </button>
            <div className="h-6 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {language === 'ar' ? 'خط الحبكة' : 'Plot Canvas'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {tokenBalance !== null && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span>🪙</span>
                <span>{loadingTokens ? '...' : tokenBalance.toLocaleString()}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  {language === 'ar' ? 'رمز' : 'tokens'}
                </span>
              </div>
            )}

            <ThemeToggle />

            {analysis && (
              <Button
                onClick={() => setShowAnalysis(true)}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                {language === 'ar' ? 'عرض التحليل' : 'View Analysis'}
              </Button>
            )}

            <Button
              onClick={() => setShowTemplateModal(true)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <BookTemplate className="w-4 h-4" />
              {language === 'ar' ? 'نماذج الحبكات الجاهزة' : 'Plot Templates'}
            </Button>

            <Button
              onClick={handleAddChapter}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {typeConfig.hasLevel2 ? addContainerLabel : addUnitLabel}
            </Button>

            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <PlotCanvas
        chapters={chapters}
        scenes={scenes}
        onUpdateChapter={handleUpdateChapter}
        onUpdateScene={handleUpdateScene}
        onDeleteChapter={handleDeleteChapter}
        onDeleteScene={handleDeleteScene}
        onReorderChapters={handleReorderChapters}
        onReorderScenes={handleReorderScenes}
        onAddScene={handleAddScene}
        containerLabel={plotLevel1Label}
        unitLabel={unitLabel}
        addUnitLabel={addUnitLabel}
        hasLevel2={typeConfig.hasLevel2}
        language={language}
        analysis={analysis}
      />

      {/* Analyze Button */}
      {chapters.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || hasChanges}
            className="flex items-center gap-2 px-6 py-3 text-lg shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            <Brain className="w-5 h-5" />
            {analyzing
              ? (language === 'ar' ? 'جاري التحليل...' : 'Analyzing...')
              : (language === 'ar' ? 'تحليل دووودة الناقد' : 'Doooda Critic Analysis')}
          </Button>
          {hasChanges && (
            <p className="text-center mt-2 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900 px-3 py-1 rounded">
              {language === 'ar' ? 'احفظ التغييرات أولاً' : 'Save changes first'}
            </p>
          )}
        </div>
      )}

      {/* Analysis View */}
      {showAnalysis && analysis && plotProject && (
        <PlotAnalysisView
          analysis={analysis}
          isOutdated={isAnalysisOutdated}
          language={language}
          executed={plotProject.executed}
          chapters={chapters}
          scenes={scenes}
          plotProjectId={plotProject.id}
          onClose={() => setShowAnalysis(false)}
          onExecute={handleExecutePlot}
          onAnalysisUpdated={(updated) => setAnalysis(updated)}
          projectType={mainProject?.project_type}
        />
      )}

      {/* Execute Modal */}
      {showExecuteModal && (
        <ExecutePlotModal
          language={language}
          onConfirm={handleConfirmExecution}
          onCancel={() => setShowExecuteModal(false)}
          executing={executing}
        />
      )}

      {/* Template Modal */}
      {showTemplateModal && projectId && (
        <PlotTemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          projectId={projectId}
          onApply={handleApplyTemplate}
        />
      )}
    </div>
  );
};

export default PlotEditor;
