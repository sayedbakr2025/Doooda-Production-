import { useState, useEffect, useRef, useCallback } from 'react';
import { Reply, Check, RotateCcw, Trash2, Send, X } from 'lucide-react';
import { getInlineComments, addInlineComment, resolveInlineComment, reopenInlineComment, deleteInlineComment, addInlineCommentReply, getInlineCommentReplies, getProjectCollaborators } from '../services/api';
import type { InlineComment, InlineCommentReply, ProjectCollaborator } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { renderMentionText } from '../utils/mentionText';

interface InlineCommentSidebarProps {
  projectId: string;
  sceneId: string;
  userId: string;
  isOwner: boolean;
  onHoverComment?: (commentId: string | null) => void;
  highlightedCommentId?: string | null;
  pendingSelection?: { start: number; end: number; text: string } | null;
  onClearPending?: () => void;
  onCommentsChanged?: () => void;
  getEditorText?: () => string;
}

export default function InlineCommentSidebar({
  projectId,
  sceneId,
  userId,
  isOwner,
  onHoverComment,
  highlightedCommentId,
  pendingSelection,
  onClearPending,
  onCommentsChanged,
  getEditorText,
}: InlineCommentSidebarProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [repliesMap, setRepliesMap] = useState<Record<string, InlineCommentReply[]>>({});
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [showMentions, setShowMentions] = useState<string | null>(null);
  const [mentionFilter, setMentionFilter] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const leaveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const canComment = true;

  const isTextDeleted = (comment: InlineComment): boolean => {
    const originalText = comment.selected_text;
    if (!originalText || typeof originalText !== 'string' || originalText.length < 2) {
      return false;
    }
    
    const commentTime = new Date(comment.created_at).getTime();
    const now = Date.now();
    if (now - commentTime < 3000) {
      return false;
    }
    
    const editorText = getEditorText ? getEditorText() : '';
    if (!editorText || comment.anchor_start == null || comment.anchor_end == null) {
      return false;
    }
    if (comment.anchor_start < 0 || comment.anchor_end <= comment.anchor_start) {
      return false;
    }
    if (comment.anchor_end > editorText.length + 50) {
      return false;
    }
    
    const textAtAnchor = editorText.slice(comment.anchor_start, comment.anchor_end);
    const anchorLen = comment.anchor_end - comment.anchor_start;
    const originalLen = originalText.length;
    if (Math.abs(anchorLen - originalLen) > 10) {
      return false;
    }
    
    const deleted = textAtAnchor.toLowerCase() !== originalText.toLowerCase();
    return deleted;
  };

  const loadComments = useCallback(async () => {
    try {
      const data = await getInlineComments(sceneId);
      setComments(data);
    } catch (err) {
      console.error('[InlineComments] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [sceneId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  useEffect(() => {
    getProjectCollaborators(projectId).then(setCollaborators).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!pendingSelection) return;
    textareaRef.current?.focus();
  }, [pendingSelection]);

  const filteredCollaborators = collaborators.filter(c =>
    c.user_id !== userId && (
      (c.display_name || '').toLowerCase().includes(mentionFilter.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(mentionFilter.toLowerCase())
    )
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, commentId?: string) {
    const text = commentId ? (replyTexts[commentId] || '') : newComment;
    if (e.key === '@') {
      setShowMentions(commentId || 'new');
      setMentionFilter('');
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (commentId) handleAddReply(commentId);
      else handleAddComment();
    }
    if (e.key === 'Escape') {
      setShowMentions(null);
    }
    if (showMentions && e.key === 'Backspace') {
      const lastAtIndex = text.lastIndexOf('@');
      if (lastAtIndex >= 0 && text.length - lastAtIndex === 1) {
        setShowMentions(null);
      } else if (lastAtIndex >= 0) {
        setMentionFilter(prev => prev.slice(0, -1));
      }
    }
  }

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>, commentId?: string) {
    const val = e.target.value;
    if (commentId) {
      setReplyTexts(prev => ({ ...prev, [commentId]: val }));
    } else {
      setNewComment(val);
    }
    if (showMentions) {
      const lastAtIndex = val.lastIndexOf('@');
      if (lastAtIndex >= 0) {
        setMentionFilter(val.slice(lastAtIndex + 1));
      }
    }
  }

  function insertMention(name: string, commentId?: string) {
    const text = commentId ? (replyTexts[commentId] || '') : newComment;
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const newText = text.slice(0, lastAtIndex) + '@[' + name + '] ';
      if (commentId) setReplyTexts(prev => ({ ...prev, [commentId]: newText }));
      else setNewComment(newText);
    }
    setShowMentions(null);
    setMentionFilter('');
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    const anchorStart = pendingSelection?.start ?? null;
    const anchorEnd = pendingSelection?.end ?? null;
    const selectedText = pendingSelection?.text ?? null;
    setSubmitError(null);
    try {
      await addInlineComment(projectId, sceneId, newComment.trim(), anchorStart, anchorEnd, selectedText);
      setNewComment('');
      onClearPending?.();
      loadComments();
      onCommentsChanged?.();
    } catch (err) {
      console.error('[InlineComments] Failed to add:', err);
      setSubmitError(isRTL ? 'فشل إضافة التعليق. حاول مرة أخرى.' : 'Failed to add comment. Please try again.');
    }
  }

  async function handleResolve(id: string) {
    try { await resolveInlineComment(id); loadComments(); onCommentsChanged?.(); } catch {}
  }

  async function handleReopen(id: string) {
    try { await reopenInlineComment(id); loadComments(); onCommentsChanged?.(); } catch {}
  }

  async function handleDelete(id: string) {
    try { await deleteInlineComment(id); loadComments(); onCommentsChanged?.(); } catch {}
  }

  async function toggleReplies(commentId: string, authorPenName?: string, authorFirstName?: string) {
    if (expandedReplies.has(commentId)) {
      setExpandedReplies(prev => { const n = new Set(prev); n.delete(commentId); return n; });
    } else {
      setExpandedReplies(prev => new Set(prev).add(commentId));
      try {
        const replies = await getInlineCommentReplies(commentId);
        setRepliesMap(prev => ({ ...prev, [commentId]: replies }));
        if (authorPenName || authorFirstName) {
          setReplyTexts(prev => ({
            ...prev,
            [commentId]: '@[' + (authorPenName || authorFirstName || 'user') + '] '
          }));
        }
      } catch {}
    }
  }

  async function handleAddReply(commentId: string) {
    const text = replyTexts[commentId]?.trim();
    if (!text) return;
    try {
      await addInlineCommentReply(commentId, text);
      setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
      const replies = await getInlineCommentReplies(commentId);
      setRepliesMap(prev => ({ ...prev, [commentId]: replies }));
      loadComments();
    } catch (err) {
      console.error('[InlineComments] Failed to reply:', err);
    }
  }

  const visibleComments = showResolved ? comments : comments.filter(c => c.status === 'open');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {isRTL ? 'التعليقات المضمنة' : 'Inline Comments'}
        </h3>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--color-text-tertiary)' }}>
          <input
            type="checkbox"
            checked={showResolved}
            onChange={e => setShowResolved(e.target.checked)}
            className="w-3 h-3"
          />
          {isRTL ? 'المحلولة' : 'Resolved'}
        </label>
      </div>

      {(canComment || comments.length > 0) && (
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
          {visibleComments.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>
              {pendingSelection
                ? (isRTL ? 'اكتب تعليقًا على النص المحدد' : 'Write a comment on the selected text')
                : (isRTL ? 'حدد نصًا في المحرر وأضف تعليقًا' : 'Select text in the editor to add a comment')}
            </p>
          )}

          {visibleComments.map(comment => {
            const isOwn = comment.user_id === userId;
            const isHighlighted = highlightedCommentId === comment.id;

            return (
              <div
                key={comment.id}
                id={`comment-${comment.id}`}
                data-comment-id={comment.id}
                className="rounded-lg p-2.5 text-xs transition-all"
                style={{
                  backgroundColor: isHighlighted ? 'rgba(255, 230, 150, 0.15)' : 'var(--color-surface-hover)',
                  border: isHighlighted ? '1.5px solid rgba(255, 200, 50, 0.5)' : '1px solid var(--color-border)',
                }}
                onMouseEnter={() => onHoverComment?.(comment.id)}
                onMouseLeave={() => onHoverComment?.(null)}
              >
                {comment.selected_text && (
                  <div
                    className="mb-1.5 px-2 py-1 rounded text-xs italic"
                    style={{ 
                      backgroundColor: isTextDeleted(comment) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 230, 150, 0.2)', 
                      color: isTextDeleted(comment) ? 'var(--color-error)' : 'var(--color-text-secondary)',
                      textDecoration: isTextDeleted(comment) ? 'line-through' : 'none'
                    }}
                  >
                    {comment.selected_text.length > 80 ? comment.selected_text.slice(0, 80) + '…' : comment.selected_text}
                  </div>
                )}
                
                {comment.selected_text && isTextDeleted(comment) && (
                  <div
                    className="mb-1.5 px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}
                  >
                    {isRTL ? '📝 النص المعلق عليه تم حذفه' : '📝 Text was deleted'}
                  </div>
                )}

                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {comment.author_name || comment.user_id.slice(0, 8)}
                  </span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>
                    {new Date(comment.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div className="whitespace-pre-wrap mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {renderMentionText(comment.content)}
                </div>

                {comment.status === 'resolved' && (
                  <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                    <Check className="w-3 h-3" /> {isRTL ? 'تم الحل' : 'Resolved'}
                  </span>
                )}

                <div className="flex items-center gap-2 mt-1.5">
                  {comment.status === 'open' && (
                    <button onClick={() => handleResolve(comment.id)} className="text-xs flex items-center gap-0.5 hover:opacity-80" style={{ color: '#10b981' }}>
                      <Check className="w-3 h-3" /> {isRTL ? 'حل' : 'Resolve'}
                    </button>
                  )}
                  {comment.status === 'resolved' && (
                    <button onClick={() => handleReopen(comment.id)} className="text-xs flex items-center gap-0.5 hover:opacity-80" style={{ color: 'var(--color-text-tertiary)' }}>
                      <RotateCcw className="w-3 h-3" /> {isRTL ? 'إعادة فتح' : 'Reopen'}
                    </button>
                  )}
                  {(isOwn || isOwner) && (
                    <button onClick={() => handleDelete(comment.id)} className="text-xs flex items-center gap-0.5 hover:opacity-80" style={{ color: '#ef4444' }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={() => toggleReplies(comment.id, comment.user?.pen_name || comment.author_name)} className="text-xs flex items-center gap-0.5 hover:opacity-80" style={{ color: 'var(--color-text-tertiary)' }}>
                    <Reply className="w-3 h-3" /> {(comment.reply_count || 0)}
                  </button>
                </div>

                {expandedReplies.has(comment.id) && (repliesMap[comment.id] || []).length > 0 && (
                  <div className="mt-2 space-y-1.5" style={{ borderLeft: isRTL ? 'none' : '2px solid var(--color-border)', borderRight: isRTL ? '2px solid var(--color-border)' : 'none', paddingLeft: isRTL ? 0 : 8, paddingRight: isRTL ? 8 : 0 }}>
                    {(repliesMap[comment.id] || []).map(reply => (
                      <div key={reply.id}>
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {reply.author_name || reply.user_id.slice(0, 8)}
                        </span>
                        <span className="ms-1" style={{ color: 'var(--color-text-tertiary)' }}>
                          {new Date(reply.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <p className="whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{renderMentionText(reply.content)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {expandedReplies.has(comment.id) && canComment && (
                  <div className="mt-2 relative">
                    <textarea
                      ref={el => { replyRefs.current[comment.id] = el; }}
                      value={replyTexts[comment.id] || ''}
                      onChange={e => handleTextareaInput(e, comment.id)}
                      onKeyDown={e => handleKeyDown(e, comment.id)}
                      placeholder={isRTL ? 'اكتب ردًا…' : 'Write a reply…'}
                      className="w-full px-2 py-1.5 rounded-lg text-xs resize-none"
                      style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                      rows={2}
                    />
                    {showMentions === comment.id && filteredCollaborators.length > 0 && (
                      <div className="absolute bottom-full mb-1 left-0 right-0 rounded-lg shadow-lg overflow-hidden max-h-32 overflow-y-auto z-10" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        {filteredCollaborators.map(c => (
                          <button key={c.id} className="w-full text-left px-2 py-1 text-xs hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }} onClick={() => insertMention(c.pen_name || c.display_name || c.email?.split('@')[0] || 'user', comment.id)}>
                            @{c.pen_name || c.display_name || c.email?.split('@')[0]}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleAddReply(comment.id)}
                      className="absolute bottom-1 end-1 p-1 rounded"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canComment && (
        <div className="px-3 py-2" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: pendingSelection ? 'rgba(255, 230, 150, 0.08)' : 'transparent' }}>
          {pendingSelection && (
            <>
              <p className="text-xs mb-1" style={{ color: 'var(--color-accent)' }}>
                {isRTL ? 'تعليق على النص المحدد:' : 'Comment on selected text:'}
              </p>
              <p className="text-xs italic mb-2 truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                "{pendingSelection.text.length > 60 ? pendingSelection.text.slice(0, 60) + '…' : pendingSelection.text}"
              </p>
            </>
          )}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={e => handleTextareaInput(e)}
              onKeyDown={e => handleKeyDown(e)}
              placeholder={isRTL ? 'أضف تعليقًا... (اضغط @ للإشارة)' : 'Add a comment... (press @ to mention)'}
              className="w-full px-2 py-1.5 rounded-lg text-xs resize-none"
              style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              rows={3}
            />
            {showMentions === 'new' && filteredCollaborators.length > 0 && (
              <div className="absolute bottom-full mb-1 left-0 right-0 rounded-lg shadow-lg overflow-hidden max-h-32 overflow-y-auto z-10" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {filteredCollaborators.map(c => (
                  <button key={c.id} className="w-full text-start px-2 py-1 text-xs hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }} onClick={() => insertMention(c.pen_name || c.display_name || c.email?.split('@')[0] || 'user')}>
                    @{c.pen_name || c.display_name || c.email?.split('@')[0]}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-1">
              <button onClick={() => { onClearPending?.(); setNewComment(''); }} className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                <X className="w-3 h-3 inline" /> {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleAddComment} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>
                {isRTL ? 'إرسال' : 'Send'}
              </button>
            </div>
            {submitError && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{submitError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}