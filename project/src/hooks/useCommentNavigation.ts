import { useEffect, useRef, useCallback } from 'react';
import { parseCommentParams, parseLegacyCommentParams, normalizeNavigationState, OrchestratorConfig, OrchestratorResult } from '../utils/commentNavigation';

interface UseCommentNavigationOptions {
  searchParams: URLSearchParams;
  sceneId?: string;
  projectId?: string;
  chapterId?: string;
  onSetActiveTab: (tab: 'inline' | 'general') => void;
  onOpenComments: (open: boolean) => void;
  onHighlight: (commentId: string | null, replyId?: string | null) => void;
  sceneReady?: boolean;
  commentsReady?: boolean;
  inlineCommentsRef?: React.MutableRefObject<any[]>;
  generalCommentsRef?: React.MutableRefObject<any[]>;
}

export interface CommentNavigationState {
  parsed: ReturnType<typeof parseCommentParams>;
  isLegacy: boolean;
  shouldProcess: boolean;
  navigationReady: boolean;
}

export function useCommentNavigation(options: UseCommentNavigationOptions) {
  const { searchParams, sceneId, projectId, chapterId, onSetActiveTab, onOpenComments, onHighlight, sceneReady = true, commentsReady = true } = options;
  
  const processedRef = useRef(false);
  const resultRef = useRef<OrchestratorResult | null>(null);
  const cancelSignalRef = useRef(false);
  
  const parseParams = useCallback(() => {
    const search = searchParams.toString();
    
    const newParams = parseCommentParams(search);
    if (newParams.commentId) {
      return { parsed: newParams, isLegacy: false };
    }
    
    const legacyParams = parseLegacyCommentParams(search);
    if (legacyParams) {
      return { parsed: legacyParams, isLegacy: true };
    }
    
    return { parsed: newParams, isLegacy: false };
  }, [searchParams]);
  
  const buildConfig = useCallback((): OrchestratorConfig => {
    return {
      maxRetries: 5,
      retryDelay: 300,
      maxTimeoutMs: 8000,
      sceneReadyCheck: () => sceneReady,
      commentsReadyCheck: () => commentsReady,
      expandThread: (commentId: string) => {
        console.log('[Orchestrator] Expand thread:', commentId);
      },
scrollToComment: (commentId: string) => {
        let el = document.querySelector(`[data-comment-id="${commentId}"]`) as HTMLElement;
        if (!el) {
          el = document.getElementById(`comment-${commentId}`) as HTMLElement;
        }
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return true;
        }
        return false;
      },
      scrollToReply: (replyId: string, parentId: string) => {
        let el = document.querySelector(`[data-reply-id="${replyId}"]`) as HTMLElement;
        if (!el) {
          el = document.querySelector(`[data-comment-id="${parentId}"] [data-reply-id="${replyId}"]`) as HTMLElement;
        }
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return true;
        }
        return false;
      },
      onTargetFound: (target) => {
        console.log('[Orchestrator] Target found:', target);
        onHighlight(target.commentId);
      },
      setActiveTab: (type: 'inline' | 'general') => {
        onSetActiveTab(type);
      },
    };
  }, [sceneReady, commentsReady, onSetActiveTab, onHighlight]);
  
  const processNavigation = useCallback(async () => {
    if (processedRef.current) {
      console.log('[useCommentNavigation] Already processed, skipping');
      return;
    }
    
    const { parsed, isLegacy } = parseParams();
    
    console.log('[useCommentNavigation] Parsed params:', parsed, 'legacy:', isLegacy);
    
    if (!parsed.commentId) {
      console.log('[useCommentNavigation] No comment ID in params, skipping');
      return;
    }
    
    if (!sceneId) {
      console.log('[useCommentNavigation] No scene ID, skipping');
      return;
    }
    
    processedRef.current = true;
    
    const navState = normalizeNavigationState(parsed, projectId, chapterId, sceneId);
    
    if (navState.type) {
      onSetActiveTab(navState.type);
    }
    
    if (navState.shouldOpenComments) {
      onOpenComments(true);
    }
    
    await new Promise(r => setTimeout(r, 500));
    
    const config = buildConfig();
    
    const result = await import('../utils/commentNavigation').then(
      m => m.orchestrateCommentNavigation(navState, config)
    );
    
    resultRef.current = result;
    console.log('[useCommentNavigation] Orchestration result:', result);
    
    if (result.success) {
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
      }, 3000);
    }
  }, [parseParams, sceneId, projectId, chapterId, onSetActiveTab, onOpenComments, buildConfig]);
  
  useEffect(() => {
    const search = searchParams.toString();
    const hasCommentParams = search.includes('comment') || search.includes('comment_id');
    
    if (!hasCommentParams) return;
    
    const timeout = setTimeout(() => {
      processNavigation();
    }, 100);
    
    return () => {
      clearTimeout(timeout);
      cancelSignalRef.current = true;
    };
  }, [searchParams, processNavigation]);
  
  return {
    processNavigation,
    result: resultRef.current,
    cancel: () => { cancelSignalRef.current = true; },
  };
}