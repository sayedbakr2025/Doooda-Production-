import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getSceneComments, addComment, resolveComment, reopenComment, deleteComment, getProjectCollaborators } from '../services/api';
import type { Comment, ProjectCollaborator } from '../types';
import { renderMentionText } from '../utils/mentionText';

interface Props {
  projectId: string;
  sceneId: string;
  isOwner: boolean;
}

function formatRelTime(dateStr: string, isRtl: boolean): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (isRtl) {
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `${diffMins}د`;
    if (diffHours < 24) return `${diffHours}س`;
    if (diffDays < 7) return `${diffDays}ي`;
    return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  }
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CommentBubble({
  comment,
  projectId,
  sceneId,
  isOwner,
  currentUserId,
  isRtl,
  depth,
  onRefresh,
}: {
  comment: Comment;
  projectId: string;
  sceneId: string;
  isOwner: boolean;
  currentUserId: string;
  isRtl: boolean;
  depth: number;
  onRefresh: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const isResolved = comment.status === 'resolved';
  const canModify = comment.user_id === currentUserId || isOwner;

  useEffect(() => {
    if (replying) replyRef.current?.focus();
  }, [replying]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await addComment(projectId, sceneId, replyText.trim(), comment.id);
      setReplyText('');
      setReplying(false);
      onRefresh();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleResolve = async () => {
    try {
      if (isResolved) await reopenComment(comment.id);
      else await resolveComment(comment.id);
      onRefresh();
    } catch {}
  };

  const handleDelete = async () => {
    try {
      await deleteComment(comment.id);
      onRefresh();
    } catch {}
  };

  const initials = (comment.user_display_name || 'U').charAt(0).toUpperCase();

  return (
    <div style={{ marginInlineStart: depth > 0 ? '28px' : '0' }}>
      <div
        id={`comment-${comment.id}`}
        data-comment-id={comment.id}
        className="rounded-xl p-3 mb-2"
        style={{
          backgroundColor: isResolved ? 'var(--color-muted)' : 'var(--color-surface)',
          border: `1px solid ${isResolved ? 'var(--color-border)' : 'var(--color-border)'}`,
          opacity: isResolved ? 0.7 : 1,
        }}
      >
        <div className="flex items-start gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
            style={{ backgroundColor: isResolved ? 'var(--color-text-tertiary)' : 'var(--color-accent)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {comment.user_display_name || (isRtl ? 'مستخدم' : 'User')}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {formatRelTime(comment.created_at, isRtl)}
              </span>
              {isResolved && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: 'rgb(22,163,74)' }}
                >
                  {isRtl ? 'محلول' : 'Resolved'}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {renderMentionText(comment.content)}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => {
                  setReplying(!replying);
                  if (!replying) {
                    const user = comment.user as { pen_name?: string; first_name?: string; email?: string } | undefined;
                    const authorName = user?.pen_name || user?.first_name || user?.email?.split('@')[0] || 'user';
                    setReplyText(`@[{authorName}] `);
                  }
                }}
                className="text-xs font-medium transition-colors"
                style={{ color: 'var(--color-text-tertiary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}
              >
                {isRtl ? 'رد' : 'Reply'}
              </button>
              {(depth > 0 || canModify) && (
                <button
                  onClick={handleToggleResolve}
                  className="text-xs font-medium transition-colors"
                  style={{ color: isResolved ? 'rgb(59,130,246)' : 'rgb(22,163,74)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  {isResolved
                    ? (isRtl ? 'إعادة فتح' : 'Reopen')
                    : (isRtl ? 'حل' : 'Resolve')}
                </button>
              )}
              {canModify && (
                <button
                  onClick={handleDelete}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--color-error)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  {isRtl ? 'حذف' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        </div>

        {replying && (
          <div className="mt-3 ms-9">
            <textarea
              ref={replyRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
              placeholder={isRtl ? 'اكتب ردك...' : 'Write a reply...'}
              dir={isRtl ? 'rtl' : 'ltr'}
              className="w-full text-sm resize-none rounded-lg px-3 py-2 outline-none"
              style={{
                backgroundColor: 'var(--color-muted)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply();
                if (e.key === 'Escape') { setReplying(false); setReplyText(''); }
              }}
            />
            <div className="flex items-center gap-2 mt-1.5">
              <button
                onClick={handleReply}
                disabled={submitting || !replyText.trim()}
                className="px-3 py-1 rounded-lg text-xs font-medium text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {submitting ? '...' : (isRtl ? 'إرسال' : 'Send')}
              </button>
              <button
                onClick={() => { setReplying(false); setReplyText(''); }}
                className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-1">
          {comment.replies.map((reply) => (
            <CommentBubble
              key={reply.id}
              comment={reply}
              projectId={projectId}
              sceneId={sceneId}
              isOwner={isOwner}
              currentUserId={currentUserId}
              isRtl={isRtl}
              depth={depth + 1}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SceneComments({ projectId, sceneId, isOwner }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRtl = language === 'ar';

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getSceneComments(sceneId);
      setComments(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [sceneId]);

  useEffect(() => {
    getProjectCollaborators(projectId).then(setCollaborators).catch(() => {});
  }, [projectId]);

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await addComment(projectId, sceneId, newComment.trim());
      setNewComment('');
      setShowMentions(false);
      load();
    } catch (err) {
      setSubmitError(isRtl ? 'فشل إضافة التعليق. حاول مرة أخرى.' : 'Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const visible = showResolved ? comments : comments.filter((c) => c.status !== 'resolved');
  const resolvedCount = comments.filter((c) => c.status === 'resolved').length;
  const openCount = comments.filter((c) => c.status === 'open').length;

  const filteredCollaborators = collaborators.filter(c =>
    c.user_id !== (user?.id || '') && (
      (c.display_name || '').toLowerCase().includes(mentionFilter.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(mentionFilter.toLowerCase())
    )
  );

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
    if (showMentions) {
      const lastAtIndex = e.target.value.lastIndexOf('@');
      if (lastAtIndex >= 0) {
        setMentionFilter(e.target.value.slice(lastAtIndex + 1));
      }
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '@') {
      setShowMentions(true);
      setMentionFilter('');
    }
    if (e.key === 'Escape') setShowMentions(false);
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd();
  };

  const insertMention = (name: string) => {
    const lastAtIndex = newComment.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      setNewComment(newComment.slice(0, lastAtIndex) + '@[' + name + '] ');
    }
    setShowMentions(false);
    setMentionFilter('');
    textareaRef.current?.focus();
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h4 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRtl ? 'التعليقات' : 'Comments'}
          </h4>
          {openCount > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              {isRtl ? `${openCount} مفتوح` : `${openCount} open`}
            </p>
          )}
        </div>
        {resolvedCount > 0 && (
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-tertiary)')}
          >
            {showResolved
              ? (isRtl ? 'إخفاء المحلولة' : 'Hide resolved')
              : (isRtl ? `عرض ${resolvedCount} محلول` : `Show ${resolvedCount} resolved`)}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-8 text-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
              style={{ backgroundColor: 'var(--color-muted)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {isRtl ? 'لا توجد تعليقات بعد' : 'No comments yet'}
            </p>
          </div>
        ) : (
          visible.map((c) => (
            <CommentBubble
              key={c.id}
              comment={c}
              projectId={projectId}
              sceneId={sceneId}
              isOwner={isOwner}
              currentUserId={user?.id || ''}
              isRtl={isRtl}
              depth={0}
              onRefresh={load}
            />
          ))
        )}
      </div>

      <div className="shrink-0 relative" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
        <textarea
          ref={textareaRef}
          value={newComment}
          onChange={handleTextareaInput}
          rows={3}
          placeholder={isRtl ? 'أضف تعليقًا... (اضغط @ للإشارة)' : 'Add a comment... (press @ to mention)'}
          dir={isRtl ? 'rtl' : 'ltr'}
          className="w-full text-sm resize-none rounded-lg px-3 py-2.5 outline-none mb-2"
          style={{
            backgroundColor: 'var(--color-muted)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          onKeyDown={handleTextareaKeyDown}
        />
        {showMentions && filteredCollaborators.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 right-0 rounded-lg shadow-lg overflow-hidden max-h-32 overflow-y-auto z-10" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {filteredCollaborators.map(c => (
              <button key={c.id} className="w-full text-start px-3 py-1.5 text-sm hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }} onClick={() => insertMention(c.pen_name || c.display_name || c.email?.split('@')[0] || 'user')}>
                @{c.pen_name || c.display_name || c.email?.split('@')[0]}
              </button>
            ))}
          </div>
        )}
        {submitError && (
          <p className="text-xs mb-1" style={{ color: '#ef4444' }}>{submitError}</p>
        )}
        <button
          onClick={handleAdd}
          disabled={submitting || !newComment.trim()}
          className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {submitting ? '...' : (isRtl ? 'إضافة تعليق' : 'Add Comment')}
        </button>
      </div>
    </div>
  );
}
