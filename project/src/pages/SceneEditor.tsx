import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserPlan } from '../hooks/useUserPlan';
import { getScene, updateScene, createCharacter, createTask, api, logActivity, getInlineComments, stripCommentAnchors } from '../services/api';
import type { Scene, Project } from '../types';
import { getProjectTypeConfig, formatSceneHeader } from '../utils/projectTypeConfig';
import ContextMenu from '../components/ContextMenu';
import CharacterModal from '../components/CharacterModal';
import CharacterDialogueModal from '../components/CharacterDialogueModal';
import NoteModal from '../components/NoteModal';
import GlobalHeader from '../components/GlobalHeader';
import { dispatchAskDoooda } from '../components/doooda/dispatchAskDoooda';
import { useDooodaAccess } from '../components/doooda/useDooodaAccess';
import { diacritizeText, type ArabicToolMode } from '../api/diacritizeText';
import { supabase } from '../lib/supabaseClient';
import { useEditorImages } from '../hooks/useEditorImages';
import { useDailyGoal } from '../hooks/useDailyGoal';
import ScopedShareModal from '../components/ScopedShareModal';
import SceneComments from '../components/SceneComments';
import EditLockBanner from '../components/EditLockBanner';
import ActiveUsersBar from '../components/ActiveUsersBar';
import { usePresence } from '../hooks/usePresence';
import { Share2, MessageSquare, MessageCircle } from 'lucide-react';
import { useScopeAccess } from '../hooks/useScopeAccess';
import VoiceToTextButton from '../components/VoiceToTextButton';
import InlineCommentSidebar from '../components/InlineCommentSidebar';
import type { InlineComment } from '../types';

interface ContextMenuSubOption {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  options: Array<{
    label: string;
    onClick?: () => void;
    submenu?: ContextMenuSubOption[];
    disabled?: boolean;
  }>;
}

type TextDirection = 'rtl' | 'ltr';
type TextAlign = 'left' | 'center' | 'right' | 'justify';

export default function SceneEditor() {
  const { projectId, chapterId, sceneId } = useParams<{ projectId: string; chapterId: string; sceneId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { isFree } = useUserPlan();
  const [scene, setScene] = useState<Scene | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [showCharacterDialogueModal, setShowCharacterDialogueModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [textDirection, setTextDirection] = useState<TextDirection>(language === 'ar' ? 'rtl' : 'ltr');
  const [textAlign, setTextAlign] = useState<TextAlign>(language === 'ar' ? 'right' : 'left');
  const [isDiacritizing, setIsDiacritizing] = useState(false);
  const [activeArabicTaskLabel, setActiveArabicTaskLabel] = useState<string | null>(null);
  const [showArabicToolsMenu, setShowArabicToolsMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentTab, setCommentTab] = useState<'general' | 'inline'>('inline');
  const [inlineComments, setInlineComments] = useState<InlineComment[]>([]);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [savedSelectionRange, setSavedSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [lockDismissed, setLockDismissed] = useState(false);

  const isOwner = project ? project.user_id === user?.id : false;
  const scopeCheck = useScopeAccess(projectId, 'scene', sceneId, project?.user_id);
  const [arabicToolsWarning, setArabicToolsWarning] = useState<{ mode: ArabicToolMode } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const cursorPositionRef = useRef<{ node: Node; offset: number } | null>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const autoSaveTimeout = useRef<NodeJS.Timeout>();
  const contentInitialized = useRef(false);
  const isSavingRef = useRef(false);
  const lastSavedWordCount = useRef(0);
  const wordCountRef = useRef(0);
  const contentRef = useRef('');
  const lastSavedContentRef = useRef('');
  const sceneRef = useRef<typeof scene>(null);
  const sceneIdRef = useRef<string | undefined>(undefined);
  const projectIdRef = useRef<string | undefined>(undefined);
  const handleSaveRef = useRef<() => Promise<void>>(async () => {});
  const dooodaAccess = useDooodaAccess();
  const { recordWritingWords, goalState } = useDailyGoal(user?.id);
  const recordWritingWordsRef = useRef(recordWritingWords);
  recordWritingWordsRef.current = recordWritingWords;
  sceneRef.current = scene;
  sceneIdRef.current = sceneId;
  projectIdRef.current = projectId;

  const presenceDisplayName = (user as any)?.user_metadata?.pen_name
    || (user as any)?.user_metadata?.first_name
    || user?.email?.split('@')[0]
    || 'User';

  const { activeUsers, setEditing, isSceneLocked } = usePresence(
    projectId,
    user?.id,
    presenceDisplayName,
    sceneId
  );

  const currentLock = sceneId ? isSceneLocked(sceneId) : null;

  useEffect(() => {
    if (currentLock) setLockDismissed(false);
  }, [currentLock?.userId]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    function blockCopy(e: ClipboardEvent) {
      if (isFree) {
        e.preventDefault();
      }
    }

    editor.addEventListener('copy', blockCopy);
    editor.addEventListener('cut', blockCopy);
    return () => {
      editor.removeEventListener('copy', blockCopy);
      editor.removeEventListener('cut', blockCopy);
    };
  }, [isFree]);

  const { triggerImageUpload, rehydrateImages } = useEditorImages({
    editorRef,
    language,
    onContentChange: (html) => setContent(html),
  });

  useEffect(() => {
    if (showComments && commentTab === 'inline' && pendingSelectionRef.current) {
      setPendingSelection(pendingSelectionRef.current);
      pendingSelectionRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments, commentTab]);

useEffect(() => {
    setTextDirection(language === 'ar' ? 'rtl' : 'ltr');
    setTextAlign(language === 'ar' ? 'right' : 'left');
  }, [language]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showArabicToolsMenu && !target.closest('.arabic-tools-menu-container')) {
        setShowArabicToolsMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showArabicToolsMenu]);

  useEffect(() => {
    if (sceneId) {
      contentInitialized.current = false;
      lastSavedWordCount.current = 0;
      setScene(null);
      setContent('');
      setWordCount(0);
      if (editorRef.current) editorRef.current.innerHTML = '';
      loadScene();
      loadInlineComments();
    }
  }, [sceneId]);

  useEffect(() => {
    const openComments = searchParams.get('comments') === 'true';
    const commentId = searchParams.get('comment_id');
    const commentType = searchParams.get('comment_type');
    if (openComments) {
      setShowComments(true);
      setCommentTab(commentType === 'inline' ? 'inline' : 'general');
      if (commentId) {
        setHighlightedCommentId(commentId);
        setTimeout(() => {
          const el = document.querySelector(`[data-comment-id="${commentId}"]`) || document.getElementById(`comment-${commentId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add(commentType === 'inline' ? 'mention-highlight-inline' : 'mention-highlight');
            setTimeout(() => el.classList.remove('mention-highlight', 'mention-highlight-inline'), 3000);
          }
          setHighlightedCommentId(null);
        }, 500);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, sceneId]);

  async function loadInlineComments() {
    if (!sceneId) return;
    try {
      const data = await getInlineComments(sceneId);
      setInlineComments(data);
    } catch {}
  }

  useEffect(() => {
    let cachedAccessToken: string | null = null;
    supabase.auth.getSession().then(({ data }) => {
      cachedAccessToken = data.session?.access_token ?? null;
    });
    const authSub = supabase.auth.onAuthStateChange((_event, session) => {
      cachedAccessToken = session?.access_token ?? null;
    });

    const handleBeforeUnload = () => {
      const currentSceneId = sceneIdRef.current;
      const currentContent = contentRef.current;
      if (!currentSceneId || !contentInitialized.current) return;
      if (currentContent === lastSavedContentRef.current) return;
      if (!cachedAccessToken) return;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/scenes?id=eq.${currentSceneId}`;
      const body = JSON.stringify({ content: stripCommentAnchors(currentContent) });
      try {
        fetch(url, {
          method: 'PATCH',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cachedAccessToken}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Prefer': 'return=minimal',
          },
          body,
        }).catch(() => {});
        lastSavedContentRef.current = currentContent;
      } catch {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    const autoSaveInterval = setInterval(() => {
      if (!isSavingRef.current && contentInitialized.current) {
        const current = contentRef.current;
        const last = lastSavedContentRef.current;
        if (current !== last) {
          handleSaveRef.current();
        }
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      clearInterval(autoSaveInterval);
      handleBeforeUnload();
      authSub.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (scene && editorRef.current && !contentInitialized.current) {
      editorRef.current.innerHTML = scene.content;
      setContent(scene.content);
      contentInitialized.current = true;
      lastSavedContentRef.current = scene.content;
      const initialWords = countWords(scene.content);
      lastSavedWordCount.current = initialWords;
      wordCountRef.current = initialWords;
      setWordCount(initialWords);
      setTimeout(() => rehydrateImages(), 0);
    }
  }, [scene]);

  useEffect(() => {
    contentRef.current = content;
    calculateWordCount(content);
  }, [content]);

  async function loadScene() {
    try {
      if (!sceneId) return;
      const [sceneData, projectData] = await Promise.all([
        getScene(sceneId),
        projectId ? api.getProject(projectId).catch(() => null) : Promise.resolve(null),
      ]);
      if (projectData) setProject(projectData);
      setScene(sceneData);
    } catch (error) {
      console.error('Failed to load scene:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!editorRef.current || inlineComments.length === 0) return;
    const editor = editorRef.current;
    const anchors = editor.querySelectorAll('.comment-anchor');
    anchors.forEach(el => {
      const parent = el.parentNode;
      while (el.firstChild) parent?.insertBefore(el.firstChild, el);
      parent?.removeChild(el);
    });
    inlineComments
      .filter(c => c.status === 'open' && c.anchor_start != null && c.anchor_end != null)
      .forEach(comment => {
        try {
          const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
          let currentOffset = 0;
          let startNode: Text | null = null;
          let endNode: Text | null = null;
          let startOffset = 0;
          let endOffset = 0;

          while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            const nodeLen = node.length;
            if (!startNode && currentOffset + nodeLen > comment.anchor_start!) {
              startNode = node;
              startOffset = comment.anchor_start! - currentOffset;
            }
            if (currentOffset + nodeLen >= comment.anchor_end!) {
              endNode = node;
              endOffset = comment.anchor_end! - currentOffset;
              break;
            }
            currentOffset += nodeLen;
          }

          if (startNode && endNode) {
            const range = document.createRange();
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
            const span = document.createElement('span');
            span.className = 'comment-anchor';
            span.setAttribute('data-comment-id', comment.id);
            span.setAttribute('data-selected-text', comment.selected_text || '');
            range.surroundContents(span);
          }
        } catch {}
      });
  }, [inlineComments, contentInitialized.current]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    function handleAnchorHover(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('.comment-anchor') as HTMLElement | null;
      if (target) {
        const id = target.getAttribute('data-comment-id');
        if (id) setHighlightedCommentId(id);
      } else if (e.type === 'mouseleave') {
        setHighlightedCommentId(null);
      }
    }
    editor.addEventListener('mouseover', handleAnchorHover);
    editor.addEventListener('mouseout', handleAnchorHover);
    return () => {
      editor.removeEventListener('mouseover', handleAnchorHover);
      editor.removeEventListener('mouseout', handleAnchorHover);
    };
  }, []);

useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    
    // Remove any temporary highlights we added
    const tempHighlights = Array.from(editor.querySelectorAll('.comment-anchor.highlighted:not([data-comment-id])'));
    tempHighlights.forEach(el => {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    });
    
    // If no highlighted comment, stop here
    if (!highlightedCommentId) return;
    
    // Get the comment that's being hovered
    const comment = inlineComments.find(c => c.id === highlightedCommentId);
    
    // Only show highlight if comment has selected_text (i.e., was created on a text selection)
    if (!comment || !comment.selected_text || comment.anchor_start == null || comment.anchor_end == null) return;
    
    // Find the text in editor using anchor offsets and highlight it
    try {
      const textNodes: { node: Text; start: number }[] = [];
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
      let offset = 0;
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        textNodes.push({ node, start: offset });
        offset += node.length;
      }
      
      let startNode: Text | null = null;
      let endNode: Text | null = null;
      let startOffset = 0;
      let endOffset = 0;
      
      for (const tn of textNodes) {
        const tnEnd = tn.start + tn.node.length;
        if (!startNode && tnEnd > comment.anchor_start) {
          startNode = tn.node;
          startOffset = comment.anchor_start - tn.start;
        }
        if (tnEnd >= comment.anchor_end) {
          endNode = tn.node;
          endOffset = comment.anchor_end - tn.start;
          break;
        }
      }
      
      if (startNode && endNode) {
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        const span = document.createElement('span');
        span.className = 'comment-anchor highlighted';
        if (startNode === endNode) {
          range.surroundContents(span);
        } else {
          const content = range.extractContents();
          span.appendChild(content);
          range.insertNode(span);
        }
      }
    } catch {}
  }, [highlightedCommentId, inlineComments]);

  function countWords(text: string): number {
    const withSpaces = text
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(div|p|li|h[1-6]|blockquote)>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z]+;/g, '')
      .trim();
    if (!withSpaces) return 0;
    return withSpaces.split(/\s+/).filter(word => word.length > 0).length;
  }

  function calculateWordCount(text: string) {
    const count = countWords(text);
    wordCountRef.current = count;
    setWordCount(count);
  }

  async function handleSave() {
    if (isSavingRef.current) return;

    const currentSceneId = sceneIdRef.current;
    const currentScene = sceneRef.current;
    const currentProjectId = projectIdRef.current;
    if (!currentSceneId || !currentScene) return;

    const contentToSave = stripCommentAnchors(contentRef.current);
    if (contentToSave === lastSavedContentRef.current) {
      setSaveStatus(null);
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');
    try {
      await updateScene(currentSceneId, { content: contentToSave });
      lastSavedContentRef.current = contentToSave;
      setScene(prev => prev ? { ...prev, content: contentToSave } : prev);
      setEditing(currentSceneId, false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);

      const currentWords = wordCountRef.current;
      const wordsAdded = currentWords - lastSavedWordCount.current;
      if (wordsAdded > 0) {
        lastSavedWordCount.current = currentWords;
        recordWritingWordsRef.current(wordsAdded).catch(() => {});
      }
      if (currentProjectId) {
        logActivity(currentProjectId, 'edit_text', 'scene', currentScene.title || `Scene ${currentScene.position}`, currentSceneId).catch?.(() => {});
      }
    } catch (error) {
      console.error('Failed to save scene:', error);
      setSaveStatus('error' as any);
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      isSavingRef.current = false;
    }
  }
  handleSaveRef.current = handleSave;

  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      cursorPositionRef.current = {
        node: range.startContainer,
        offset: range.startOffset,
      };
      if (selection.toString().length > 0 && editorRef.current) {
        try {
          const preRange = document.createRange();
          preRange.selectNodeContents(editorRef.current);
          preRange.setEnd(range.startContainer, range.startOffset);
          const start = preRange.toString().length;
          const end = start + selection.toString().length;
          setSavedSelectionRange({ start, end, text: selection.toString() });
        } catch {}
      }
    }
  };

  const insertCharacterDialogue = (character: { id: string; dialogue_name: string; name: string }) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || !cursorPositionRef.current) return;

    try {
      const { node, offset } = cursorPositionRef.current;

      const range = document.createRange();
      range.setStart(node, offset);
      range.collapse(true);

      let currentLine = '';

      if (node.nodeType === Node.TEXT_NODE) {
        currentLine = node.textContent || '';
        const textBeforeCursor = currentLine.substring(0, offset);
        const lastNewline = textBeforeCursor.lastIndexOf('\n');
        if (lastNewline !== -1) {
          currentLine = textBeforeCursor.substring(lastNewline + 1);
        } else {
          currentLine = textBeforeCursor;
        }

        if (node.parentNode) {
          let sibling = node.previousSibling;
          while (sibling) {
            const siblingText = sibling.textContent || '';
            const lastNewlineInSibling = siblingText.lastIndexOf('\n');
            if (lastNewlineInSibling !== -1) {
              currentLine = siblingText.substring(lastNewlineInSibling + 1) + currentLine;
              break;
            } else {
              currentLine = siblingText + currentLine;
            }
            sibling = sibling.previousSibling;
          }
        }
      }

      const dialoguePattern = new RegExp(`${character.dialogue_name}\\s*:\\s*$`, 'i');
      if (dialoguePattern.test(currentLine.trim())) {
        return;
      }

      const dialogueBlock = document.createElement('div');
      dialogueBlock.setAttribute('data-character-dialogue-block', 'true');
      dialogueBlock.setAttribute('data-character-id', character.id);
      dialogueBlock.setAttribute('data-character-name', character.name);
      dialogueBlock.className = 'character-dialogue-block';

      const nameSpan = document.createElement('span');
      nameSpan.setAttribute('data-character-dialogue', 'true');
      nameSpan.setAttribute('data-character-name-label', 'true');
      nameSpan.className = 'character-dialogue-name';
      nameSpan.textContent = `${character.dialogue_name}:`;

      const textSpan = document.createElement('span');
      textSpan.className = 'character-dialogue-text';
      textSpan.setAttribute('contenteditable', 'true');
      textSpan.textContent = '\u00a0';

      dialogueBlock.appendChild(nameSpan);
      dialogueBlock.appendChild(textSpan);

      const br = document.createElement('br');

      range.insertNode(br);
      range.insertNode(dialogueBlock);

      range.setStart(textSpan, 1);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      setContent(editor.innerHTML);
      editor.focus();
    } catch (error) {
      console.error('Failed to insert character dialogue:', error);
    }
  };

  const detectCharacterInSelection = (): { characterId: string; characterName: string } | null => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    const characterElements: Set<string> = new Set();
    const characterNames: Map<string, string> = new Map();

    const processNode = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.hasAttribute('data-character-id') && element.hasAttribute('data-character-dialogue')) {
          const charId = element.getAttribute('data-character-id');
          const charName = element.getAttribute('data-character-name');
          if (charId) {
            characterElements.add(charId);
            if (charName) characterNames.set(charId, charName);
          }
        }
      }

      node.childNodes.forEach(child => processNode(child));
    };

    if (container.nodeType === Node.ELEMENT_NODE) {
      processNode(container);
    } else if (container.parentElement) {
      processNode(container.parentElement);
    }

    if (characterElements.size === 0) return null;
    if (characterElements.size > 1) {
      alert(language === 'ar' ? 'يمكن إرسال شخصية واحدة فقط في كل رسالة' : 'Only one character can be sent per message');
      return null;
    }

    const characterId = Array.from(characterElements)[0];
    const characterName = characterNames.get(characterId) || '';
    return { characterId, characterName };
  };

  const handleDiacritize = (mode: ArabicToolMode) => {
    setShowArabicToolsMenu(false);

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const currentSelectedText = selection.toString();
    if (!currentSelectedText || currentSelectedText.trim().length === 0) {
      alert('يرجى تحديد النص المراد معالجته');
      return;
    }

    const range = selection.getRangeAt(0);
    selectionRangeRef.current = range.cloneRange();

    setArabicToolsWarning({ mode });
  };

  const getArabicToolLabel = (mode: ArabicToolMode): string => {
    const labels: Record<ArabicToolMode, string> = {
      light: 'التشكيل الخفيف',
      full: 'التشكيل الكامل',
      correction_with_diacritics: 'التصحيح والتشكيل',
      proofread: 'التدقيق اللغوي',
      proofread_advanced: 'التدقيق الشامل',
      punctuation: 'علامات الترقيم',
      light_with_punctuation: 'التشكيل الخفيف والترقيم',
      full_with_punctuation: 'التشكيل الكامل والترقيم',
    };
    return labels[mode] || mode;
  };

  function applyDiacritizedToFragment(fragment: DocumentFragment, diacritizedText: string): DocumentFragment {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if ((node as Text).textContent && (node as Text).textContent!.trim().length > 0) {
        textNodes.push(node as Text);
      }
    }

    if (textNodes.length === 0) return fragment;

    if (textNodes.length === 1) {
      textNodes[0].textContent = diacritizedText;
      return fragment;
    }

    const totalOriginalLength = textNodes.reduce((sum, n) => sum + (n.textContent || '').length, 0);
    let remainingText = diacritizedText;

    for (let i = 0; i < textNodes.length - 1; i++) {
      const proportion = (textNodes[i].textContent || '').length / totalOriginalLength;
      let splitAt = Math.round(proportion * diacritizedText.length);
      while (splitAt < remainingText.length && remainingText[splitAt] !== ' ') {
        splitAt++;
      }
      textNodes[i].textContent = remainingText.substring(0, splitAt);
      remainingText = remainingText.substring(splitAt).trimStart();
    }
    textNodes[textNodes.length - 1].textContent = remainingText;

    return fragment;
  }

  const executeArabicTool = async (mode: ArabicToolMode) => {
    setArabicToolsWarning(null);

    const savedRange = selectionRangeRef.current;
    if (!savedRange || !editorRef.current) return;

    let textToProcess = '';
    let clonedFragment: DocumentFragment | null = null;
    try {
      clonedFragment = savedRange.cloneContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(clonedFragment.cloneNode(true));
      textToProcess = tempDiv.innerText || tempDiv.textContent || '';
    } catch {
      textToProcess = '';
    }

    if (!textToProcess.trim()) {
      alert('يرجى تحديد النص المراد معالجته');
      return;
    }

    setIsDiacritizing(true);
    setActiveArabicTaskLabel(getArabicToolLabel(mode));

    try {
      const result = await diacritizeText(textToProcess, mode, language);

      if ('error' in result) {
        alert(result.error);
        return;
      }

      const processedText = result.diacritizedText;
      if (!processedText || !selectionRangeRef.current || !editorRef.current || !clonedFragment) return;

      const modifiedFragment = applyDiacritizedToFragment(clonedFragment, processedText);

      const range = selectionRangeRef.current;

      editorRef.current.focus();

      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }

      range.deleteContents();
      const lastInserted = modifiedFragment.lastChild;
      range.insertNode(modifiedFragment);

      if (lastInserted) {
        const postRange = document.createRange();
        postRange.setStartAfter(lastInserted);
        postRange.collapse(true);
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(postRange);
        }
      }

      setContent(editorRef.current.innerHTML);

    } catch (error) {
      console.error('Arabic tools error:', error);
      alert('حدث خطأ أثناء معالجة النص');
    } finally {
      setIsDiacritizing(false);
      setActiveArabicTaskLabel(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    const selectedText = savedSelectionRange?.text || window.getSelection()?.toString() || '';
    setSelectedText(selectedText);

    if (!selectedText || !savedSelectionRange) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        options: [],
      });
      return;
    }

    const options: Array<{
      label: string;
      onClick?: () => void;
      submenu?: Array<{ label: string; onClick: () => void; disabled?: boolean }>;
      disabled?: boolean;
    }> = [
      {
        label: language === 'ar' ? 'جلب شخصية للحوار' : 'Insert Character Dialogue',
        onClick: () => setShowCharacterDialogueModal(true),
      },
      {
        label: 'نسخ',
        onClick: () => {
          navigator.clipboard.writeText(selectedText);
          setContextMenu(null);
        },
        disabled: false,
      },
    ];

    if (isArabic) {
      const disabled = isDiacritizing;
      options.push({
        label: 'أدوات اللغة العربية',
        disabled,
        submenu: [
          {
            label: 'تشكيل خفيف',
            onClick: () => handleDiacritize('light'),
            disabled,
          },
          {
            label: 'تشكيل كامل',
            onClick: () => handleDiacritize('full'),
            disabled,
          },
          {
            label: 'تشكيل خفيف + علامات الترقيم',
            onClick: () => handleDiacritize('light_with_punctuation'),
            disabled,
          },
          {
            label: 'تشكيل كامل + علامات الترقيم',
            onClick: () => handleDiacritize('full_with_punctuation'),
            disabled,
          },
          {
            label: 'علامات الترقيم',
            onClick: () => handleDiacritize('punctuation'),
            disabled,
          },
          {
            label: 'تصحيح + تشكيل',
            onClick: () => handleDiacritize('correction_with_diacritics'),
            disabled,
          },
          {
            label: 'تصحيح فقط',
            onClick: () => handleDiacritize('correction'),
            disabled,
          },
        ],
      });
    }

    if (selectedText.length > 0 && (isOwner || !scopeCheck.loading)) {
      options.push({
        label: language === 'ar' ? 'إضافة تعليق' : 'Add Comment',
        onClick: () => {
          const selRange = savedSelectionRange;
          if (selRange) {
            setPendingSelection({ ...selRange });
            setShowComments(true);
            setCommentTab('inline');
          }
          setContextMenu(null);
        },
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

  const handleSaveNote = async (noteData: { description: string; chapterId?: string; sceneId?: string }) => {
    if (!projectId || !scene) return;
    try {
      await createTask({
        project_id: projectId,
        context_type: 'scene_content',
        description: noteData.description,
        chapter_id: chapterId,
        scene_id: sceneId,
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
    if (sceneId) setEditing(sceneId, true);

    if (contentInitialized.current && newContent !== lastSavedContentRef.current) {
      setSaveStatus('saving');
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = setTimeout(() => {
        handleSaveRef.current();
      }, 1500);
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;

    const dialogueTextSpan = (anchorNode.nodeType === Node.TEXT_NODE
      ? anchorNode.parentElement
      : anchorNode as HTMLElement)?.closest('.character-dialogue-text');

    const dialogueBlock = (anchorNode.nodeType === Node.TEXT_NODE
      ? anchorNode.parentElement
      : anchorNode as HTMLElement)?.closest('.character-dialogue-block');

    if (e.key === 'Backspace' && dialogueTextSpan && dialogueBlock) {
      const range = selection.getRangeAt(0);
      const textContent = dialogueTextSpan.textContent || '';
      const cleanText = textContent.replace(/\u00a0/g, '').trim();

      if (cleanText.length === 0) {
        e.preventDefault();
        const editor = editorRef.current;
        if (!editor) return;

        const newRange = document.createRange();
        const prevSibling = dialogueBlock.previousSibling;
        if (prevSibling) {
          if (prevSibling.nodeType === Node.TEXT_NODE) {
            newRange.setStart(prevSibling, (prevSibling.textContent || '').length);
          } else {
            newRange.setStartAfter(prevSibling);
          }
        } else {
          newRange.setStart(editor, 0);
        }
        newRange.collapse(true);

        const br = dialogueBlock.nextSibling;
        if (br && br.nodeName === 'BR') br.remove();
        dialogueBlock.remove();

        selection.removeAllRanges();
        selection.addRange(newRange);
        setContent(editor.innerHTML);
        return;
      }
      void range;
    }

    if (e.key === 'Enter' && dialogueBlock) {
      e.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;

      const newDiv = document.createElement('div');
      newDiv.innerHTML = '\u200B';

      const br = dialogueBlock.nextSibling;
      if (br && br.nodeName === 'BR') {
        dialogueBlock.parentNode?.insertBefore(newDiv, br.nextSibling);
      } else {
        dialogueBlock.parentNode?.insertBefore(newDiv, dialogueBlock.nextSibling);
      }

      const newRange = document.createRange();
      const textNode = newDiv.firstChild || newDiv;
      newRange.setStart(textNode, 1);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);

      setContent(editor.innerHTML);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;

      document.execCommand('insertParagraph', false);
      setContent(editor.innerHTML);
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

  if (!scene) {
    return (
      <>
        <GlobalHeader />
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {language === 'ar' ? 'المشهد غير موجود' : 'Scene not found'}
            </h2>
            <Link to={`/projects/${projectId}/chapters/${chapterId}`} style={{ color: 'var(--color-accent)' }}>
              {language === 'ar' ? 'العودة إلى الفصل' : 'Back to chapter'}
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
                ? 'لا تملك صلاحية للوصول إلى هذا المشهد. صلاحيتك محدودة بجزء آخر من المشروع.'
                : "You don't have access to this scene. Your access is limited to a different part of the project."}
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
                onClick={() => navigate(`/projects/${projectId}/chapters/${chapterId}`)}
                className="flex items-center gap-2 font-medium"
                style={{ color: 'var(--editor-toolbar-text)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--editor-toolbar-text)'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={language === 'ar' ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                </svg>
                <span>
                  {project
                    ? (language === 'ar'
                        ? getProjectTypeConfig(project.project_type).containerLabelAr
                        : getProjectTypeConfig(project.project_type).containerLabelEn)
                    : (language === 'ar' ? 'رجوع' : 'Back')}
                </span>
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="font-medium text-sm"
                style={{ color: 'var(--editor-toolbar-text)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--editor-toolbar-text)'}
              >
                {language === 'ar' ? 'صفحة المشروع' : 'Project Page'}
              </button>
              <div className="h-6 w-px" style={{ backgroundColor: 'var(--editor-toolbar-border)' }}></div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--editor-toolbar-text)' }}>{scene.title}</h1>
            </div>
            <div className="flex items-center gap-3">
              {isOwner && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                  style={{ color: 'var(--editor-toolbar-text)', border: '1px solid var(--editor-toolbar-border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--editor-toolbar-text)'; e.currentTarget.style.borderColor = 'var(--editor-toolbar-border)'; }}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'مشاركة' : 'Share'}</span>
                </button>
              )}
              {(isOwner || !scopeCheck.loading) && (
                <button
                  onClick={() => { setShowComments(!showComments); if (!showComments) setCommentTab('general'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    color: showComments ? 'var(--color-accent)' : 'var(--editor-toolbar-text)',
                    border: `1px solid ${showComments ? 'var(--color-accent)' : 'var(--editor-toolbar-border)'}`,
                    backgroundColor: showComments ? 'rgba(59,130,246,0.08)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!showComments) { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; } }}
                  onMouseLeave={(e) => { if (!showComments) { e.currentTarget.style.color = 'var(--editor-toolbar-text)'; e.currentTarget.style.borderColor = 'var(--editor-toolbar-border)'; } }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'تعليقات' : 'Comments'}</span>
                </button>
              )}
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
              <span className="text-sm" style={{ color: 'var(--editor-toolbar-text)' }}>
                {wordCount} {language === 'ar' ? 'كلمة' : 'words'}
              </span>
              {activeUsers.length > 0 && (
                <div className="relative">
                  <ActiveUsersBar users={activeUsers} />
                </div>
              )}
              {goalState.goalWords && (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5">
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--editor-toolbar-border)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.round((goalState.todayWords / goalState.goalWords) * 100))}%`,
                          backgroundColor: goalState.goalReached ? '#4ade80' : 'var(--color-accent)',
                        }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: goalState.goalReached ? '#4ade80' : 'var(--color-text-secondary)' }}>
                      {goalState.todayWords}/{goalState.goalWords}
                    </span>
                  </div>
                  {goalState.goalReached && (
                    <span className="text-xs font-medium" style={{ color: '#4ade80' }}>
                      {language === 'ar' ? '✓ حققت هدفك!' : '✓ Goal reached!'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-3" style={{ borderTop: `1px solid var(--editor-toolbar-border)` }}>
            <div className="flex items-center gap-1 pr-2" style={{ borderRight: `1px solid var(--editor-toolbar-border)` }}>
              <button
                onClick={() => setTextDirection('rtl')}
                className="p-2 rounded" style={{ backgroundColor: textDirection === 'rtl' ? 'var(--editor-toolbar-active)' : 'transparent', color: 'var(--editor-toolbar-text)' }} onMouseEnter={(e) => { if (textDirection !== 'rtl') e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)' }} onMouseLeave={(e) => { if (textDirection !== 'rtl') e.currentTarget.style.backgroundColor = 'transparent' }}
                title={language === 'ar' ? 'من اليمين لليسار' : 'Right to Left'}
              >
                <span className="text-sm font-semibold">RTL</span>
              </button>
              <button
                onClick={() => setTextDirection('ltr')}
                className="p-2 rounded" style={{ backgroundColor: textDirection === 'ltr' ? 'var(--editor-toolbar-active)' : 'transparent', color: 'var(--editor-toolbar-text)' }} onMouseEnter={(e) => { if (textDirection !== 'ltr') e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)' }} onMouseLeave={(e) => { if (textDirection !== 'ltr') e.currentTarget.style.backgroundColor = 'transparent' }}
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

            <div className="flex items-center gap-1 pr-2" style={{ borderRight: `1px solid var(--editor-toolbar-border)` }}>
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

            <div className="flex items-center gap-1 pr-2" style={{ borderRight: `1px solid var(--editor-toolbar-border)` }}>
              <button
                onClick={triggerImageUpload}
                className="p-2 rounded flex items-center justify-center"
                style={{ backgroundColor: 'transparent', color: 'var(--editor-toolbar-text)', width: '36px', height: '36px' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={language === 'ar' ? 'إضافة صورة (100 كيلوبايت كحد أقصى)' : 'Insert image (max 100KB)'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15l-5-5L5 21" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-1 pr-2" style={{ borderRight: `1px solid var(--editor-toolbar-border)` }}>
              <VoiceToTextButton editorRef={editorRef} onContentChange={handleInput} />
            </div>

            {language === 'ar' && (
              <div className="relative arabic-tools-menu-container">
                <button
                  onClick={() => { if (!isDiacritizing) setShowArabicToolsMenu(!showArabicToolsMenu); }}
                  disabled={isDiacritizing}
                  className="px-3 py-2 rounded flex items-center gap-2 text-sm font-medium"
                  style={{
                    backgroundColor: showArabicToolsMenu ? 'var(--editor-toolbar-active)' : 'transparent',
                    color: isDiacritizing ? 'var(--color-text-secondary)' : 'var(--editor-toolbar-text)',
                    cursor: isDiacritizing ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => { if (!showArabicToolsMenu && !isDiacritizing) e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)' }}
                  onMouseLeave={(e) => { if (!showArabicToolsMenu) e.currentTarget.style.backgroundColor = 'transparent' }}
                  title="أدوات اللغة العربية"
                >
                  {isDiacritizing && activeArabicTaskLabel ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>جاري {activeArabicTaskLabel}...</span>
                    </>
                  ) : (
                    <>
                      <span>أدوات اللغة العربية</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>

                {showArabicToolsMenu && !isDiacritizing && (
                  <div
                    className="absolute top-full mt-1 rounded-lg shadow-lg border z-50"
                    style={{
                      backgroundColor: 'var(--color-bg-primary)',
                      borderColor: 'var(--color-border-light)',
                      minWidth: '480px',
                      right: '0',
                      left: 'auto',
                    }}
                  >
                    <div className="flex" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                      <div className="flex-1 px-3 py-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>تشكيل</span>
                      </div>
                      <div className="flex-1 px-3 py-1.5" style={{ borderRight: '1px solid var(--color-border-light)' }}>
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>ترقيم وتدقيق</span>
                      </div>
                    </div>
                    <div className="flex">
                      <div className="flex-1 flex flex-col">
                        <button
                          onClick={() => handleDiacritize('light')}
                          className="w-full px-4 py-2 text-right"
                          style={{ color: 'var(--color-text-primary)', backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div className="text-sm font-medium">تشكيل خفيف</div>
                          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>تشكيل أواخر الكلمات والأفعال</div>
                        </button>
                        <button
                          onClick={() => handleDiacritize('full')}
                          className="w-full px-4 py-2 text-right"
                          style={{ color: 'var(--color-text-primary)', backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div className="text-sm font-medium">تشكيل كامل</div>
                          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>تشكيل كامل لكل الكلمات</div>
                        </button>
                        <button
                          onClick={() => handleDiacritize('light_with_punctuation')}
                          className="w-full px-4 py-2 text-right"
                          style={{ color: 'var(--color-text-primary)', backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div className="text-sm font-medium">تشكيل خفيف + ترقيم</div>
                          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>تشكيل خفيف مع إضافة علامات الترقيم</div>
                        </button>
                        <button
                          onClick={() => handleDiacritize('full_with_punctuation')}
                          className="w-full px-4 py-2 text-right rounded-bl-lg"
                          style={{ color: 'var(--color-text-primary)', backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div className="text-sm font-medium">تشكيل كامل + ترقيم</div>
                          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>تشكيل كامل مع إضافة علامات الترقيم</div>
                        </button>
                      </div>
                      <div className="flex-1 flex flex-col" style={{ borderRight: '1px solid var(--color-border-light)' }}>
                        <button
                          onClick={() => handleDiacritize('punctuation')}
                          className="w-full px-4 py-2 text-right"
                          style={{ color: 'var(--color-text-primary)', backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div className="text-sm font-medium">علامات الترقيم</div>
                          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>إضافة علامات الترقيم للنص</div>
                        </button>
                        <button
                          onClick={() => handleDiacritize('proofread')}
                          className="w-full px-4 py-2 text-right"
                          style={{ color: 'var(--color-text-primary)', backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div className="text-sm font-medium">تدقيق لغوي</div>
                          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>تصحيح الأخطاء الإملائية</div>
                        </button>
                        <button
                          onClick={() => handleDiacritize('proofread_advanced')}
                          className="w-full px-4 py-2 text-right"
                          style={{ color: 'var(--color-text-primary)', backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div className="text-sm font-medium">تدقيق لغوي شامل</div>
                          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>تصحيح شامل مع علامات الترقيم</div>
                        </button>
                        <button
                          onClick={() => handleDiacritize('correction_with_diacritics')}
                          className="w-full px-4 py-2 text-right rounded-br-lg"
                          style={{ color: 'var(--color-text-primary)', backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-toolbar-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div className="text-sm font-medium">تصحيح + تشكيل</div>
                          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>تصحيح الأخطاء مع تشكيل كامل</div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={`flex-1 flex ${showComments ? 'flex-row gap-0' : 'flex-col'} max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6`}>
        <div className={`flex flex-col ${showComments ? 'flex-1 min-w-0' : ''}`}>
        {currentLock && !lockDismissed && (
          <EditLockBanner
            lock={currentLock}
            onDismiss={() => setLockDismissed(true)}
          />
        )}
        {project && (() => {
          const typeConfig = getProjectTypeConfig(project.project_type);
          const sceneHeader = formatSceneHeader(scene);
          const hasScriptInfo = typeConfig.hasScriptFields && sceneHeader;
          const hasSoundInfo = typeConfig.hasSoundFields && (scene.background_sound || (scene.sound_cues && scene.sound_cues.length > 0));
          const hasChildrenInfo = typeConfig.hasChildrenFields && scene.page_number;
          const hasRef = scene.summary || scene.hook || hasScriptInfo || hasSoundInfo || hasChildrenInfo;
          if (!hasRef) return null;
          return (
            <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: `1px solid var(--color-border-light)` }} dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {language === 'ar' ? `مرجع ${typeConfig.unitLabelAr}` : `${typeConfig.unitLabelEn} Reference`}
              </h3>
              {hasScriptInfo && (
                <div className="font-mono text-sm font-bold mb-2 px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}>
                  {sceneHeader}
                  {scene.camera_shot && <span className="ml-3 opacity-60 text-xs">{scene.camera_shot}</span>}
                  {scene.camera_angle && <span className="ml-2 opacity-60 text-xs">{scene.camera_angle}</span>}
                </div>
              )}
              {hasSoundInfo && (
                <div className="mb-2 space-y-1">
                  {scene.background_sound && (
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {language === 'ar' ? 'خلفية: ' : 'BG: '}<span className="font-medium">{scene.background_sound}</span>
                    </p>
                  )}
                  {scene.sound_cues && scene.sound_cues.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {scene.sound_cues.map((cue, i) => (
                        <span key={i} className="px-1.5 py-0.5 text-xs rounded" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-accent)' }}>
                          [{cue.type.toUpperCase()}] {cue.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {hasChildrenInfo && (
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {language === 'ar' ? `صفحة ${scene.page_number}` : `Page ${scene.page_number}`}
                </p>
              )}
              {scene.summary && (
                <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>{scene.summary}</p>
              )}
              {scene.hook && (
                <div className="pt-2" style={{ borderTop: scene.summary ? '1px solid var(--color-border-light)' : 'none' }}>
                  <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {language === 'ar' ? 'الخطاف:' : 'Hook:'}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{scene.hook}</p>
                </div>
              )}
            </div>
          );
        })()}

        <div className="flex-1 rounded-lg shadow-sm overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--editor-bg)', border: `1px solid var(--editor-border)` }}>
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyDown={handleEditorKeyDown}
            onMouseDown={saveCursorPosition}
            onContextMenu={handleContextMenu}
            onCopy={(e) => { if (isFree) e.preventDefault(); }}
            onCut={(e) => { if (isFree) e.preventDefault(); }}
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

        {showComments && projectId && sceneId && (
          <div
            className="w-80 shrink-0 flex flex-col overflow-hidden"
            style={{
              borderLeft: language === 'ar' ? 'none' : `1px solid var(--color-border)`,
              borderRight: language === 'ar' ? `1px solid var(--color-border)` : 'none',
              marginLeft: language === 'ar' ? 0 : '16px',
              marginRight: language === 'ar' ? '16px' : 0,
              paddingLeft: language === 'ar' ? 0 : '16px',
              paddingRight: language === 'ar' ? '16px' : 0,
              height: 'calc(100vh - 180px)',
              position: 'sticky',
              top: '180px',
            }}
          >
            <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setCommentTab('inline')}
                className="flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                style={{
                  color: commentTab === 'inline' ? '#d97706' : 'var(--color-text-tertiary)',
                  borderBottom: commentTab === 'inline' ? '2px solid #d97706' : '2px solid transparent',
                  backgroundColor: commentTab === 'inline' ? 'rgba(217,119,6,0.06)' : 'transparent',
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {language === 'ar' ? 'تعليقات النص' : 'Text Comments'}
              </button>
              <button
                onClick={() => setCommentTab('general')}
                className="flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                style={{
                  color: commentTab === 'general' ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                  borderBottom: commentTab === 'general' ? '2px solid var(--color-accent)' : '2px solid transparent',
                  backgroundColor: commentTab === 'general' ? 'rgba(59,130,246,0.06)' : 'transparent',
                }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {language === 'ar' ? 'تعليقات عامة' : 'General'}
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {commentTab === 'inline' && user && (
                <InlineCommentSidebar
                  projectId={projectId}
                  sceneId={sceneId}
                  userId={user.id}
                  isOwner={isOwner}
                  onHoverComment={setHighlightedCommentId}
                  highlightedCommentId={highlightedCommentId}
                  pendingSelection={pendingSelection}
                  onClearPending={() => setPendingSelection(null)}
                  onCommentsChanged={loadInlineComments}
                />
              )}
              {commentTab === 'general' && (
                <SceneComments
                  projectId={projectId}
                  sceneId={sceneId}
                  isOwner={isOwner}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={contextMenu.options}
          onClose={() => setContextMenu(null)}
        />
      )}

      {arabicToolsWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm text-right" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', direction: 'rtl' }}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#d97706' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>تنبيه</h3>
            </div>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-secondary)' }}>
              لكي تحصل على نتيجة أدق، ظلّل الجملة أو الفقرة كاملة.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => executeArabicTool(arabicToolsWarning.mode)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                متابعة
              </button>
              <button
                onClick={() => setArabicToolsWarning(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
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

      {showNoteModal && projectId && (
        <NoteModal
          projectId={projectId}
          contextType="scene_content"
          chapterId={chapterId}
          sceneId={sceneId}
          onClose={() => setShowNoteModal(false)}
          onSave={handleSaveNote}
          language={language}
        />
      )}

      {showCharacterDialogueModal && projectId && (
        <CharacterDialogueModal
          projectId={projectId}
          onClose={() => setShowCharacterDialogueModal(false)}
          onSelectCharacter={insertCharacterDialogue}
          language={language}
        />
      )}

      {showShareModal && projectId && sceneId && scene && project && (
        <ScopedShareModal
          projectId={projectId}
          projectTitle={project.title}
          scope={{ type: 'scene', id: sceneId, title: scene.title }}
          onClose={() => setShowShareModal(false)}
          onShared={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
