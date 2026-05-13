import { useEffect, useRef, useCallback } from 'react';
import {
  registerCommentTarget,
  unregisterCommentTarget,
  registerReplyTarget,
  unregisterReplyTarget,
  registerInlineAnchorTarget,
  unregisterInlineAnchorTarget,
} from '../utils/commentNavigation';

interface UseCommentRegistryOptions {
  commentId: string;
  type: 'comment' | 'reply' | 'inline';
  parentId?: string;
  elementRef?: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
}

export function useCommentRegistry(options: UseCommentRegistryOptions) {
  const { commentId, type, parentId, elementRef, enabled = true } = options;
  const registeredRef = useRef(false);

  const register = useCallback(() => {
    if (!enabled || !elementRef?.current) return;
    
    if (registeredRef.current) {
      console.warn('[CommentRegistry] Already registered:', commentId, type);
      return;
    }

    const element = elementRef.current;
    
    if (type === 'comment') {
      registerCommentTarget(commentId, element);
    } else if (type === 'reply' && parentId) {
      registerReplyTarget(commentId, element, parentId);
    } else if (type === 'inline') {
      registerInlineAnchorTarget(commentId, element);
    }
    
    registeredRef.current = true;
  }, [commentId, type, parentId, elementRef, enabled]);

  const unregister = useCallback(() => {
    if (!registeredRef.current) return;

    if (type === 'comment') {
      unregisterCommentTarget(commentId);
    } else if (type === 'reply') {
      unregisterReplyTarget(commentId);
    } else if (type === 'inline') {
      unregisterInlineAnchorTarget(commentId);
    }
    
    registeredRef.current = false;
  }, [commentId, type]);

  useEffect(() => {
    register();
    return () => unregister();
  }, [register, unregister]);

  return { register, unregister };
}

interface UseCommentRegistryBatchOptions {
  comments: Array<{ id: string; type: 'comment' | 'reply' | 'inline'; parentId?: string }>;
  elementRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  enabled?: boolean;
}

export function useCommentRegistryBatch(options: UseCommentRegistryBatchOptions) {
  const { comments, elementRefs, enabled = true } = options;
  const registeredIdsRef = useRef<Set<string>>(new Set());

  const registerAll = useCallback(() => {
    if (!enabled) return;

    comments.forEach(({ id, type, parentId }) => {
      if (registeredIdsRef.current.has(id)) return;
      
      const element = elementRefs.current.get(id);
      if (!element) return;

      if (type === 'comment') {
        registerCommentTarget(id, element);
      } else if (type === 'reply' && parentId) {
        registerReplyTarget(id, element, parentId);
      } else if (type === 'inline') {
        registerInlineAnchorTarget(id, element);
      }
      
      registeredIdsRef.current.add(id);
    });
  }, [comments, elementRefs, enabled]);

  const unregisterAll = useCallback(() => {
    registeredIdsRef.current.forEach(id => {
      unregisterCommentTarget(id);
      unregisterReplyTarget(id);
      unregisterInlineAnchorTarget(id);
    });
    registeredIdsRef.current.clear();
  }, []);

  useEffect(() => {
    registerAll();
    return () => unregisterAll();
  }, [registerAll, unregisterAll]);

  return { registerAll, unregisterAll };
}