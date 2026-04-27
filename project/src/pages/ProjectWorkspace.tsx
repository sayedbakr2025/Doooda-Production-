import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { api, createChapter, createCharacter, updateCharacter, getCharacters, updateChapterOrder, createTask, deleteCharacter, createReference, getReferences, updateReference, deleteReference, deleteChapter, toggleChapterActive, getScenes, getProjectGenres, getProjectTone, getMyCollaboratorRole, getMyCollaboratorRoleForProject, requestItemDeletion, logActivity } from '../services/api';
import type { Project, Chapter, ProjectCharacter, Genre, Tone } from '../types';
import { t } from '../utils/translations';
import { getProjectTypeConfig } from '../utils/projectTypeConfig';
import ContextMenu from '../components/ContextMenu';
import ExportModal from '../components/ExportModal';
import CharacterModal from '../components/CharacterModal';
import ReferenceModal from '../components/ReferenceModal';
import ChapterModal from '../components/ChapterModal';
import NoteModal from '../components/NoteModal';
import NotesSection from '../components/NotesSection';
import GlobalHeader from '../components/GlobalHeader';
import { dispatchAskDoooda } from '../components/doooda/dispatchAskDoooda';
import { getDooodaAccess } from '../components/doooda/useDooodaAccess';
import DooodaCriticGraph from '../components/plot/DooodaCriticGraph';
import { supabase } from '../lib/supabaseClient';
import { FileDown, Settings, Share2 } from 'lucide-react';
import EditProjectModal from '../components/EditProjectModal';
import MarketingPanel from '../features/marketing/MarketingPanel';
import UpgradePlanModal from '../components/UpgradePlanModal';
import { useAuth } from '../contexts/AuthContext';
import { useUserPlan } from '../hooks/useUserPlan';
import ScopedShareModal from '../components/ScopedShareModal';
import CollaboratorsPanel from '../components/CollaboratorsPanel';
import ActivityLogPanel from '../components/ActivityLogPanel';
import ActiveUsersBar from '../components/ActiveUsersBar';
import { usePresence } from '../hooks/usePresence';

interface ContextMenuState {
  x: number;
  y: number;
  options: Array<{ label: string; onClick: () => void }>;
}

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { isPaid, canExportPdf, planCode } = useUserPlan();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [characters, setCharacters] = useState<ProjectCharacter[]>([]);
  const [references, setReferences] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'plot' | 'logline' | 'chapters' | 'characters' | 'notes' | 'collaborators' | 'activity'>('plot');
  const [showShareModal, setShowShareModal] = useState(false);
  const [collaboratorsRefreshKey, setCollaboratorsRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<ProjectCharacter | null>(null);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [editingReference, setEditingReference] = useState<any>(null);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContextType, setNoteContextType] = useState<'logline' | 'chapter_summary'>('logline');
  const [selectedText, setSelectedText] = useState('');
  const [draggedChapterIndex, setDraggedChapterIndex] = useState<number | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMarketingPanel, setShowMarketingPanel] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [projectGenres, setProjectGenres] = useState<Genre[]>([]);
  const [projectTone, setProjectToneState] = useState<Tone | null>(null);

  const [collaboratorRole, setCollaboratorRole] = useState<string | null>(null);
  const [deletionRequestSent, setDeletionRequestSent] = useState(false);
  const [isFrozenCollaborator, setIsFrozenCollaborator] = useState(false);

  const isOwner = project ? project.user_id === user?.id : false;
  const isManager = collaboratorRole === 'manager';
  const isEditor = collaboratorRole === 'editor';
  const isViewer = collaboratorRole === 'viewer';
  const canEdit = isOwner || isManager || isEditor;
  const canManage = isOwner || isManager;

  const presenceDisplayName = (user as any)?.user_metadata?.pen_name
    || (user as any)?.user_metadata?.first_name
    || user?.email?.split('@')[0]
    || 'User';

  const { activeUsers } = usePresence(id, user?.id, presenceDisplayName);

  function handleExportClick() {
    if (!isPaid || !canExportPdf) {
      setShowUpgradeModal(true);
    } else {
      setShowExportModal(true);
    }
  }

  useEffect(() => {
    if (id) {
      loadProject(id);
      loadChapters(id);
      loadCharacters(id);
      loadReferencesData(id);
      getProjectGenres(id).then(setProjectGenres).catch(() => {});
      getProjectTone(id).then(setProjectToneState).catch(() => {});
      getMyCollaboratorRole(id).catch(() => {});
      if (user) {
        getMyCollaboratorRoleForProject(id).then(role => setCollaboratorRole(role)).catch(() => {});
        supabase
          .from('project_collaborators')
          .select('status')
          .eq('project_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data && data.status === 'frozen') setIsFrozenCollaborator(true);
          });
      }
    }
  }, [id, user]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && id) {
        loadProject(id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [id]);

  async function loadProject(projectId: string) {
    try {
      const data = await api.getProject(projectId);
      setProject(data);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadChapters(projectId: string) {
    try {
      const data = await api.getChapters(projectId);
      setChapters(data);
    } catch (error) {
      console.error('Failed to load chapters:', error);
    }
  }

  async function loadCharacters(projectId: string) {
    try {
      const data = await getCharacters(projectId);
      setCharacters(data);
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  }

  async function loadReferencesData(projectId: string) {
    try {
      const data = await getReferences(projectId);
      setReferences(data);
    } catch (error) {
      console.error('Failed to load references:', error);
    }
  }

const handleContextMenu = (e: React.MouseEvent, contextType: 'logline' | 'chapter') => {
    e.preventDefault();

    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    setSelectedText(selectedText);

    const isBookProject = project?.project_type === 'book';
    const typeConfig = project ? getProjectTypeConfig(project.project_type) : null;
    const options = [];

    if (contextType === 'logline') {
      options.push(
        {
          label: language === 'ar'
            ? `إضافة ${typeConfig?.containerLabelAr || 'فصل'}`
            : `Add ${typeConfig?.containerLabelEn || 'Chapter'}`,
          onClick: () => setShowChapterModal(true),
        },
        {
          label: isBookProject
            ? t('contextMenu.addReference', language)
            : t('contextMenu.addProjectCharacter', language),
          onClick: () => {
            if (isBookProject) {
              setShowReferenceModal(true);
            } else {
              setShowCharacterModal(true);
            }
          },
        },
        {
          label: t('contextMenu.addNote', language),
          onClick: () => {
            setNoteContextType('logline');
            setShowNoteModal(true);
          },
        }
      );
    } else {
      options.push({
        label: isBookProject
          ? t('contextMenu.addReference', language)
          : t('contextMenu.addProjectCharacter', language),
        onClick: () => {
          if (isBookProject) {
            setShowReferenceModal(true);
          } else {
            setShowCharacterModal(true);
          }
        },
      });
    }

    if (selectedText.length > 0 && getDooodaAccess().visible) {
      options.push({
        label: language === 'ar' ? 'اسأل دووودة' : 'Ask doooda',
        onClick: () => dispatchAskDoooda(selectedText, {
          level: 'selected_text',
          projectId: id,
          logline: project?.idea ?? undefined,
          projectTitle: project?.title,
          projectType: project?.project_type,
          genres: projectGenres.map(g => g.slug),
          tone: projectTone?.slug,
        }),
      });
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options,
    });
};

  const handleSaveChapter = async (chapterData: { title: string; summary?: string }) => {
    if (!id || !canEdit) return;
    try {
      await createChapter(id, chapterData);
      await loadChapters(id);
      setShowChapterModal(false);
      logActivity(id, 'create', 'chapter', chapterData.title);
    } catch (error) {
      console.error('Failed to create chapter:', error);
    }
  };

  const handleSaveCharacter = async (characterData: {
    name: string;
    dialogue_name: string;
    description?: string;
    personality_traits?: string;
    background?: string;
    speaking_style?: string;
    goals?: string;
    fears?: string;
  }) => {
    if (!id || !canEdit) return;
    try {
      if (editingCharacter) {
        await updateCharacter(editingCharacter.id, characterData);
        logActivity(id, 'update', 'character', characterData.name, editingCharacter.id);
      } else {
        await createCharacter(id, characterData);
        logActivity(id, 'create', 'character', characterData.name);
      }
      await loadCharacters(id);
      setShowCharacterModal(false);
      setEditingCharacter(null);
    } catch (error) {
      console.error('Failed to save character:', error);
      throw error;
    }
  };

  const handleEditCharacter = (character: ProjectCharacter) => {
    setEditingCharacter(character);
    setShowCharacterModal(true);
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!id || !canManage) return;
    try {
      await deleteCharacter(characterId);
      await loadCharacters(id);
    } catch (error) {
      console.error('Failed to delete character:', error);
    }
  };

  const handleSaveReference = async (referenceData: any) => {
    if (!id || !canEdit) return;
    try {
      if (editingReference) {
        await updateReference(editingReference.id, referenceData);
      } else {
        await createReference(id, referenceData);
      }
      await loadReferencesData(id);
      setShowReferenceModal(false);
      setEditingReference(null);
    } catch (error) {
      console.error('Failed to save reference:', error);
      throw error;
    }
  };

  const handleEditReference = (reference: any) => {
    setEditingReference(reference);
    setShowReferenceModal(true);
  };

  const handleDeleteReference = async (referenceId: string) => {
    if (!id || !canManage) return;
    try {
      await deleteReference(referenceId);
      await loadReferencesData(id);
    } catch (error) {
      console.error('Failed to delete reference:', error);
    }
  };

  const handleSaveNote = async (noteData: { description: string }) => {
    if (!id || !canEdit) return;
    try {
      await createTask({
        project_id: id,
        context_type: noteContextType,
        description: noteData.description,
      });
      setShowNoteModal(false);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleChapterDragStart = (e: React.DragEvent, index: number) => {
    setDraggedChapterIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleChapterDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedChapterIndex === null || draggedChapterIndex === index) return;

    const newChapters = [...chapters];
    const draggedChapter = newChapters[draggedChapterIndex];
    newChapters.splice(draggedChapterIndex, 1);
    newChapters.splice(index, 0, draggedChapter);

    setChapters(newChapters);
    setDraggedChapterIndex(index);
  };

  const handleChapterDragEnd = async () => {
    if (draggedChapterIndex === null || !canEdit) return;

    const updates = chapters.map((chapter, index) => ({
      id: chapter.id,
      chapter_number: index + 1,
    }));

    try {
      await updateChapterOrder(updates);
      if (id) await loadChapters(id);
    } catch (error) {
      console.error('Failed to update chapter order:', error);
      if (id) await loadChapters(id);
    }

    setDraggedChapterIndex(null);
  };

  const handleChapterClick = (chapterId: string) => {
    navigate(`/projects/${id}/chapters/${chapterId}`);
  };

  const handleDeleteChapter = async (chapterId: string, chapterTitle: string) => {
    if (!id || !canManage) return;
    const delLabel = project ? (language === 'ar' ? getProjectTypeConfig(project.project_type).containerLabelAr : getProjectTypeConfig(project.project_type).containerLabelEn) : (language === 'ar' ? 'الفصل' : 'chapter');

    if (isManager && !isOwner) {
      if (window.confirm(
        language === 'ar'
          ? `سيتم إرسال طلب حذف ${delLabel} "${chapterTitle}" إلى صاحب المشروع للموافقة. هل تريد المتابعة؟`
          : `A deletion request for ${delLabel} "${chapterTitle}" will be sent to the project owner for approval. Continue?`
      )) {
        try {
          await requestItemDeletion(id, 'chapter', chapterId, chapterTitle, project?.title || '');
          setDeletionRequestSent(true);
          setTimeout(() => setDeletionRequestSent(false), 3000);
        } catch (error) {
          console.error('Failed to send deletion request:', error);
        }
      }
      return;
    }

    if (window.confirm(language === 'ar' ? `هل تريد حذف ${delLabel} "${chapterTitle}"؟` : `Delete ${delLabel} "${chapterTitle}"?`)) {
      try {
        await deleteChapter(chapterId);
        await loadChapters(id);
        logActivity(id, 'delete', 'chapter', chapterTitle, chapterId);
      } catch (error) {
        console.error('Failed to delete chapter:', error);
      }
    }
  };

  const handleToggleChapterActive = async (chapterId: string, currentState: boolean, chapterTitle: string) => {
    if (!id || !canManage) return;
    const newActiveState = !currentState;
    const toggleLabel = project ? (language === 'ar' ? getProjectTypeConfig(project.project_type).containerLabelAr : getProjectTypeConfig(project.project_type).containerLabelEn) : (language === 'ar' ? 'الفصل' : 'chapter');
    const confirmMessage = newActiveState
      ? (language === 'ar' ? `هل تريد تفعيل ${toggleLabel} "${chapterTitle}"؟` : `Do you want to activate ${toggleLabel} "${chapterTitle}"?`)
      : (language === 'ar' ? `هل تريد تعطيل ${toggleLabel} "${chapterTitle}"؟` : `Do you want to deactivate ${toggleLabel} "${chapterTitle}"?`);

    if (window.confirm(confirmMessage)) {
      try {
        await toggleChapterActive(chapterId, newActiveState);
        await loadChapters(id);
      } catch (error) {
        console.error('Failed to toggle chapter active state:', error);
        alert(language === 'ar' ? 'فشل تغيير حالة الفصل' : 'Failed to change chapter state');
      }
    }
  };

  const handleNavigateToPlot = () => {
    navigate(`/projects/${id}/plot`);
  };

  const handleNavigateToLogline = () => {
    navigate(`/projects/${id}/logline`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
      </div>
    );
  }

  if (isFrozenCollaborator) {
    const isRtl = language === 'ar';
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div
          className="rounded-2xl p-10 text-center max-w-sm w-full shadow-xl"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(234,179,8,0.12)' }}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#d97706' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {isRtl ? 'تم تجميد وصولك' : 'Your Access is Frozen'}
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {isRtl
              ? 'لقد قام مالك المشروع بتجميد وصولك مؤقتاً. تواصل مع مالك المشروع لاستعادة الوصول.'
              : 'The project owner has temporarily frozen your access. Contact the project owner to restore it.'}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {isRtl ? 'العودة إلى المشاريع' : 'Back to Projects'}
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>{t('project.notFound', language)}</h2>
          <Link to="/dashboard" className="font-medium" style={{ color: 'var(--color-accent)' }}>
            {t('project.backToDashboard', language)}
          </Link>
        </div>
      </div>
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
      {isViewer && (
        <div
          className="px-4 py-2 text-center text-sm font-medium"
          style={{ backgroundColor: 'rgba(107,114,128,0.1)', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}
        >
          {language === 'ar' ? '👁 وضع القراءة فقط — لا يمكنك تعديل المحتوى' : '👁 Read-only mode — you cannot edit content'}
        </div>
      )}
      {!isOwner && isEditor && (
        <div
          className="px-4 py-2 text-center text-sm font-medium"
          style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6', borderBottom: '1px solid var(--color-border)' }}
        >
          {language === 'ar' ? '✏️ وضع المحرر — يمكنك تعديل النصوص فقط' : '✏️ Editor mode — you can edit text only'}
        </div>
      )}
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
              <Link
                to="/dashboard"
                className="font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
              >
                {t('project.workspace.back', language)}
              </Link>
              <div className="h-6 w-px" style={{ backgroundColor: 'var(--color-border)' }}></div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{project.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              {(isOwner || isManager) && isPaid && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                  style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                >
                  <Share2 className="w-4 h-4" />
                  <span>{language === 'ar' ? 'مشاركة المشروع' : 'Share Project'}</span>
                </button>
              )}
              {canManage && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              >
                <Settings className="w-4 h-4" />
                <span>{language === 'ar' ? 'الإعدادات' : 'Settings'}</span>
              </button>
              )}
              <button
                onClick={handleExportClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              >
                <FileDown className="w-4 h-4" />
                <span>{language === 'ar' ? 'تصدير' : 'Export'}</span>
                {!isPaid && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#ca8a04' }}>
                    PRO
                  </span>
                )}
              </button>
              {project?.status === 'completed' && (
                <button
                  onClick={() => setShowMarketingPanel(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:opacity-90 active:opacity-80"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <span>🚀</span>
                  <span>{t('marketing.button', language)}</span>
                </button>
              )}
            </div>
          </div>
          {activeUsers.length > 0 && (
            <div className="px-4 py-2" style={{ borderTop: '1px solid var(--color-border-light)' }}>
              <ActiveUsersBar users={activeUsers} />
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-xl shadow-sm" style={{ backgroundColor: 'var(--color-surface)', border: `1px solid var(--color-border-light)`, overflow: 'visible' }}>
          <div style={{ borderBottom: `1px solid var(--color-border)` }}>
            <nav className="flex">
              {(['plot', 'logline', 'chapters', 'characters', 'notes', 'collaborators', 'activity'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-medium capitalize transition-colors ${
                    activeTab === tab ? 'border-b-2' : ''
                  }`}
                  style={
                    activeTab === tab
                      ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)', backgroundColor: 'var(--color-muted)' }
                      : { color: 'var(--color-text-secondary)' }
                  }
                  onMouseEnter={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }
                  }}
                >
                  {(() => {
                    if (tab === 'collaborators') {
                      return language === 'ar' ? 'المتعاونون' : 'Collaborators';
                    }
                    if (tab === 'activity') {
                      return language === 'ar' ? 'النشاط' : 'Activity';
                    }
                    if (tab === 'characters' && project.project_type === 'book') {
                      return t('project.references.title', language);
                    }
                    if (tab === 'chapters') {
                      const cfg = getProjectTypeConfig(project.project_type);
                      return language === 'ar' ? cfg.containerLabelPluralAr : cfg.containerLabelPluralEn;
                    }
                    return t(`project.tab.${tab}`, language);
                  })()}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'plot' && id && (
              <PlotTab
                projectId={id}
                language={language}
                onNavigateToPlot={handleNavigateToPlot}
                projectType={project?.project_type}
              />
            )}
            {activeTab === 'logline' && (
              <LoglineTab
                project={project}
                language={language}
                canEdit={canEdit}
                onNavigateToLogline={handleNavigateToLogline}
                onContextMenu={(e) => handleContextMenu(e, 'logline')}
              />
            )}
            {activeTab === 'chapters' && project && (
              <ChaptersTab
                chapters={chapters}
                language={language}
                projectType={project.project_type}
                canEdit={canEdit}
                canManage={canManage}
                onContextMenu={(e) => handleContextMenu(e, 'chapter')}
                onAddChapter={() => setShowChapterModal(true)}
                onChapterClick={handleChapterClick}
                onDeleteChapter={handleDeleteChapter}
                onToggleChapterActive={handleToggleChapterActive}
                onChapterDragStart={handleChapterDragStart}
                onChapterDragOver={handleChapterDragOver}
                onChapterDragEnd={handleChapterDragEnd}
              />
            )}
            {activeTab === 'characters' && project.project_type !== 'book' && (
              <CharactersTab
                characters={characters}
                language={language}
                onAddCharacter={() => {
                  setEditingCharacter(null);
                  setShowCharacterModal(true);
                }}
                onEditCharacter={handleEditCharacter}
                onDeleteCharacter={handleDeleteCharacter}
              />
            )}
            {activeTab === 'characters' && project.project_type === 'book' && (
              <ReferencesTab
                references={references}
                language={language}
                onAddReference={() => {
                  setEditingReference(null);
                  setShowReferenceModal(true);
                }}
                onEditReference={handleEditReference}
                onDeleteReference={handleDeleteReference}
              />
            )}
            {activeTab === 'notes' && id && (
              <NotesSection projectId={id} language={language} />
            )}
            {activeTab === 'collaborators' && id && (
              <CollaboratorsPanel
                key={collaboratorsRefreshKey}
                projectId={id}
                isOwner={isOwner}
                canManage={canManage}
                onShareClick={() => setShowShareModal(true)}
              />
            )}
            {activeTab === 'activity' && id && (
              <ActivityLogPanel projectId={id} />
            )}
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

      {showCharacterModal && id && (
        <CharacterModal
          projectId={id}
          onClose={() => {
            setShowCharacterModal(false);
            setEditingCharacter(null);
          }}
          onSave={handleSaveCharacter}
          initialName={editingCharacter ? editingCharacter.name : selectedText}
          existingCharacter={editingCharacter}
          language={language}
        />
      )}

      {showReferenceModal && id && (
        <ReferenceModal
          projectId={id}
          onClose={() => {
            setShowReferenceModal(false);
            setEditingReference(null);
          }}
          onSave={handleSaveReference}
          initialName={editingReference ? editingReference.reference_name : selectedText}
          existingReference={editingReference}
          language={language}
        />
      )}

      {showChapterModal && id && (() => {
        const chapterTypeConfig = project ? getProjectTypeConfig(project.project_type) : null;
        return (
          <ChapterModal
            projectId={id}
            onClose={() => setShowChapterModal(false)}
            onSave={handleSaveChapter}
            language={language}
            containerLabelAr={chapterTypeConfig?.containerLabelAr}
            containerLabelEn={chapterTypeConfig?.containerLabelEn}
          />
        );
      })()}

      {showNoteModal && id && (
        <NoteModal
          projectId={id}
          contextType={noteContextType}
          onClose={() => setShowNoteModal(false)}
          onSave={handleSaveNote}
          language={language}
        />
      )}

      {showExportModal && project && (
        <ExportModal
          project={project}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showMarketingPanel && project && (
        <MarketingPanel
          project={project}
          onClose={() => setShowMarketingPanel(false)}
        />
      )}

      {showUpgradeModal && (
        <UpgradePlanModal
          currentPlan={planCode}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {showEditModal && project && (
        <EditProjectModal
          project={project}
          initialGenres={projectGenres}
          initialTone={projectTone}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated, genres, tone) => {
            setProject(updated);
            setProjectGenres(genres);
            setProjectToneState(tone);
            setShowEditModal(false);
          }}
        />
      )}

      {showShareModal && id && project && (
        <ScopedShareModal
          projectId={id}
          projectTitle={project.title}
          scope={{ type: 'project', id: null, title: project.title }}
          onClose={() => setShowShareModal(false)}
          onShared={() => {
            setCollaboratorsRefreshKey(k => k + 1);
            setActiveTab('collaborators');
          }}
        />
      )}
    </div>
  );
}

interface PlotTabProps {
  projectId: string;
  language: 'ar' | 'en';
  onNavigateToPlot: () => void;
  projectType?: string;
}

function PlotTab({ projectId, language, onNavigateToPlot, projectType }: PlotTabProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [scenes, setScenes] = useState<Map<string, any[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlotAnalysis();
  }, [projectId]);

  async function loadPlotAnalysis() {
    try {
      const { data: plotProject } = await supabase
        .from('plot_projects')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (!plotProject) {
        setLoading(false);
        return;
      }

      const { data: analysisData } = await supabase
        .from('plot_analysis')
        .select('analysis_json')
        .eq('plot_project_id', plotProject.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (analysisData) {
        setAnalysis(analysisData.analysis_json);

        const { data: chaptersData } = await supabase
          .from('plot_chapters')
          .select('*')
          .eq('plot_project_id', plotProject.id)
          .order('order_index');

        if (chaptersData) {
          setChapters(chaptersData);

          const { data: scenesData } = await supabase
            .from('plot_scenes')
            .select('*')
            .in('chapter_id', chaptersData.map(c => c.id))
            .order('order_index');

          if (scenesData) {
            const scenesMap = new Map<string, any[]>();
            scenesData.forEach(scene => {
              const chapterScenes = scenesMap.get(scene.chapter_id) || [];
              chapterScenes.push(scene);
              scenesMap.set(scene.chapter_id, chapterScenes);
            });
            setScenes(scenesMap);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load plot analysis:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {language === 'ar' ? 'خط الحبكة' : 'Plot Canvas'}
          </h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {language === 'ar'
              ? 'خطط مشاريعك بشكل مرئي باستخدام محرر حبكة دووودة الذكي'
              : 'Visually plan your project using Doooda\'s intelligent plot editor'}
          </p>
        </div>
        <button
          onClick={onNavigateToPlot}
          className="px-4 py-2 text-white rounded-lg"
          style={{ backgroundColor: 'var(--color-accent)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
        >
          {language === 'ar' ? 'افتح محرر الحبكة' : 'Open Plot Editor'}
        </button>
      </div>

      {analysis && chapters.length > 0 ? (
        <div className="w-full overflow-visible">
          <DooodaCriticGraph
            analysis={analysis}
            chapters={chapters}
            scenes={scenes}
            language={language}
            projectType={projectType as any}
          />
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-5xl mb-3">🗺️</div>
          <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {language === 'ar' ? 'ابدأ بتخطيط حبكة قصتك' : 'Start planning your story plot'}
          </h4>
          <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {language === 'ar'
              ? 'استخدم خط الحبكة لتنظيم الفصول والمشاهد بشكل مرئي'
              : 'Use the Plot Canvas to visually organize your chapters and scenes'}
          </p>
        </div>
      )}
    </div>
  );
}

interface LoglineTabProps {
  project: Project;
  language: 'ar' | 'en';
  canEdit: boolean;
  onNavigateToLogline: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function LoglineTab({ project, language, canEdit, onNavigateToLogline, onContextMenu }: LoglineTabProps) {
  const hasLogline = project.idea && project.idea.trim() !== '';

  const handleImportFromPlot = async () => {
    try {
      const chapters = await api.getChapters(project.id);
      const typeConfig = getProjectTypeConfig(project.project_type);

      if (chapters.length === 0) {
        alert(language === 'ar'
          ? `لا توجد ${typeConfig.containerLabelPluralAr} في الحبكة للاستيراد`
          : `No ${typeConfig.containerLabelPluralEn.toLowerCase()} in the plot to import`);
        return;
      }

      let plotContent = '<p><br></p>';
      const indentStyle = language === 'ar'
        ? 'margin-right: 30px;'
        : 'margin-left: 30px;';

      for (const chapter of chapters) {
        plotContent += `<p><strong>${chapter.title || (language === 'ar' ? `${typeConfig.containerLabelAr} ${chapter.chapter_number}` : `${typeConfig.containerLabelEn} ${chapter.chapter_number}`)}</strong></p>`;

        if (chapter.summary) {
          plotContent += `<p>${chapter.summary}</p>`;
        }

        if (typeConfig.hasLevel2) {
          const scenes = await getScenes(chapter.id);

          if (scenes.length > 0) {
            for (const scene of scenes) {
              plotContent += `<p style="${indentStyle}"><strong>${scene.title || (language === 'ar' ? `${typeConfig.unitLabelAr} ${scene.position + 1}` : `${typeConfig.unitLabelEn} ${scene.position + 1}`)}</strong></p>`;

              if (scene.summary) {
                plotContent += `<p style="${indentStyle}">${scene.summary}</p>`;
              }
            }
          }
        }

        plotContent += '<p><br></p>';
      }

      const currentContent = project.idea || '';
      const newContent = currentContent + plotContent;

      await api.updateProject(project.id, { idea: newContent });

      alert(language === 'ar'
        ? 'تم استيراد الحبكة بنجاح! افتح محرر الخط الدرامي لرؤية التغييرات.'
        : 'Plot imported successfully! Open the Logline editor to see the changes.');

    } catch (error) {
      console.error('Failed to import from plot:', error);
      alert(language === 'ar'
        ? 'حدث خطأ أثناء استيراد الحبكة'
        : 'An error occurred while importing the plot');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('project.logline.title', language)}</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {t('project.logline.description', language)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
          <button
            onClick={handleImportFromPlot}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg"
            style={{ backgroundColor: 'var(--color-accent)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
            title={language === 'ar' ? 'استيراد الفصول والمشاهد من الحبكة' : 'Import chapters and scenes from plot'}
          >
            <FileDown className="w-4 h-4" />
            <span>{language === 'ar' ? 'استيراد من الحبكة' : 'Import from Plot'}</span>
          </button>
          )}
          {canEdit && (
          <button
            onClick={onNavigateToLogline}
            className="px-4 py-2 text-white rounded-lg"
            style={{ backgroundColor: 'var(--color-accent)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
          >
            {hasLogline
              ? (language === 'ar' ? 'تحرير الخط الدرامي' : 'Edit Logline')
              : (language === 'ar' ? 'افتح محرر الخط الدرامي' : 'Open Logline Editor')}
          </button>
          )}
        </div>
      </div>

      {hasLogline ? (
        <div
          onContextMenu={onContextMenu}
          className="p-6 rounded-lg cursor-context-menu prose prose-lg max-w-none"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            border: `1px solid var(--color-border)`,
            color: 'var(--color-text-primary)',
            direction: language === 'ar' ? 'rtl' : 'ltr',
            textAlign: language === 'ar' ? 'right' : 'left',
            lineHeight: '1.8',
            unicodeBidi: 'plaintext',
          }}
          dangerouslySetInnerHTML={{ __html: project.idea || '' }}
        />
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-5xl mb-3">✍️</div>
          <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {language === 'ar' ? 'اكتب الخط الدرامي لمشروعك' : 'Write your project logline'}
          </h4>
          <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {language === 'ar'
              ? 'الخط الدرامي هو ملخص قصير لفكرة مشروعك الرئيسية'
              : 'The logline is a brief summary of your project\'s main idea'}
          </p>
        </div>
      )}
    </div>
  );
}

interface ChaptersTabProps {
  chapters: Chapter[];
  language: 'ar' | 'en';
  projectType: import('../types').ProjectType;
  canEdit: boolean;
  canManage: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onAddChapter: () => void;
  onChapterClick: (chapterId: string) => void;
  onDeleteChapter: (chapterId: string, chapterTitle: string) => void;
  onToggleChapterActive: (chapterId: string, currentState: boolean, chapterTitle: string) => void;
  onChapterDragStart: (e: React.DragEvent, index: number) => void;
  onChapterDragOver: (e: React.DragEvent, index: number) => void;
  onChapterDragEnd: () => void;
}

function ChaptersTab({
  chapters,
  language,
  projectType,
  canEdit,
  canManage,
  onContextMenu,
  onAddChapter,
  onChapterClick,
  onDeleteChapter,
  onToggleChapterActive,
  onChapterDragStart,
  onChapterDragOver,
  onChapterDragEnd
}: ChaptersTabProps) {
  const typeConfig = getProjectTypeConfig(projectType);
  const containerLabel = language === 'ar' ? typeConfig.containerLabelAr : typeConfig.containerLabelEn;
  const addContainerLabel = language === 'ar' ? typeConfig.addContainerLabelAr : typeConfig.addContainerLabelEn;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {language === 'ar' ? typeConfig.containerLabelPluralAr : typeConfig.containerLabelPluralEn}
        </h3>
        {canEdit && (
        <button
          onClick={onAddChapter}
          className="px-4 py-2 text-white rounded-lg"
          style={{ backgroundColor: 'var(--color-accent)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
        >
          {addContainerLabel}
        </button>
        )}
      </div>

      {chapters.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-5xl mb-3">{typeConfig.icon}</div>
          <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {language === 'ar' ? `لا توجد ${typeConfig.containerLabelPluralAr} بعد` : `No ${typeConfig.containerLabelPluralEn.toLowerCase()} yet`}
          </h4>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {language === 'ar' ? `ابدأ بإضافة ${typeConfig.containerLabelAr}` : `Start by adding a ${typeConfig.containerLabelEn.toLowerCase()}`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              draggable={canEdit}
              onDragStart={canEdit ? (e) => onChapterDragStart(e, index) : undefined}
              onDragOver={canEdit ? (e) => onChapterDragOver(e, index) : undefined}
              onDragEnd={canEdit ? onChapterDragEnd : undefined}
              className="cursor-pointer hover:shadow-md transition-shadow flex items-center gap-3 rounded-xl shadow-sm p-6"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border-light)',
                opacity: chapter.is_active ? 1 : 0.7
              }}
              onClick={() => onChapterClick(chapter.id)}
            >
              {canEdit && (
              <div className="cursor-move" style={{ color: 'var(--color-text-tertiary)' }} onClick={(e) => e.stopPropagation()}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {containerLabel} {chapter.chapter_number}: {chapter.title}
                  </h4>
                  {!chapter.is_active && (
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
                  {chapter.word_count} {t('dashboard.words', language)} • {t('project.chapters.lastEdited', language)} {new Date(chapter.updated_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                </p>
                {chapter.summary && (
                  <p
                    className="text-sm mt-2 line-clamp-2"
                    style={{ color: 'var(--color-text-secondary)' }}
                    onContextMenu={(e) => {
                      e.stopPropagation();
                      onContextMenu(e);
                    }}
                  >
                    {chapter.summary}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleChapterActive(chapter.id, chapter.is_active, chapter.title);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
                  style={{
                    backgroundColor: chapter.is_active ? 'var(--color-error-bg)' : 'var(--color-success-bg)',
                    color: chapter.is_active ? 'var(--color-error)' : 'var(--color-success)',
                    border: `1px solid ${chapter.is_active ? 'var(--color-error)' : 'var(--color-success)'}`
                  }}
                  title={chapter.is_active ? (language === 'ar' ? 'تعطيل' : 'Disable') : (language === 'ar' ? 'تفعيل' : 'Activate')}
                >
                  {chapter.is_active ? (language === 'ar' ? 'تعطيل' : 'Disable') : (language === 'ar' ? 'تفعيل' : 'Activate')}
                </button>
                )}
                {canManage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChapter(chapter.id, chapter.title);
                  }}
                  className="p-1.5 rounded hover:bg-opacity-10"
                  style={{ color: 'var(--color-error)' }}
                  title={language === 'ar' ? 'حذف' : 'Delete'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm pt-4" style={{ color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border)' }}>
        <span>{language === 'ar' ? 'المجموع' : 'Total'}: {chapters.length} {language === 'ar' ? typeConfig.containerLabelPluralAr : typeConfig.containerLabelPluralEn}</span>
        <span>{chapters.reduce((sum, ch) => sum + ch.word_count, 0).toLocaleString()} {t('dashboard.words', language)}</span>
      </div>
    </div>
  );
}

interface CharactersTabProps {
  characters: ProjectCharacter[];
  language: 'ar' | 'en';
  onAddCharacter: () => void;
  onEditCharacter: (character: ProjectCharacter) => void;
  onDeleteCharacter: (characterId: string) => void;
}

function CharactersTab({ characters, language, onAddCharacter, onEditCharacter, onDeleteCharacter }: CharactersTabProps) {
  const handleDelete = async (characterId: string, characterName: string) => {
    if (window.confirm(language === 'ar' ? `هل تريد حذف الشخصية "${characterName}"؟` : `Delete character "${characterName}"?`)) {
      onDeleteCharacter(characterId);
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('project.characters.title', language)}</h3>
        <button
          onClick={onAddCharacter}
          className="px-4 py-2 text-white rounded-lg"
          style={{ backgroundColor: 'var(--color-accent)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
        >
          {t('project.characters.add', language)}
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-5xl mb-3">👥</div>
          <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('project.characters.title', language)}</h4>
          <p style={{ color: 'var(--color-text-secondary)' }}>{t('project.characters.description', language)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map((character) => (
            <div
              key={character.id}
              className="rounded-xl shadow-sm p-6 cursor-pointer transition-all"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border-light)'
              }}
              onClick={() => onEditCharacter(character)}
            >
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>{character.name}</h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(character.id, character.name);
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

              <div className="mt-3 space-y-2">
                {character.dialogue_name && (
                  <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                    {language === 'ar' ? 'الاسم الخاص:' : 'Dialogue Name:'} {character.dialogue_name}
                  </div>
                )}

                {character.description && (
                  <p className="text-sm line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {character.description}
                  </p>
                )}

                {character.personality_traits && (
                  <p className="text-sm line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <strong>{language === 'ar' ? 'السمات الشخصية:' : 'Personality:'}</strong> {character.personality_traits}
                  </p>
                )}

                {character.goals && (
                  <p className="text-sm line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <strong>{language === 'ar' ? 'الأهداف:' : 'Goals:'}</strong> {character.goals}
                  </p>
                )}

                {character.fears && (
                  <p className="text-sm line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <strong>{language === 'ar' ? 'المخاوف:' : 'Fears:'}</strong> {character.fears}
                  </p>
                )}

                {!character.dialogue_name && !character.description && !character.personality_traits && !character.goals && !character.fears && (
                  <p className="text-sm italic" style={{ color: 'var(--color-text-tertiary)' }}>
                    {language === 'ar' ? 'انقر لإضافة التفاصيل' : 'Click to add details'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ReferencesTabProps {
  references: any[];
  language: 'ar' | 'en';
  onAddReference: () => void;
  onEditReference: (reference: any) => void;
  onDeleteReference: (referenceId: string) => void;
}

function ReferencesTab({ references, language, onAddReference, onEditReference, onDeleteReference }: ReferencesTabProps) {
  const handleDelete = async (referenceId: string, referenceName: string) => {
    if (window.confirm(language === 'ar' ? `هل تريد حذف المرجع "${referenceName}"؟` : `Delete reference "${referenceName}"?`)) {
      onDeleteReference(referenceId);
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('project.references.title', language)}</h3>
        <button
          onClick={onAddReference}
          className="px-4 py-2 text-white rounded-lg"
          style={{ backgroundColor: 'var(--color-accent)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
        >
          {t('project.references.add', language)}
        </button>
      </div>

      {references.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-5xl mb-3">📚</div>
          <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('project.references.title', language)}</h4>
          <p style={{ color: 'var(--color-text-secondary)' }}>{t('project.references.description', language)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {references.map((reference) => (
            <div
              key={reference.id}
              className="rounded-xl shadow-sm p-6 cursor-pointer transition-all"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border-light)'
              }}
              onClick={() => onEditReference(reference)}
            >
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>{reference.reference_name}</h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(reference.id, reference.reference_name);
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

              <div className="mt-3 space-y-2">
                {reference.author_name && (
                  <p className="text-sm line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <strong>{language === 'ar' ? 'المؤلف:' : 'Author:'}</strong> {reference.author_name}
                  </p>
                )}

                {reference.page_number && (
                  <p className="text-sm line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <strong>{language === 'ar' ? 'الصفحة:' : 'Page:'}</strong> {reference.page_number}
                  </p>
                )}

                {reference.quote && (
                  <p className="text-sm line-clamp-2 italic" style={{ color: 'var(--color-text-tertiary)' }}>
                    "{reference.quote}"
                  </p>
                )}

                {!reference.author_name && !reference.page_number && !reference.quote && (
                  <p className="text-sm italic" style={{ color: 'var(--color-text-tertiary)' }}>
                    {language === 'ar' ? 'انقر لإضافة التفاصيل' : 'Click to add details'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
