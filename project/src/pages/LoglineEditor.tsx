import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { api, createChapter, createCharacter, createTask, getScenes } from '../services/api';
import type { Project } from '../types';
import { getProjectTypeConfig } from '../utils/projectTypeConfig';
import ContextMenu from '../components/ContextMenu';
import CharacterModal from '../components/CharacterModal';
import ChapterModal from '../components/ChapterModal';
import NoteModal from '../components/NoteModal';
import GlobalHeader from '../components/GlobalHeader';
import { dispatchAskDoooda } from '../components/doooda/dispatchAskDoooda';
import { useDooodaAccess } from '../components/doooda/useDooodaAccess';
import { FileDown } from 'lucide-react';
import VoiceToTextButton from '../components/VoiceToTextButton';

interface ContextMenuState {
  x: number;
  y: number;
  options: Array<{ label: string; onClick: () => void }>;
}

type TextDirection = 'rtl' | 'ltr';
type TextAlign = 'left' | 'center' | 'right' | 'justify';

export default function LoglineEditor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [project, setProject] = useState<Project | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [textDirection, setTextDirection] = useState<TextDirection>(language === 'ar' ? 'rtl' : 'ltr');
  const [textAlign, setTextAlign] = useState<TextAlign>(language === 'ar' ? 'right' : 'left');
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeout = useRef<NodeJS.Timeout>();
  const contentInitialized = useRef(false);
  const contentRef = useRef('');
  const lastSavedContentRef = useRef('');
  const projectRef = useRef<typeof project>(null);
  const projectIdRef = useRef<string | undefined>(undefined);
  const dooodaAccess = useDooodaAccess();
  projectRef.current = project;
  projectIdRef.current = projectId;

  useEffect(() => {
    setTextDirection(language === 'ar' ? 'rtl' : 'ltr');
    setTextAlign(language === 'ar' ? 'right' : 'left');
  }, [language]);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  useEffect(() => {
    const saveIfDirty = () => {
      const currentProjectId = projectIdRef.current;
      const currentContent = contentRef.current;
      if (currentProjectId && currentContent !== lastSavedContentRef.current && contentInitialized.current) {
        lastSavedContentRef.current = currentContent;
        api.updateProject(currentProjectId, { idea: currentContent }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', saveIfDirty);
    return () => {
      window.removeEventListener('beforeunload', saveIfDirty);
      saveIfDirty();
    };
  }, []);

  useEffect(() => {
    if (project && editorRef.current && !contentInitialized.current) {
      editorRef.current.innerHTML = project.idea || '';
      setContent(project.idea || '');
      contentInitialized.current = true;
      lastSavedContentRef.current = project.idea || '';
    }
  }, [project]);

  useEffect(() => {
    contentRef.current = content;

    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    if (contentInitialized.current && content !== lastSavedContentRef.current) {
      setSaveStatus('saving');
      autoSaveTimeout.current = setTimeout(() => {
        handleSave();
      }, 2000);
    }

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [content]);

  async function loadProject() {
    try {
      if (!projectId) return;
      const data = await api.getProject(projectId);
      setProject(data);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!projectId || !project) return;

    const contentToSave = contentRef.current;
    if (contentToSave === lastSavedContentRef.current) {
      setSaveStatus(null);
      return;
    }

    setSaveStatus('saving');
    try {
      await api.updateProject(projectId, { idea: contentToSave });
      lastSavedContentRef.current = contentToSave;
      setProject(prev => prev ? { ...prev, idea: contentToSave } : prev);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Failed to save logline:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    setSelectedText(selectedText);

    const typeConfig = project ? getProjectTypeConfig(project.project_type) : getProjectTypeConfig('novel');
    const options = [
      {
        label: language === 'ar' ? typeConfig.addContainerLabelAr : typeConfig.addContainerLabelEn,
        onClick: () => setShowChapterModal(true),
      },
      {
        label: language === 'ar' ? 'إضافة شخصية' : 'Add Character',
        onClick: () => setShowCharacterModal(true),
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
          logline: content,
          projectTitle: project?.title,
          projectType: project?.project_type,
        }),
      });
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options,
    });
  };

  const handleSaveCharacter = async (characterData: any) => {
    if (!projectId) return;
    try {
      await createCharacter(projectId, characterData);
      setShowCharacterModal(false);
    } catch (error) {
      console.error('Failed to create character:', error);
    }
  };

  const handleSaveChapter = async (chapterData: { title: string; summary?: string }) => {
    if (!projectId) return;
    try {
      await createChapter(projectId, chapterData);
      setShowChapterModal(false);
    } catch (error) {
      console.error('Failed to create chapter:', error);
    }
  };

  const handleSaveNote = async (noteData: { description: string }) => {
    if (!projectId) return;
    try {
      await createTask({
        project_id: projectId,
        context_type: 'logline',
        description: noteData.description,
      });
      setShowNoteModal(false);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const applyFormatting = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    contentRef.current = newContent;
    setContent(newContent);

    if (contentInitialized.current && newContent !== lastSavedContentRef.current) {
      setSaveStatus('saving');
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = setTimeout(() => {
        handleSave();
      }, 1500);
    }
  };

  const handleImportFromPlot = async () => {
    if (!projectId || !editorRef.current) return;

    try {
      const chapters = await api.getChapters(projectId);

      const typeConfig = project ? getProjectTypeConfig(project.project_type) : getProjectTypeConfig('novel');
      const containerLabelAr = typeConfig.containerLabelAr;
      const containerLabelEn = typeConfig.containerLabelEn;
      const unitLabelAr = typeConfig.unitLabelAr;
      const unitLabelEn = typeConfig.unitLabelEn;

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
        plotContent += `<p><strong>${chapter.title || (language === 'ar' ? `${containerLabelAr} ${chapter.chapter_number}` : `${containerLabelEn} ${chapter.chapter_number}`)}</strong></p>`;

        if (chapter.summary) {
          plotContent += `<p>${chapter.summary}</p>`;
        }

        if (typeConfig.hasLevel2) {
          const scenes = await getScenes(chapter.id);

          if (scenes.length > 0) {
            for (const scene of scenes) {
              plotContent += `<p style="${indentStyle}"><strong>${scene.title || (language === 'ar' ? `${unitLabelAr} ${scene.position + 1}` : `${unitLabelEn} ${scene.position + 1}`)}</strong></p>`;

              if (scene.summary) {
                plotContent += `<p style="${indentStyle}">${scene.summary}</p>`;
              }
            }
          }
        }

        plotContent += '<p><br></p>';
      }

      const currentContent = editorRef.current.innerHTML;
      const newContent = currentContent + plotContent;

      editorRef.current.innerHTML = newContent;
      setContent(newContent);

    } catch (error) {
      console.error('Failed to import from plot:', error);
      alert(language === 'ar'
        ? 'حدث خطأ أثناء استيراد الحبكة'
        : 'An error occurred while importing the plot');
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

  if (!project) {
    return (
      <>
        <GlobalHeader />
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {language === 'ar' ? 'المشروع غير موجود' : 'Project not found'}
            </h2>
            <Link to="/dashboard" style={{ color: 'var(--color-accent)' }}>
              {language === 'ar' ? 'العودة إلى لوحة التحكم' : 'Back to dashboard'}
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <GlobalHeader />
      <header className="shadow-sm sticky top-14 z-10" style={{ backgroundColor: 'var(--editor-toolbar-bg)', borderBottom: `1px solid var(--editor-toolbar-border)` }}>
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between mb-3">
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
                className="flex items-center gap-2 font-medium"
                style={{ color: 'var(--editor-toolbar-text)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--editor-toolbar-text)'}
              >
                <span>{language === 'ar' ? 'رجوع' : 'Back'}</span>
              </button>
              <div className="h-6 w-px" style={{ backgroundColor: 'var(--editor-toolbar-border)' }}></div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--editor-toolbar-text)' }}>
                {language === 'ar' ? 'الخط الدرامي' : 'Logline'}
              </h1>
              <button
                onClick={handleImportFromPlot}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
                title={language === 'ar' ? 'استيراد الفصول والمشاهد من الحبكة' : 'Import chapters and scenes from plot'}
              >
                <FileDown className="w-4 h-4" />
                <span>{language === 'ar' ? 'استيراد من الحبكة' : 'Import from Plot'}</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              {saveStatus === 'saving' && (
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-sm" style={{ color: 'var(--color-success)' }}>
                  {language === 'ar' ? 'تم الحفظ' : 'Saved'}
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
                  {language === 'ar' ? 'فشل الحفظ' : 'Save failed'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-3" style={{ borderTop: `1px solid var(--editor-toolbar-border)` }}>
            <div className="flex items-center gap-1 pr-2" style={{ borderRight: `1px solid var(--editor-toolbar-border)` }}>
              <button
                onClick={() => setTextDirection('rtl')}
                className="p-2 rounded"
                style={{
                  backgroundColor: textDirection === 'rtl' ? 'var(--editor-toolbar-active)' : 'transparent',
                  color: 'var(--editor-toolbar-text)'
                }}
                onMouseEnter={(e) => { if (textDirection !== 'rtl') e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)' }}
                onMouseLeave={(e) => { if (textDirection !== 'rtl') e.currentTarget.style.backgroundColor = 'transparent' }}
                title={language === 'ar' ? 'من اليمين لليسار' : 'Right to Left'}
              >
                <span className="text-sm font-semibold">RTL</span>
              </button>
              <button
                onClick={() => setTextDirection('ltr')}
                className="p-2 rounded"
                style={{
                  backgroundColor: textDirection === 'ltr' ? 'var(--editor-toolbar-active)' : 'transparent',
                  color: 'var(--editor-toolbar-text)'
                }}
                onMouseEnter={(e) => { if (textDirection !== 'ltr') e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)' }}
                onMouseLeave={(e) => { if (textDirection !== 'ltr') e.currentTarget.style.backgroundColor = 'transparent' }}
                title={language === 'ar' ? 'من اليسار لليمين' : 'Left to Right'}
              >
                <span className="text-sm font-semibold">LTR</span>
              </button>
            </div>

            <div className="flex items-center gap-1 pr-2" style={{ borderRight: `1px solid var(--editor-toolbar-border)` }}>
              <button
                onClick={() => {
                  setTextAlign('left');
                  applyFormatting('justifyLeft');
                }}
                className="p-2 rounded" style={{ backgroundColor: textAlign === 'left' ? 'var(--editor-toolbar-active)' : 'transparent', color: 'var(--editor-toolbar-text)' }} onMouseEnter={(e) => { if (textAlign !== 'left') e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)' }} onMouseLeave={(e) => { if (textAlign !== 'left') e.currentTarget.style.backgroundColor = 'transparent' }}
                title={language === 'ar' ? 'محاذاة لليسار' : 'Align Left'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setTextAlign('center');
                  applyFormatting('justifyCenter');
                }}
                className="p-2 rounded" style={{ backgroundColor: textAlign === 'center' ? 'var(--editor-toolbar-active)' : 'transparent', color: 'var(--editor-toolbar-text)' }} onMouseEnter={(e) => { if (textAlign !== 'center') e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)' }} onMouseLeave={(e) => { if (textAlign !== 'center') e.currentTarget.style.backgroundColor = 'transparent' }}
                title={language === 'ar' ? 'محاذاة للوسط' : 'Align Center'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setTextAlign('right');
                  applyFormatting('justifyRight');
                }}
                className="p-2 rounded" style={{ backgroundColor: textAlign === 'right' ? 'var(--editor-toolbar-active)' : 'transparent', color: 'var(--editor-toolbar-text)' }} onMouseEnter={(e) => { if (textAlign !== 'right') e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)' }} onMouseLeave={(e) => { if (textAlign !== 'right') e.currentTarget.style.backgroundColor = 'transparent' }}
                title={language === 'ar' ? 'محاذاة لليمين' : 'Align Right'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setTextAlign('justify');
                  applyFormatting('justifyFull');
                }}
                className="p-2 rounded" style={{ backgroundColor: textAlign === 'justify' ? 'var(--editor-toolbar-active)' : 'transparent', color: 'var(--editor-toolbar-text)' }} onMouseEnter={(e) => { if (textAlign !== 'justify') e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)' }} onMouseLeave={(e) => { if (textAlign !== 'justify') e.currentTarget.style.backgroundColor = 'transparent' }}
                title={language === 'ar' ? 'ضبط' : 'Justify'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-1 pr-2" style={{ borderRight: `1px solid var(--editor-toolbar-border)` }}>
              <button
                onClick={() => applyFormatting('bold')}
                className="p-2 rounded flex items-center justify-center" style={{ backgroundColor: 'transparent', color: 'var(--editor-toolbar-text)', width: '36px', height: '36px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={language === 'ar' ? 'عريض' : 'Bold'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <text x="50%" y="50%" fontWeight="bold" fontSize="16" fill="currentColor" textAnchor="middle" dominantBaseline="central">B</text>
                </svg>
              </button>
              <button
                onClick={() => applyFormatting('italic')}
                className="p-2 rounded flex items-center justify-center" style={{ backgroundColor: 'transparent', color: 'var(--editor-toolbar-text)', width: '36px', height: '36px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={language === 'ar' ? 'مائل' : 'Italic'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <text x="50%" y="50%" fontStyle="italic" fontSize="16" fill="currentColor" textAnchor="middle" dominantBaseline="central">I</text>
                </svg>
              </button>
              <button
                onClick={() => applyFormatting('strikeThrough')}
                className="p-2 rounded flex items-center justify-center" style={{ backgroundColor: 'transparent', color: 'var(--editor-toolbar-text)', width: '36px', height: '36px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={language === 'ar' ? 'يتوسطه خط' : 'Strikethrough'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <text x="50%" y="50%" fontSize="16" fill="currentColor" textDecoration="line-through" textAnchor="middle" dominantBaseline="central">S</text>
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => applyFormatting('undo')}
                className="p-2 rounded" style={{ backgroundColor: 'transparent', color: 'var(--editor-toolbar-text)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={language === 'ar' ? 'تراجع' : 'Undo'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button
                onClick={() => applyFormatting('redo')}
                className="p-2 rounded" style={{ backgroundColor: 'transparent', color: 'var(--editor-toolbar-text)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={language === 'ar' ? 'إعادة' : 'Redo'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                </svg>
              </button>
              <button
                onClick={() => applyFormatting('removeFormat')}
                className="p-2 rounded" style={{ backgroundColor: 'transparent', color: 'var(--editor-toolbar-text)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={language === 'ar' ? 'مسح التنسيق' : 'Clear Formatting'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-1 pr-2" style={{ borderLeft: `1px solid var(--editor-toolbar-border)`, paddingLeft: '8px' }}>
              <VoiceToTextButton editorRef={editorRef} onContentChange={handleInput} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: `1px solid var(--color-border-light)` }}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {language === 'ar' ? 'ما هو الخط الدرامي؟' : 'What is a Logline?'}
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {language === 'ar'
              ? 'الخط الدرامي هو ملخص قصير لفكرة مشروعك الرئيسية. اكتب هنا الفكرة الأساسية التي يدور حولها عملك.'
              : 'The logline is a brief summary of your project\'s main idea. Write the core concept that your work revolves around.'}
          </p>
        </div>

        <div className="flex-1 rounded-lg shadow-sm overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--editor-bg)', border: `1px solid var(--editor-border)` }}>
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onContextMenu={handleContextMenu}
            dir={textDirection}
            className="flex-1 p-6 focus:outline-none min-h-[500px] prose prose-lg max-w-none"
            style={{
              backgroundColor: 'var(--editor-bg)',
              color: 'var(--editor-text)',
              lineHeight: '1.8',
              textAlign: textAlign,
              unicodeBidi: 'plaintext',
            }}
          />
          <div className="h-20"></div>
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

      {showCharacterModal && projectId && (
        <CharacterModal
          projectId={projectId}
          onClose={() => setShowCharacterModal(false)}
          onSave={handleSaveCharacter}
          initialName={selectedText}
          language={language}
        />
      )}

      {showChapterModal && projectId && (
        <ChapterModal
          projectId={projectId}
          onClose={() => setShowChapterModal(false)}
          onSave={handleSaveChapter}
          language={language}
        />
      )}

      {showNoteModal && projectId && (
        <NoteModal
          projectId={projectId}
          contextType="logline"
          onClose={() => setShowNoteModal(false)}
          onSave={handleSaveNote}
          language={language}
        />
      )}
    </div>
  );
}
