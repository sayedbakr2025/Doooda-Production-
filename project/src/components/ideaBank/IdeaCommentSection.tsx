import React, { useState, useEffect } from 'react';
import { MessageSquare, Check, RotateCcw, Trash2, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { IdeaComment as IdeaCommentType } from '../../types';
import { addIdeaComment, resolveIdeaComment, reopenIdeaComment, deleteIdeaComment } from '../../services/api';
import { supabase } from '../../lib/supabaseClient';

interface IdeaCommentSectionProps {
  bankId: string;
  cardId: string;
  comments: IdeaCommentType[];
  canEdit: boolean;
  onRefresh: () => void;
  initialCount?: number;
}

const IdeaCommentItem: React.FC<{
  comment: IdeaCommentType;
  bankId: string;
  canEdit: boolean;
  isOwn: boolean;
  currentUserId: string | null;
  onRefresh: () => void;
  language: 'ar' | 'en';
  isDark: boolean;
}> = ({ comment, bankId, canEdit, isOwn, currentUserId, onRefresh, language, isDark }) => {
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await addIdeaComment(bankId, comment.ideaCardId, replyText.trim(), comment.id);
      setReplyText('');
      setShowReply(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to reply:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async () => {
    try { await resolveIdeaComment(comment.id); onRefresh(); } catch (err) { console.error(err); }
  };

  const handleReopen = async () => {
    try { await reopenIdeaComment(comment.id); onRefresh(); } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    try { await deleteIdeaComment(comment.id); onRefresh(); } catch (err) { console.error(err); }
  };

  const isResolved = comment.status === 'resolved';

  return (
    <div className={`ml-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`} style={{ borderLeft: '2px solid var(--color-border)', paddingLeft: 8 }}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {comment.userDisplayName || 'User'}
            </span>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {new Date(comment.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            {isResolved && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                {language === 'ar' ? 'تم الحل' : 'Resolved'}
              </span>
            )}
          </div>
          <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'} ${isResolved ? 'line-through opacity-60' : ''}`}>
            {comment.content}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => setShowReply(!showReply)} className={`text-xs ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}>
              {language === 'ar' ? 'رد' : 'Reply'}
            </button>
            {!isResolved && (
              <button onClick={handleResolve} className={`text-xs ${isDark ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-500'}`}>
                <Check className="w-3 h-3 inline" /> {language === 'ar' ? 'حل' : 'Resolve'}
              </button>
            )}
            {isResolved && (
              <button onClick={handleReopen} className={`text-xs ${isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-500'}`}>
                <RotateCcw className="w-3 h-3 inline" /> {language === 'ar' ? 'إعادة فتح' : 'Reopen'}
              </button>
            )}
            {(isOwn || canEdit) && (
              <button onClick={handleDelete} className={`text-xs ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-400'}`}>
                <Trash2 className="w-3 h-3 inline" />
              </button>
            )}
          </div>

          {showReply && (
            <div className="flex gap-2 mt-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={language === 'ar' ? 'اكتب رداً...' : 'Write a reply...'}
                className={`flex-1 text-xs px-2 py-1 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'}`}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                disabled={submitting}
              />
              <button onClick={handleReply} disabled={submitting || !replyText.trim()} className="p-1 rounded bg-blue-600 text-white text-xs disabled:opacity-50">
                <Send className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map(reply => (
            <IdeaCommentItem
              key={reply.id}
              comment={reply}
              bankId={bankId}
              canEdit={canEdit}
              isOwn={currentUserId === reply.userId}
              currentUserId={currentUserId}
              onRefresh={onRefresh}
              language={language}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const IdeaCommentSection: React.FC<IdeaCommentSectionProps> = ({
  bankId,
  cardId,
  comments,
  canEdit,
  onRefresh,
  initialCount = 0,
}) => {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await addIdeaComment(bankId, cardId, newComment.trim());
      setNewComment('');
      onRefresh();
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const commentCount = Math.max(initialCount, comments.length);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <MessageSquare className="w-3 h-3" />
        {commentCount > 0
          ? (language === 'ar' ? `${commentCount} تعليق` : `${commentCount} comment${commentCount !== 1 ? 's' : ''}`)
          : (language === 'ar' ? 'تعليق' : 'Comment')}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={language === 'ar' ? 'أضف تعليقاً...' : 'Add a comment...'}
              className={`flex-1 text-sm px-2 py-1 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'}`}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              disabled={submitting}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
              className="px-3 py-1 rounded text-sm font-medium bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {comments.map(comment => (
            <IdeaCommentItem
              key={comment.id}
              comment={comment}
              bankId={bankId}
              canEdit={canEdit}
              isOwn={currentUserId === comment.userId}
              currentUserId={currentUserId}
              onRefresh={onRefresh}
              language={language}
              isDark={isDark}
            />
          ))}

          {comments.length === 0 && (
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {language === 'ar' ? 'لا توجد تعليقات بعد' : 'No comments yet'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default IdeaCommentSection;