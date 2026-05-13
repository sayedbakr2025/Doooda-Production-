export interface ParsedCommentParams {
  commentId: string | null;
  replyId: string | null;
  type: 'inline' | 'general' | null;
  open: boolean;
  parentId: string | null;
}

export interface NavigationState {
  projectId: string | null;
  chapterId: string | null;
  sceneId: string | null;
  commentId: string | null;
  replyId: string | null;
  type: 'inline' | 'general' | null;
  shouldOpenComments: boolean;
  shouldHighlight: boolean;
}

export interface NavigationTarget {
  type: 'comment' | 'reply';
  commentId: string;
  replyId?: string;
  parentId?: string;
}

export interface NavigationEvent {
  type: 'target_found' | 'target_not_found' | 'cancelled' | 'timeout' | 'ready' | 'scroll_success';
  target?: NavigationTarget;
  error?: string;
}

export function parseCommentParams(search: string): ParsedCommentParams {
  const params = new URLSearchParams(search);
  
  return {
    commentId: params.get('comment'),
    replyId: params.get('reply'),
    type: (params.get('type') as 'inline' | 'general') || null,
    open: params.get('open') === 'true' || params.get('comments') === 'true',
    parentId: params.get('parent') || params.get('parent_comment_id') || null,
  };
}

export function parseLegacyCommentParams(search: string): ParsedCommentParams | null {
  const params = new URLSearchParams(search);
  
  const commentId = params.get('comment_id');
  const commentType = params.get('comment_type');
  const highlightType = params.get('highlight_type');
  const legacyParentId = params.get('parent_comment_id');
  
  if (!commentId) return null;
  
  const type = commentType === 'inline' ? 'inline' : 
               commentType === 'general' ? 'general' : null;
  
  const isReply = highlightType === 'reply';
  
  return {
    commentId,
    replyId: isReply ? commentId : null,
    type,
    open: params.get('comments') === 'true',
    parentId: legacyParentId || null,
  };
}

export function normalizeNavigationState(
  parsed: ParsedCommentParams,
  projectId?: string,
  chapterId?: string,
  sceneId?: string
): NavigationState {
  return {
    projectId: projectId || null,
    chapterId: chapterId || null,
    sceneId: sceneId || null,
    commentId: parsed.commentId,
    replyId: parsed.replyId,
    type: parsed.type,
    shouldOpenComments: parsed.open,
    shouldHighlight: !!parsed.commentId,
  };
}

/**
 * Registry for comment navigation targets.
 * 
 * WHY REGISTRY EXISTS:
 * - DOM queries become unreliable with virtualization, lazy loading, conditional rendering
 * - Provides stable, testable target resolution independent of DOM state
 * - Orchestrator queries registry first, falls back to DOM queries as secondary
 * - Enables future support for virtualized lists without navigation breakage
 * 
 * REGISTRATION:
 * - SceneComments registers comment elements on mount
 * - InlineCommentSidebar registers reply elements on expand
 * - Elements unregistered on unmount/collapse to prevent memory leaks
 */
class CommentTargetRegistry {
  private comments: Map<string, HTMLElement> = new Map();
  private replies: Map<string, { element: HTMLElement; parentId: string }> = new Map();
  private inlineAnchors: Map<string, HTMLElement> = new Map();

  registerComment(id: string, element: HTMLElement): void {
    if (import.meta.env.DEV) {
      const exists = this.comments.has(id);
      console.log(`[Registry] registerComment: ${id}, exists: ${exists}, size: ${this.comments.size}`);
      if (exists) console.warn(`[Registry] DUPLICATE registration: comment ${id}`);
    }
    this.comments.set(id, element);
  }

  unregisterComment(id: string): void {
    if (import.meta.env.DEV) {
      const existed = this.comments.has(id);
      console.log(`[Registry] unregisterComment: ${id}, existed: ${existed}, size: ${this.comments.size}`);
    }
    this.comments.delete(id);
  }

  registerReply(id: string, element: HTMLElement, parentId: string): void {
    if (import.meta.env.DEV) {
      const exists = this.replies.has(id);
      console.log(`[Registry] registerReply: ${id}, parent: ${parentId}, exists: ${exists}, size: ${this.replies.size}`);
      if (exists) console.warn(`[Registry] DUPLICATE registration: reply ${id}`);
    }
    this.replies.set(id, { element, parentId });
  }

  unregisterReply(id: string): void {
    if (import.meta.env.DEV) {
      const existed = this.replies.has(id);
      console.log(`[Registry] unregisterReply: ${id}, existed: ${existed}, size: ${this.replies.size}`);
    }
    this.replies.delete(id);
  }

  registerInlineAnchor(id: string, element: HTMLElement): void {
    if (import.meta.env.DEV) {
      const exists = this.inlineAnchors.has(id);
      console.log(`[Registry] registerInlineAnchor: ${id}, exists: ${exists}, size: ${this.inlineAnchors.size}`);
      if (exists) console.warn(`[Registry] DUPLICATE registration: anchor ${id}`);
    }
    this.inlineAnchors.set(id, element);
  }

  unregisterInlineAnchor(id: string): void {
    if (import.meta.env.DEV) {
      const existed = this.inlineAnchors.has(id);
      console.log(`[Registry] unregisterInlineAnchor: ${id}, existed: ${existed}, size: ${this.inlineAnchors.size}`);
    }
    this.inlineAnchors.delete(id);
  }

  getComment(id: string): HTMLElement | null {
    return this.comments.get(id) || null;
  }

  getReply(id: string): { element: HTMLElement; parentId: string } | null {
    return this.replies.get(id) || null;
  }

  getInlineAnchor(id: string): HTMLElement | null {
    return this.inlineAnchors.get(id) || null;
  }

  hasComment(id: string): boolean {
    return this.comments.has(id);
  }

  hasReply(id: string): boolean {
    return this.replies.has(id);
  }

  clear(): void {
    this.comments.clear();
    this.replies.clear();
    this.inlineAnchors.clear();
  }

  get size(): number {
    return this.comments.size + this.replies.size;
  }

  getSnapshot(): { counts: { comments: number; replies: number; anchors: number; total: number } } {
    return {
      counts: {
        comments: this.comments.size,
        replies: this.replies.size,
        anchors: this.inlineAnchors.size,
        total: this.comments.size + this.replies.size + this.inlineAnchors.size,
      },
    };
  }
}

export const commentTargetRegistry = new CommentTargetRegistry();

export function registerCommentTarget(commentId: string, element: HTMLElement): void {
  commentTargetRegistry.registerComment(commentId, element);
}

export function unregisterCommentTarget(commentId: string): void {
  commentTargetRegistry.unregisterComment(commentId);
}

export function registerReplyTarget(replyId: string, element: HTMLElement, parentCommentId: string): void {
  commentTargetRegistry.registerReply(replyId, element, parentCommentId);
}

export function unregisterReplyTarget(replyId: string): void {
  commentTargetRegistry.unregisterReply(replyId);
}

export function registerInlineAnchorTarget(commentId: string, element: HTMLElement): void {
  commentTargetRegistry.registerInlineAnchor(commentId, element);
}

export function unregisterInlineAnchorTarget(commentId: string): void {
  commentTargetRegistry.unregisterInlineAnchor(commentId);
}

const NAVIGATION_NAMESPACE = '[CommentNavigation]';

export interface OrchestratorConfig {
  maxRetries: number;
  retryDelay: number;
  maxTimeoutMs: number;
  sceneReadyCheck: () => boolean;
  commentsReadyCheck: () => boolean;
  expandThread: (commentId: string) => void;
  scrollToComment: (commentId: string) => boolean;
  scrollToReply: (replyId: string, parentId: string) => boolean;
  onTargetFound?: (target: NavigationTarget) => void;
  onTargetNotFound?: (info: { commentId?: string; replyId?: string; reason: string }) => void;
  onNavigationEvent?: (event: NavigationEvent) => void;
  setActiveTab: (type: 'inline' | 'general') => void;
  cancelSignal?: { current: boolean };
  processedIds?: Set<string>;
}

export interface OrchestratorResult {
  success: boolean;
  stage: string;
  error?: string;
  attemptCount?: number;
  durationMs?: number;
}

let activeNavigationId: string | null = null;

function scrollElementIntoView(element: HTMLElement): boolean {
  if (!element) return false;
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}

export async function orchestrateCommentNavigation(
  state: NavigationState,
  config: OrchestratorConfig
): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const { 
    maxRetries = 5, 
    retryDelay = 300, 
    maxTimeoutMs = 8000, 
    cancelSignal, 
    processedIds,
    onNavigationEvent,
    onTargetFound,
    onTargetNotFound
  } = config;
  const navigationId = `${state.sceneId}-${state.commentId}-${state.replyId || 'none'}`;
  
  if (activeNavigationId && activeNavigationId !== navigationId) {
    console.log(`${NAVIGATION_NAMESPACE} Cancelled: Another navigation in progress`);
    onNavigationEvent?.({ type: 'cancelled', error: 'Another navigation active' });
    return { success: false, stage: 'cancelled', error: 'Another navigation active' };
  }
  
  if (state.commentId && processedIds?.has(state.commentId)) {
    console.log(`${NAVIGATION_NAMESPACE} Skipped: Already processed`, state.commentId);
    return { success: true, stage: 'idempotent_skip', error: 'Already processed' };
  }
  
  activeNavigationId = navigationId;
  console.log(`${NAVIGATION_NAMESPACE} Starting:`, state);
  onNavigationEvent?.({ type: 'ready' });
  
  try {
    if (!state.commentId) {
      console.log(`${NAVIGATION_NAMESPACE} Abort: No commentId`);
      return { success: false, stage: 'parse', error: 'No comment ID' };
    }
    
    if (cancelSignal?.current) {
      console.log(`${NAVIGATION_NAMESPACE} Cancelled: Signal detected`);
      onNavigationEvent?.({ type: 'cancelled', error: 'Navigation cancelled' });
      return { success: false, stage: 'cancelled', error: 'Navigation cancelled' };
    }
    
    if (state.type) {
      config.setActiveTab(state.type);
      console.log(`${NAVIGATION_NAMESPACE} Tab set:`, state.type);
    }
    
    if (!state.shouldOpenComments) {
      console.log(`${NAVIGATION_NAMESPACE} Complete: No comments to open`);
      return { success: true, stage: 'tab' };
    }
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (cancelSignal?.current) {
        console.log(`${NAVIGATION_NAMESPACE} Retry cancelled: Signal detected`);
        onNavigationEvent?.({ type: 'cancelled', error: 'Navigation cancelled during retry' });
        return { success: false, stage: 'cancelled', error: 'Navigation cancelled during retry' };
      }
      
      const elapsed = Date.now() - startTime;
      if (elapsed > maxTimeoutMs) {
        console.log(`${NAVIGATION_NAMESPACE} Timeout: ${elapsed}ms > ${maxTimeoutMs}ms`);
        onNavigationEvent?.({ type: 'timeout', error: `Timeout after ${elapsed}ms` });
        return { success: false, stage: 'timeout', error: `Timeout after ${elapsed}ms`, attemptCount: attempt };
      }
      
      console.log(`${NAVIGATION_NAMESPACE} Attempt: ${attempt + 1}/${maxRetries + 1}`);
      
      const sceneReady = config.sceneReadyCheck();
      if (!sceneReady) {
        console.log(`${NAVIGATION_NAMESPACE} Retry: Scene not ready`);
        await new Promise(r => setTimeout(r, retryDelay));
        continue;
      }
      
      const commentsReady = config.commentsReadyCheck();
      if (!commentsReady) {
        console.log(`${NAVIGATION_NAMESPACE} Retry: Comments not ready`);
        await new Promise(r => setTimeout(r, retryDelay));
        continue;
      }
      
      try {
        const target: NavigationTarget = {
          type: state.replyId ? 'reply' : 'comment',
          commentId: state.commentId || '',
          replyId: state.replyId || undefined,
          parentId: state.commentId || undefined,
        };
        
        if (state.replyId && state.commentId) {
          config.expandThread(state.commentId);
          console.log(`${NAVIGATION_NAMESPACE} Thread expanded:`, state.commentId);
          
          await new Promise(r => setTimeout(r, 100));
          
          const replyElement = commentTargetRegistry.getReply(state.replyId);
          const replyScrolled = replyElement 
            ? scrollElementIntoView(replyElement.element)
            : config.scrollToReply(state.replyId, state.commentId);
          
          console.log(`${NAVIGATION_NAMESPACE} Reply scroll:`, replyScrolled ? 'success' : 'failed');
          
          if (replyScrolled) {
            processedIds?.add(state.commentId);
            onTargetFound?.(target);
            onNavigationEvent?.({ type: 'target_found', target });
            const duration = Date.now() - startTime;
            console.log(`${NAVIGATION_NAMESPACE} Success: reply (${duration}ms)`);
            return { success: true, stage: 'reply', attemptCount: attempt + 1, durationMs: duration };
          }
          
          const commentElement = commentTargetRegistry.getComment(state.commentId);
          const commentScrolled = commentElement
            ? scrollElementIntoView(commentElement)
            : config.scrollToComment(state.commentId);
          
          console.log(`${NAVIGATION_NAMESPACE} Fallback scroll:`, commentScrolled ? 'success' : 'failed');
          
          if (commentScrolled) {
            processedIds?.add(state.commentId);
            onTargetFound?.({ ...target, type: 'comment' });
            const duration = Date.now() - startTime;
            console.log(`${NAVIGATION_NAMESPACE} Success: comment_fallback (${duration}ms)`);
            return { success: true, stage: 'comment_fallback', attemptCount: attempt + 1, durationMs: duration };
          }
          
          console.log(`${NAVIGATION_NAMESPACE} Warning: Reply not found in registry or DOM`, { replyId: state.replyId });
          onTargetNotFound?.({ replyId: state.replyId || undefined, reason: 'Reply not in registry or DOM' });
          onNavigationEvent?.({ type: 'target_not_found', target, error: 'Reply not found' });
        }
        
        const commentElement = commentTargetRegistry.getComment(state.commentId);
        const commentScrolled = commentElement
          ? scrollElementIntoView(commentElement)
          : config.scrollToComment(state.commentId);
        
        console.log(`${NAVIGATION_NAMESPACE} Comment scroll:`, commentScrolled ? 'success' : 'failed');
        
        if (commentScrolled) {
          processedIds?.add(state.commentId);
          onTargetFound?.(target);
          onNavigationEvent?.({ type: 'target_found', target });
          const duration = Date.now() - startTime;
          console.log(`${NAVIGATION_NAMESPACE} Success: comment (${duration}ms)`);
          return { success: true, stage: 'comment', attemptCount: attempt + 1, durationMs: duration };
        }
        
        console.log(`${NAVIGATION_NAMESPACE} Warning: Comment not found in registry or DOM`, { commentId: state.commentId });
        onTargetNotFound?.({ commentId: state.commentId, reason: 'Comment not in registry or DOM' });
        onNavigationEvent?.({ type: 'target_not_found', target, error: 'Comment not found' });
        
        if (attempt < maxRetries) {
          console.log(`${NAVIGATION_NAMESPACE} Retrying after ${retryDelay}ms`);
          await new Promise(r => setTimeout(r, retryDelay));
        }
      } catch (scrollError) {
        console.error(`${NAVIGATION_NAMESPACE} Scroll error:`, scrollError);
        return { success: false, stage: 'scroll_error', error: String(scrollError) };
      }
    }
    
    console.log(`${NAVIGATION_NAMESPACE} Failed: Max retries exceeded`);
    return { success: false, stage: 'max_retries', error: `Failed after ${maxRetries + 1} attempts`, attemptCount: maxRetries + 1 };
    
  } finally {
    activeNavigationId = null;
  }
}

export function cancelActiveNavigation(): void {
  activeNavigationId = null;
}

export function clearProcessedIds(set: Set<string>): void {
  set.clear();
}

// DEV-ONLY helpers
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).__commentDebug = {
    snapshot: () => {
      const { counts } = commentTargetRegistry.getSnapshot();
      return { timestamp: Date.now(), ...counts };
    },
    clear: () => {
      commentTargetRegistry.clear();
      activeNavigationId = null;
    },
  };
}