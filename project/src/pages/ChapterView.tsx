import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { api, getChapter, getScenes, createScene, updateSceneOrder, createTask, deleteScene, toggleChapterActive, toggleSceneActive, toggleSceneCompleted, getMyCollaboratorRoleForProject, requestItemDeletion } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Project, Chapter, Scene } from '../types';
import { getProjectTypeConfig, formatSceneHeader } from '../utils/projectTypeConfig';
import ContextMenu from '../components/ContextMenu';
import SceneModal from '../components/SceneModal';
import NoteModal from '../components/NoteModal';
import GlobalHeader from '../components/GlobalHeader';
import { dispatchAskDoooda } from '../components/doooda/dispatchAskDoooda';
import { useDooodaAccess } from '../components/doooda/useDooodaAccess';
import { Brain, Share2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import SceneAnalysisPopup, { SceneAnalysisScore } from '../components/plot/SceneAnalysisPopup';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../contexts/ThemeContext';
import ScopedShareModal from '../components/ScopedShareModal';
import { useScopeAccess } from '../hooks/useScopeAccess';

interface ContextMenuState {
  x: number;
  y: number;
  options: Array<{ label: string; onClick: () => void }>;
}

export default function ChapterView() {
  const { projectId, chapterId } = useParams<{ projectId: string; chapterId: string }>();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const dooodaAccess = useDooodaAccess();
  const [project, setProject] = useState<Project | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showSceneModal, setShowSceneModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [chapterAiScore, setChapterAiScore] = useState<SceneAnalysisScore | null>(null);
  const [sceneAiScores, setSceneAiScores] = useState<Record<number, SceneAnalysisScore>>({});
  const [showChapterAnalysis, setShowChapterAnalysis] = useState(false);
  const [showSceneAnalysis, setShowSceneAnalysis] = useState<number | null>(null);
  const [collaboratorRole, setCollaboratorRole] = useState<string | null>(null);
  const [deletionRequestSent, setDeletionRequestSent] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const chapterBrainRef = useRef<HTMLButtonElement>(null);
  const sceneBrainRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const isOwner = project ? project.user_id === user?.id : false;
  const isManager = collaboratorRole === 'manager';

  const scopeCheck = useScopeAccess(projectId, 'chapter', chapterId, project?.user_id);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
    if (chapterId) {
      loadChapter();
      loadScenes();
    }
  }, [chapterId, projectId]);

  useEffect(() => {
    if (projectId && user) {
      getMyCollaboratorRoleForProject(projectId).then(role => setCollaboratorRole(role));
    }
  }, [projectId, user]);

  async function loadProject() {
    try {
      if (!projectId) return;
      const data = await api.getProject(projectId);
      setProject(data);
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  }

  const isBookProject = project?.project_type === 'book';
  const typeConfig = project ? getProjectTypeConfig(project.project_type) : getProjectTypeConfig('novel');

  const getSceneLabel = () => language === 'ar' ? typeConfig.unitLabelAr : typeConfig.unitLabelEn;
  const getSceneLabelPlural = () => language === 'ar' ? typeConfig.unitLabelPluralAr : typeConfig.unitLabelPluralEn;
  const getAddSceneLabel = () => language === 'ar' ? typeConfig.addUnitLabelAr : typeConfig.addUnitLabelEn;
  const getContainerLabel = () => language === 'ar' ? typeConfig.containerLabelAr : typeConfig.containerLabelEn;

  async function loadChapter() {
    try {
      if (!chapterId) return;
      const data = await getChapter(chapterId);
      setChapter(data);
      if (projectId && data?.chapter_number) {
        loadAiScores(data.chapter_number, projectId);
      }
    } catch (error) {
      console.error('Failed to load chapter:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadScenes() {
    try {
      if (!chapterId) return;
      const data = await getScenes(chapterId);
      setScenes(data);
    } catch (error) {
      console.error('Failed to load scenes:', error);
    }
  }

  async function loadAiScores(chapterNumber: number, pId: string) {
    try {
      const { data: plotProject } = await supabase
        .from('plot_projects')
        .select('id')
        .eq('project_id', pId)
        .maybeSingle();

      if (!plotProject) return;

      const { data: plotChapter } = await supabase
        .from('plot_chapters')
        .select('id')
        .eq('plot_project_id', plotProject.id)
        .eq('order_index', chapterNumber)
        .maybeSingle();

      if (!plotChapter) return;

      const { data: plotScenes } = await supabase
        .from('plot_scenes')
        .select('*')
        .eq('chapter_id', plotChapter.id)
        .order('order_index', { ascending: true });

      if (!plotScenes || plotScenes.length === 0) return;

      const firstScene = plotScenes[0];
      if (firstScene.ai_tension != null) {
        const chapterScore: SceneAnalysisScore = {
          ai_tension: firstScene.ai_tension,
          ai_pace: firstScene.ai_pace ?? 0,
          writer_tension: firstScene.writer_tension != null ? firstScene.writer_tension * 10 : null,
          writer_pace: firstScene.writer_pace != null ? firstScene.writer_pace * 10 : null,
          accuracy_score: firstScene.accuracy_score,
          causality_score: firstScene.causality_score ?? 0,
          dramatic_progress_score: firstScene.dramatic_progress_score ?? 0,
          filler_ratio: firstScene.filler_ratio ?? 0,
          build_up_score: firstScene.build_up_score ?? 0,
          recommendation: firstScene.recommendation ?? '',
          comment: firstScene.ai_comment,
          has_climax: firstScene.has_climax,
          scene_purpose: firstScene.scene_purpose,
          is_midpoint: firstScene.is_midpoint ?? false,
          is_climax: firstScene.is_climax ?? false,
        };
        setChapterAiScore(chapterScore);
      }

      const byPosition: Record<number, SceneAnalysisScore> = {};
      plotScenes.forEach((ps, idx) => {
        if (ps.ai_tension != null) {
          byPosition[idx + 1] = {
            ai_tension: ps.ai_tension,
            ai_pace: ps.ai_pace ?? 0,
            writer_tension: ps.writer_tension != null ? ps.writer_tension * 10 : null,
            writer_pace: ps.writer_pace != null ? ps.writer_pace * 10 : null,
            accuracy_score: ps.accuracy_score,
            causality_score: ps.causality_score ?? 0,
            dramatic_progress_score: ps.dramatic_progress_score ?? 0,
            filler_ratio: ps.filler_ratio ?? 0,
            build_up_score: ps.build_up_score ?? 0,
            recommendation: ps.recommendation ?? '',
            comment: ps.ai_comment,
            has_climax: ps.has_climax,
            scene_purpose: ps.scene_purpose,
            is_midpoint: ps.is_midpoint ?? false,
            is_climax: ps.is_climax ?? false,
          };
        }
      });
      setSceneAiScores(byPosition);
    } catch (error) {
      console.error('Failed to load AI scores:', error);
    }
  }

  const handleToggleActive = async () => {
    if (!chapter || !chapterId) return;

    const newActiveState = !chapter.is_active;
    const containerLabel = getContainerLabel();
    const confirmMessage = newActiveState
      ? (language === 'ar' ? `هل تريد تفعيل هذا ${containerLabel}؟` : `Do you want to activate this ${containerLabel}?`)
      : (language === 'ar' ? `هل تريد تعطيل هذا ${containerLabel}؟` : `Do you want to deactivate this ${containerLabel}?`);

    if (window.confirm(confirmMessage)) {
      try {
        await toggleChapterActive(chapterId, newActiveState);
        await loadChapter();
      } catch (error) {
        console.error('Failed to toggle chapter active state:', error);
        alert(language === 'ar' ? `فشل تغيير حالة ${containerLabel}` : `Failed to change ${containerLabel} state`);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';

    const options = [
      {
        label: getAddSceneLabel(),
        onClick: () => setShowSceneModal(true),
      },
      {
        label: language === 'ar' ? 'إضافة ملاحظة' : 'Add Note',
        onClick: () => setShowNoteModal(true),
      },
    ];

    if (selectedText.length > 0 && dooodaAccess.visible) {
      options.push({
        label: language === 'ar' ? 'اسأل دووودة' : 'Ask doooda',
        onClick: () => dispatchAskDoooda(selectedText, {
          level: 'selected_text',
          projectId: projectId,
          chapter: chapter ? { title: chapter.title, number: chapter.chapter_number, summary: chapter.summary } : undefined,
        }),
      });
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options,
    });
  };

  const handleSaveScene = async (sceneData: { title: string; summary?: string; hook?: string }) => {
    if (!chapterId) return;
    try {
      await createScene(chapterId, sceneData);
      await loadScenes();
      setShowSceneModal(false);
    } catch (error) {
      console.error('Failed to create scene:', error);
    }
  };

  const handleSaveNote = async (noteData: { description: string; chapterId?: string; sceneId?: string }) => {
    if (!projectId || !chapter) return;
    try {
      await createTask({
        project_id: projectId,
        context_type: 'chapter_summary',
        description: noteData.description,
        chapter_number: chapter.chapter_number,
        chapter_id: noteData.chapterId,
      });
      setShowNoteModal(false);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newScenes = [...scenes];
    const draggedScene = newScenes[draggedIndex];
    newScenes.splice(draggedIndex, 1);
    newScenes.splice(index, 0, draggedScene);

    setScenes(newScenes);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    const updates = scenes.map((scene, index) => ({
      id: scene.id,
      position: index + 1,
    }));

    try {
      await updateSceneOrder(updates);
    } catch (error) {
      console.error('Failed to update scene order:', error);
      await loadScenes();
    }

    setDraggedIndex(null);
  };

  const handleSceneClick = (sceneId: string) => {
    navigate(`/projects/${projectId}/chapters/${chapterId}/scenes/${sceneId}`);
  };

  const handleDeleteScene = async (sceneId: string, sceneTitle: string) => {
    if (!chapterId || !projectId) return;

    if (isManager && !isOwner) {
      if (window.confirm(
        language === 'ar'
          ? `سيتم إرسال طلب حذف "${sceneTitle}" إلى صاحب المشروع للموافقة. هل تريد المتابعة؟`
          : `A deletion request for "${sceneTitle}" will be sent to the project owner for approval. Continue?`
      )) {
        try {
          await requestItemDeletion(projectId, 'scene', sceneId, sceneTitle, project?.title || '');
          setDeletionRequestSent(true);
          setTimeout(() => setDeletionRequestSent(false), 3000);
        } catch (error) {
          console.error('Failed to send deletion request:', error);
        }
      }
      return;
    }

    if (window.confirm(language === 'ar' ? `هل تريد حذف "${sceneTitle}"؟` : `Delete "${sceneTitle}"?`)) {
      try {
        await deleteScene(sceneId);
        await loadScenes();
      } catch (error) {
        console.error('Failed to delete scene:', error);
      }
    }
  };

  const handleToggleSceneActive = async (sceneId: string, currentState: boolean, sceneTitle: string) => {
    const newActiveState = !currentState;
    const confirmMessage = newActiveState
      ? (language === 'ar' ? `هل تريد تفعيل "${sceneTitle}"؟` : `Do you want to activate "${sceneTitle}"?`)
      : (language === 'ar' ? `هل تريد تعطيل "${sceneTitle}"؟` : `Do you want to deactivate "${sceneTitle}"?`);

    if (window.confirm(confirmMessage)) {
      try {
        await toggleSceneActive(sceneId, newActiveState);
        await loadScenes();
      } catch (error) {
        console.error('Failed to toggle scene active state:', error);
        alert(language === 'ar' ? `فشل تغيير حالة ${getSceneLabel()}` : `Failed to change ${getSceneLabel()} state`);
      }
    }
  };

  const handleToggleSceneCompleted = async (e: React.MouseEvent, sceneId: string, currentCompleted: boolean) => {
    e.stopPropagation();
    try {
      await toggleSceneCompleted(sceneId, !currentCompleted);
      await loadScenes();
    } catch (error) {
      console.error('Failed to toggle scene completion:', error);
    }
  };

  if (loading) {
    return (
      <>
        <GlobalHeader />
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
        </div>
      </>
    );
  }

  if (!chapter) {
    return (
      <>
        <GlobalHeader />
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {language === 'ar' ? `${getContainerLabel()} غير موجود` : `${getContainerLabel()} not found`}
            </h2>
            <Link to={`/projects/${projectId}`} style={{ color: 'var(--color-accent)' }}>
              {language === 'ar' ? 'العودة إلى المشروع' : 'Back to project'}
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!scopeCheck.loading && !scopeCheck.allowed && !scopeCheck.isOwner) {
    return (
      <>
        <GlobalHeader />
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="text-center max-w-sm px-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#ef4444' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {language === 'ar' ? 'لا يوجد وصول' : 'Access Restricted'}
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
              {language === 'ar'
                ? 'لا تملك صلاحية للوصول إلى هذا الفصل. صلاحيتك محدودة بجزء آخر من المشروع.'
                : "You don't have access to this chapter. Your access is limited to a different part of the project."}
            </p>
            <Link
              to="/dashboard"
              className="inline-flex px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {language === 'ar' ? 'الرئيسية' : 'Go Home'}
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      {deletionRequestSent && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}>
          {language === 'ar' ? 'تم إرسال طلب الحذف إلى صاحب المشروع' : 'Deletion request sent to project owner'}
        </div>
      )}
      <GlobalHeader />
      <header className="shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderBottom: `1px solid var(--color-border)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                onClick={() => navigate(`/projects/${projectId}?tab=chapters`)}
                className="flex items-center gap-2 font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={language === 'ar' ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                </svg>
                <span>
                  {language === 'ar'
                    ? typeConfig.containerLabelPluralAr
                    : typeConfig.containerLabelPluralEn}
                </span>
              </button>
              <div className="h-6 w-px" style={{ backgroundColor: 'var(--color-border)' }}></div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {getContainerLabel()} {chapter.chapter_number}: {chapter.title}
              </h1>
              {!chapter.is_active && (
                <span
                  className="px-3 py-1 text-sm font-medium rounded-full"
                  style={{
                    backgroundColor: 'var(--color-warning-bg)',
                    color: 'var(--color-warning-text)',
                    border: '1px solid var(--color-warning)'
                  }}
                >
                  {language === 'ar' ? 'معطل' : 'Disabled'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                >
                  <Share2 className="w-4 h-4" />
                  <span>{language === 'ar' ? 'مشاركة' : 'Share'}</span>
                </button>
              )}
              <button
                onClick={handleToggleActive}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{
                  backgroundColor: chapter.is_active ? 'var(--color-error-bg)' : 'var(--color-success-bg)',
                  color: chapter.is_active ? 'var(--color-error)' : 'var(--color-success)',
                  border: `1px solid ${chapter.is_active ? 'var(--color-error)' : 'var(--color-success)'}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = chapter.is_active ? 'var(--color-error)' : 'var(--color-success)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = chapter.is_active ? 'var(--color-error-bg)' : 'var(--color-success-bg)';
                  e.currentTarget.style.color = chapter.is_active ? 'var(--color-error)' : 'var(--color-success)';
                }}
              >
                {chapter.is_active
                  ? (language === 'ar' ? `تعطيل ${typeConfig.containerLabelAr}` : `Disable ${typeConfig.containerLabelEn}`)
                  : (language === 'ar' ? `تفعيل ${typeConfig.containerLabelAr}` : `Activate ${typeConfig.containerLabelEn}`)
                }
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-xl shadow-sm p-6 mb-6" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border-light)` }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {typeConfig.hasLevel2
                ? (language === 'ar' ? 'ملخص الفصل' : 'Chapter Summary')
                : (language === 'ar' ? `ملخص ${typeConfig.unitLabelAr}` : `${typeConfig.unitLabelEn} Summary`)}
            </h2>
            {chapterAiScore && (
              <div className="relative">
                <button
                  ref={chapterBrainRef}
                  onMouseEnter={() => setShowChapterAnalysis(true)}
                  onMouseLeave={() => setShowChapterAnalysis(false)}
                  onClick={() => setShowChapterAnalysis(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showChapterAnalysis
                      ? theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                      : theme === 'dark' ? 'hover:bg-blue-950 text-blue-400' : 'hover:bg-blue-50 text-blue-600'
                  }`}
                  title={language === 'ar' ? 'تحليل دووودة' : 'Doooda Analysis'}
                >
                  <Brain className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تحليل دووودة' : 'Doooda Analysis'}</span>
                </button>
                {showChapterAnalysis && chapterBrainRef.current && createPortal(
                  <SceneAnalysisPopup
                    score={chapterAiScore}
                    language={language as 'ar' | 'en'}
                    anchorRef={chapterBrainRef as React.RefObject<HTMLElement>}
                  />,
                  document.body
                )}
              </div>
            )}
          </div>
          <div
            className="p-4 rounded-lg leading-relaxed"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
            onContextMenu={handleContextMenu}
          >
            {chapter.summary || (language === 'ar' ? 'لا يوجد ملخص' : 'No summary')}
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
            {language === 'ar'
              ? `انقر بزر الماوس الأيمن لإضافة ${getSceneLabel()}`
              : `Right-click to add a ${getSceneLabel()}`}
          </p>
        </div>

        {!typeConfig.hasLevel2 && scenes.length > 0 && (
          <div className="rounded-xl shadow-sm p-6 mb-6" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border-light)` }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {language === 'ar' ? 'محتوى المشهد' : 'Scene Content'}
              </h2>
            </div>
            <div className="space-y-3">
              {scenes.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => navigate(`/projects/${projectId}/chapters/${chapterId}/scenes/${scene.id}`)}
                  className="w-full text-right px-4 py-3 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    textAlign: language === 'ar' ? 'right' : 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <span className="font-medium">{language === 'ar' ? 'اكتب المشهد' : 'Write Scene'}</span>
                  {scene.word_count > 0 && (
                    <span className="text-sm mr-2 ml-2" style={{ color: 'var(--color-text-secondary)' }}>
                      — {scene.word_count} {language === 'ar' ? 'كلمة' : 'words'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {!typeConfig.hasLevel2 && scenes.length === 0 && (
          <div className="rounded-xl shadow-sm p-6 mb-6 text-center" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border-light)` }}>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {language === 'ar' ? 'ابدأ الكتابة عن طريق إنشاء محتوى للمشهد' : 'Start writing by creating scene content'}
            </p>
            <button
              onClick={() => setShowSceneModal(true)}
              className="px-6 py-3 text-white rounded-lg"
              style={{ backgroundColor: 'var(--color-accent)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
            >
              {language === 'ar' ? 'ابدأ الكتابة' : 'Start Writing'}
            </button>
          </div>
        )}

        <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border-light)`, display: typeConfig.hasLevel2 ? undefined : 'none' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {getSceneLabelPlural()}
            </h2>
            <button
              onClick={() => setShowSceneModal(true)}
              className="px-4 py-2 text-white rounded-lg"
              style={{ backgroundColor: 'var(--color-accent)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
            >
              + {getAddSceneLabel()}
            </button>
          </div>

          {scenes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-5xl mb-3">{isBookProject ? '📑' : '🎬'}</div>
              <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {language === 'ar'
                  ? `لا توجد ${getSceneLabelPlural()} بعد`
                  : `No ${getSceneLabelPlural().toLowerCase()} yet`}
              </h4>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {language === 'ar'
                  ? `ابدأ بإضافة ${getSceneLabel()} جديد`
                  : `Start by adding a new ${getSceneLabel()}`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleSceneClick(scene.id)}
                  className="cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between rounded-xl shadow-sm p-6"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border-light)',
                    opacity: scene.is_active ? 1 : 0.7
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="cursor-move" style={{ color: 'var(--color-text-tertiary)' }} onClick={(e) => e.stopPropagation()}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{scene.title}</h4>
                          {sceneAiScores[index + 1] && (
                            <div className="relative inline-block">
                              <button
                                ref={el => { sceneBrainRefs.current[index + 1] = el; }}
                                onClick={e => { e.stopPropagation(); setShowSceneAnalysis(v => v === index + 1 ? null : index + 1); }}
                                onMouseEnter={() => setShowSceneAnalysis(index + 1)}
                                onMouseLeave={() => setShowSceneAnalysis(null)}
                                className={`p-1 rounded transition-colors ${
                                  showSceneAnalysis === index + 1
                                    ? theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'
                                    : theme === 'dark' ? 'hover:bg-blue-950' : 'hover:bg-blue-50'
                                }`}
                                title={language === 'ar' ? 'تحليل دووودة' : 'Doooda Analysis'}
                              >
                                <Brain className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                              </button>
                              {showSceneAnalysis === index + 1 && sceneBrainRefs.current[index + 1] && createPortal(
                                <SceneAnalysisPopup
                                  score={sceneAiScores[index + 1]}
                                  language={language as 'ar' | 'en'}
                                  anchorRef={{ current: sceneBrainRefs.current[index + 1] } as React.RefObject<HTMLElement>}
                                />,
                                document.body
                              )}
                            </div>
                          )}
                          {typeConfig.hasScriptFields && (scene.scene_type || scene.location) && (
                            <span
                              className="px-2 py-0.5 text-xs font-mono font-bold rounded"
                              style={{
                                backgroundColor: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {formatSceneHeader(scene)}
                            </span>
                          )}
                          {typeConfig.hasSoundFields && scene.background_sound && (
                            <span
                              className="px-2 py-0.5 text-xs rounded"
                              style={{
                                backgroundColor: 'var(--color-muted)',
                                color: 'var(--color-accent)',
                              }}
                            >
                              {scene.background_sound}
                            </span>
                          )}
                          {typeConfig.hasChildrenFields && scene.page_number && (
                            <span
                              className="px-2 py-0.5 text-xs rounded"
                              style={{
                                backgroundColor: 'var(--color-muted)',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              {language === 'ar' ? `صفحة ${scene.page_number}` : `Page ${scene.page_number}`}
                            </span>
                          )}
                          {!scene.is_active && (
                            <span
                              className="px-2 py-0.5 text-xs font-medium rounded-full"
                              style={{
                                backgroundColor: 'var(--color-warning-bg)',
                                color: 'var(--color-warning-text)',
                                border: '1px solid var(--color-warning)'
                              }}
                            >
                              {language === 'ar' ? 'معطل' : 'Disabled'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                          {scene.word_count} {language === 'ar' ? 'كلمة' : 'words'}
                          {scene.summary && ` • ${scene.summary.substring(0, 60)}${scene.summary.length > 60 ? '...' : ''}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleToggleSceneCompleted(e, scene.id, scene.completed)}
                      className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
                      style={{
                        backgroundColor: scene.completed ? 'var(--color-success-bg)' : 'var(--color-bg-tertiary)',
                        color: scene.completed ? 'var(--color-success)' : 'var(--color-text-secondary)',
                        border: `1px solid ${scene.completed ? 'var(--color-success)' : 'var(--color-border)'}`,
                      }}
                      title={scene.completed
                        ? (language === 'ar' ? `استرداد ${getSceneLabel()}` : `Revert ${getSceneLabel()}`)
                        : (language === 'ar' ? 'تم الانتهاء' : 'Mark complete')}
                    >
                      {scene.completed
                        ? (language === 'ar' ? `استرداد ${getSceneLabel()}` : 'Revert')
                        : (language === 'ar' ? 'تم الانتهاء' : 'Done')}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSceneActive(scene.id, scene.is_active, scene.title);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
                      style={{
                        backgroundColor: scene.is_active ? 'var(--color-error-bg)' : 'var(--color-success-bg)',
                        color: scene.is_active ? 'var(--color-error)' : 'var(--color-success)',
                        border: `1px solid ${scene.is_active ? 'var(--color-error)' : 'var(--color-success)'}`
                      }}
                      title={scene.is_active ? (language === 'ar' ? 'تعطيل' : 'Disable') : (language === 'ar' ? 'تفعيل' : 'Activate')}
                    >
                      {scene.is_active ? (language === 'ar' ? 'تعطيل' : 'Disable') : (language === 'ar' ? 'تفعيل' : 'Activate')}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScene(scene.id, scene.title);
                      }}
                      className="p-1.5 rounded hover:bg-opacity-10"
                      style={{ color: 'var(--color-error)' }}
                      title={language === 'ar' ? 'حذف' : 'Delete'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-sm pt-4 mt-4" style={{ color: 'var(--color-text-secondary)', borderTop: `1px solid var(--color-border)` }}>
            <span>
              {language === 'ar' ? 'المجموع' : 'Total'}: {scenes.filter(s => s.is_active).length} {getSceneLabel()}
            </span>
            <span>
              {scenes.filter(s => s.is_active).reduce((sum, scene) => sum + scene.word_count, 0).toLocaleString()}{' '}
              {language === 'ar' ? 'كلمة' : 'words'}
            </span>
          </div>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={contextMenu.options}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showSceneModal && chapterId && (
        <SceneModal
          chapterId={chapterId}
          onClose={() => setShowSceneModal(false)}
          onSave={handleSaveScene}
          language={language}
          isBookProject={isBookProject}
          projectType={project?.project_type}
        />
      )}

      {showNoteModal && projectId && (
        <NoteModal
          projectId={projectId}
          contextType="chapter_summary"
          chapterId={chapterId}
          onClose={() => setShowNoteModal(false)}
          onSave={handleSaveNote}
          language={language}
        />
      )}

      {showShareModal && projectId && chapterId && chapter && project && (
        <ScopedShareModal
          projectId={projectId}
          projectTitle={project.title}
          scope={{ type: 'chapter', id: chapterId, title: chapter.title }}
          onClose={() => setShowShareModal(false)}
          onShared={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
