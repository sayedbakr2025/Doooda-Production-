import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import GlobalHeader from '../components/GlobalHeader';
import {
  getTopicById,
  getReplies,
  createReply,
  createNestedReply,
  updateReply,
  softDeleteReply,
  softDeleteTopic,
  reportContent,
  getMultipleUserStats,
  getTopicRatings,
  upsertRating,
  getTopicFeedbackReplies,
  getUserLikes,
  toggleLike,
} from '../services/communityApi';
import type { CommunityTopic, CommunityReply, CommunityUserStats, CommunityRating, CommunityFeedbackReply } from '../services/communityApi';
import { supabase } from '../lib/supabaseClient';
import { ReputationBadge } from '../components/community/ReputationBadge';
import { StarRating, AverageRating } from '../components/community/StarRating';
import FeedbackReplyModal from '../components/community/FeedbackReplyModal';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const CATEGORY_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  general:          { ar: 'عام',               en: 'General',          color: '#3b82f6' },
  craft:            { ar: 'الحرفة',            en: 'Craft',            color: '#8b5cf6' },
  feedback:         { ar: 'التغذية الراجعة',  en: 'Feedback',         color: '#f59e0b' },
  publishing:       { ar: 'النشر',             en: 'Publishing',       color: '#22c55e' },
  technical:        { ar: 'تقني',              en: 'Technical',        color: '#ef4444' },
  request_feedback: { ar: 'طلب تغذية راجعة', en: 'Request Feedback', color: '#f59e0b' },
};

function timeAgo(dateStr: string, language: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: language === 'ar' ? ar : undefined,
    });
  } catch {
    return '';
  }
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const color = colors[initial.charCodeAt(0) % colors.length];
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold text-white text-sm"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
    >
      {initial}
    </div>
  );
}

export default function CommunityTopicPage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const [topic, setTopic] = useState<CommunityTopic | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [reportModal, setReportModal] = useState<{ type: 'topic' | 'reply'; id: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const [statsMap, setStatsMap] = useState<Record<string, CommunityUserStats>>({});
  const [ratings, setRatings] = useState<CommunityRating[]>([]);
  const [feedbackReplies, setFeedbackReplies] = useState<CommunityFeedbackReply[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [myFeedback, setMyFeedback] = useState<CommunityFeedbackReply | null>(null);
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const [topicLiked, setTopicLiked] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null);
  const [nestedContent, setNestedContent] = useState('');
  const [submittingNested, setSubmittingNested] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [topicData, repliesData] = await Promise.all([
        getTopicById(id!),
        getReplies(id!),
      ]);
      if (!topicData || topicData.deleted_at) { navigate('/community'); return; }

      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('community_frozen_at')
          .eq('id', user.id)
          .maybeSingle();
        setIsFrozen(!!userData?.community_frozen_at);
      }

      const allUserIds = [...new Set([
        topicData.user_id,
        ...(repliesData || []).map((r) => r.user_id),
      ])];
      const stats = await getMultipleUserStats(allUserIds).catch(() => ({}));
      setStatsMap(stats);

      const isFeedback = topicData.category === 'request_feedback' || topicData.category === 'feedback';
      if (isFeedback) {
        const [ratingsData, feedbackData] = await Promise.all([
          getTopicRatings(topicData.id).catch(() => []),
          getTopicFeedbackReplies(topicData.id).catch(() => []),
        ]);
        setRatings(ratingsData);
        setFeedbackReplies(feedbackData);
        if (user) {
          const existing = ratingsData.find((r) => r.user_id === user.id);
          if (existing) setMyRating(existing.score);
          const existingFb = feedbackData.find((f) => f.user_id === user.id);
          if (existingFb) setMyFeedback(existingFb);
        }
      }

      setTopic(topicData);
      setReplies(repliesData);

      if (user) {
        getUserLikes(user.id, 'topic', [topicData.id]).then((s) => setTopicLiked(s.has(topicData.id))).catch(() => {});
        getUserLikes(user.id, 'reply', (repliesData || []).map((r) => r.id)).then(setLikedReplies).catch(() => {});
      }
    } catch (err) {
      console.error('[CommunityTopic] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReply() {
    if (!user || !topic || !replyContent.trim() || isFrozen) return;
    setSubmitting(true);
    try {
      const recentUserPosts = replies
        .filter((r) => r.user_id === user.id)
        .slice(-5)
        .map((r) => r.content);
      const reply = await createReply(user.id, topic.id, replyContent.trim(), {
        topicCategory: topic.category,
        recentUserPosts,
      });
      setReplies((prev) => [...prev, { ...reply, author: { id: user.id, name: null, email: user.email || '' } }]);
      setReplyContent('');
      setTopic((t) => t ? { ...t, replies_count: t.replies_count + 1 } : t);
    } catch (err) {
      console.error('[CommunityTopic] Reply failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditReply(replyId: string) {
    if (!editContent.trim()) return;
    try {
      const updated = await updateReply(replyId, editContent.trim());
      setReplies((prev) => prev.map((r) => (r.id === replyId ? { ...r, ...updated } : r)));
      setEditingReplyId(null);
    } catch (err) {
      console.error('[CommunityTopic] Edit failed:', err);
    }
  }

  async function handleDeleteReply(replyId: string) {
    if (!confirm(isRTL ? 'حذف هذا الرد؟' : 'Delete this reply?')) return;
    setDeletingId(replyId);
    try {
      await softDeleteReply(replyId);
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
      setTopic((t) => t ? { ...t, replies_count: Math.max(0, t.replies_count - 1) } : t);
    } catch (err) {
      console.error('[CommunityTopic] Delete reply failed:', err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteTopic() {
    if (!confirm(isRTL ? 'حذف هذا الموضوع؟' : 'Delete this topic?')) return;
    try {
      await softDeleteTopic(topic!.id);
      navigate('/community');
    } catch (err) {
      console.error('[CommunityTopic] Delete topic failed:', err);
    }
  }

  async function handleRatingChange(score: number) {
    if (!user || !topic) return;
    const prev = myRating;
    setMyRating(score);
    try {
      const updated = await upsertRating(topic.id, user.id, score);
      setRatings((prev_r) => {
        const without = prev_r.filter((r) => r.user_id !== user.id);
        return [...without, updated];
      });
    } catch {
      setMyRating(prev);
    }
  }

  async function handleTopicLike() {
    if (!user || !topic) return;
    const was = topicLiked;
    setTopicLiked(!was);
    setTopic((t) => t ? { ...t, likes_count: Math.max(0, (t.likes_count || 0) + (was ? -1 : 1)) } : t);
    try {
      await toggleLike(user.id, 'topic', topic.id);
    } catch {
      setTopicLiked(was);
    }
  }

  async function handleReplyLike(replyId: string) {
    if (!user) return;
    const was = likedReplies.has(replyId);
    setLikedReplies((prev) => { const n = new Set(prev); was ? n.delete(replyId) : n.add(replyId); return n; });
    setReplies((prev) => prev.map((r) => r.id === replyId ? { ...r, likes_count: Math.max(0, (r.likes_count || 0) + (was ? -1 : 1)) } : r));
    try {
      await toggleLike(user.id, 'reply', replyId);
    } catch {
      setLikedReplies((prev) => { const n = new Set(prev); was ? n.add(replyId) : n.delete(replyId); return n; });
    }
  }

  async function handleSubmitNested() {
    if (!user || !topic || !replyingTo || !nestedContent.trim() || submittingNested) return;
    setSubmittingNested(true);
    try {
      const reply = await createNestedReply(user.id, topic.id, nestedContent.trim(), replyingTo.id, { topicCategory: topic.category });
      setReplies((prev) => [...prev, { ...reply, author: { id: user.id, name: null, email: user.email || '' } }]);
      setNestedContent('');
      setReplyingTo(null);
      setTopic((t) => t ? { ...t, replies_count: t.replies_count + 1 } : t);
    } catch (err) {
      console.error('[CommunityTopic] Nested reply failed:', err);
    } finally {
      setSubmittingNested(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <GlobalHeader />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: '#dc2626', borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  if (!topic) return null;

  const catMeta = CATEGORY_LABELS[topic.category] || CATEGORY_LABELS.general;
  const isFeedbackTopic = topic.category === 'request_feedback' || topic.category === 'feedback';
  const isTopicOwner = user?.id === topic.user_id;
  const topicAuthorName = topic.author?.name || topic.author?.email?.split('@')[0] || '?';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <GlobalHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`flex items-center gap-2 mb-6 text-sm ${isRTL ? 'flex-row-reverse' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
          <Link to="/community" className="hover:opacity-80 transition-opacity" style={{ color: 'var(--color-accent)' }}>
            {isRTL ? 'المجتمع' : 'Community'}
          </Link>
          <svg className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="truncate max-w-xs">{topic.title}</span>
        </div>

        <article
          className="rounded-2xl p-6 mb-5"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: `1px solid ${topic.is_pinned ? 'rgba(59,130,246,0.3)' : 'var(--color-border)'}`,
          }}
        >
          <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Avatar name={topicAuthorName} size={44} />
            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
              <div className={`flex flex-wrap items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${catMeta.color}18`, color: catMeta.color }}
                >
                  {isRTL ? catMeta.ar : catMeta.en}
                </span>
                {topic.is_pinned && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                    {isRTL ? 'مثبّت' : 'Pinned'}
                  </span>
                )}
                {topic.is_locked && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-tertiary)' }}>
                    {isRTL ? 'مغلق' : 'Locked'}
                  </span>
                )}
              </div>

              <h1 className="text-xl font-black mb-3 leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                {topic.title}
              </h1>

              <div
                className="text-sm leading-relaxed mb-4 whitespace-pre-wrap"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {topic.content}
              </div>

              <div className={`flex items-center justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 text-xs ${isRTL ? 'flex-row-reverse' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
                  <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {isTopicOwner ? (isRTL ? 'أنت' : 'You') : topicAuthorName}
                    </span>
                    {statsMap[topic.user_id] && (
                      <ReputationBadge level={statsMap[topic.user_id].reputation_level as import('../services/communityApi').ReputationLevel} size="sm" />
                    )}
                  </div>
                  <span>{timeAgo(topic.created_at, language)}</span>
                  <span className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {topic.replies_count}
                  </span>
                  {user && (
                    <button
                      onClick={handleTopicLike}
                      className={`flex items-center gap-1 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
                      style={{ color: topicLiked ? '#dc2626' : 'var(--color-text-tertiary)', transition: 'transform 0.15s, color 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.color = '#dc2626'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = topicLiked ? '#dc2626' : 'var(--color-text-tertiary)'; }}
                    >
                      <svg className="w-4 h-4" fill={topicLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" style={{ transition: 'fill 0.15s' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      {(topic.likes_count || 0) > 0 && <span>{topic.likes_count}</span>}
                    </button>
                  )}
                </div>

                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {isTopicOwner && (
                    <button
                      onClick={handleDeleteTopic}
                      className="p-1.5 rounded-lg transition-all hover:opacity-80 text-xs"
                      style={{ color: '#ef4444' }}
                      title={isRTL ? 'حذف الموضوع' : 'Delete topic'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  {!isTopicOwner && user && (
                    <button
                      onClick={() => setReportModal({ type: 'topic', id: topic.id })}
                      className="p-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ color: 'var(--color-text-tertiary)' }}
                      title={isRTL ? 'إبلاغ' : 'Report'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </article>

        {isFeedbackTopic && (
          <div
            className="rounded-2xl p-5 mb-5"
            style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <div className={`flex items-center justify-between gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <p className="text-xs font-bold" style={{ color: '#f59e0b' }}>
                    {isRTL ? 'طلب تغذية راجعة' : 'Request Feedback'}
                  </p>
                  {ratings.length > 0 ? (
                    <AverageRating ratings={ratings} language={language} showCount />
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {isRTL ? 'لا يوجد تقييم بعد' : 'No ratings yet'}
                    </p>
                  )}
                </div>
              </div>

              {user && !isTopicOwner && (
                <div className={`flex items-center gap-3 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'تقييمك:' : 'Your rating:'}
                    </span>
                    <StarRating
                      value={myRating}
                      onChange={handleRatingChange}
                      size="md"
                      showLabel
                      language={language}
                    />
                  </div>
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{ backgroundColor: '#f59e0b', color: '#fff' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {myFeedback
                      ? (isRTL ? 'تعديل التغذية الراجعة' : 'Edit Feedback')
                      : (isRTL ? 'إضافة تغذية راجعة' : 'Add Feedback')}
                  </button>
                </div>
              )}
            </div>

            {feedbackReplies.length > 0 && (
              <div className="mt-5 space-y-4">
                <h3
                  className={`text-xs font-bold uppercase tracking-wide ${isRTL ? 'text-right' : ''}`}
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {isRTL
                    ? `${feedbackReplies.length} تغذية راجعة`
                    : `${feedbackReplies.length} ${feedbackReplies.length === 1 ? 'Feedback' : 'Feedbacks'}`}
                </h3>
                {feedbackReplies.map((fb) => {
                  const fbAuthor = fb.author?.name || fb.author?.email?.split('@')[0] || '?';
                  const isOwn = fb.user_id === user?.id;
                  return (
                    <div
                      key={fb.id}
                      className="rounded-xl p-4"
                      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid rgba(245,158,11,0.15)' }}
                    >
                      <div className={`flex items-center justify-between gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {isOwn ? (isRTL ? 'أنت' : 'You') : fbAuthor}
                          </span>
                          {fb.overall_rating && (
                            <StarRating value={fb.overall_rating} readonly size="sm" />
                          )}
                        </div>
                        {isOwn && (
                          <button
                            onClick={() => setShowFeedbackModal(true)}
                            className="text-xs hover:opacity-80"
                            style={{ color: '#f59e0b' }}
                          >
                            {isRTL ? 'تعديل' : 'Edit'}
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {fb.structure_feedback && (
                          <div>
                            <p className={`text-xs font-bold mb-0.5 ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
                              {isRTL ? 'البنية والحبكة' : 'Structure & Plot'}
                            </p>
                            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-secondary)' }}>
                              {fb.structure_feedback}
                            </p>
                          </div>
                        )}
                        {fb.character_feedback && (
                          <div>
                            <p className={`text-xs font-bold mb-0.5 ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
                              {isRTL ? 'الشخصيات' : 'Characters'}
                            </p>
                            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-secondary)' }}>
                              {fb.character_feedback}
                            </p>
                          </div>
                        )}
                        {fb.dialogue_feedback && (
                          <div>
                            <p className={`text-xs font-bold mb-0.5 ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
                              {isRTL ? 'الحوار' : 'Dialogue'}
                            </p>
                            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-secondary)' }}>
                              {fb.dialogue_feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {replies.length > 0 && (
          <div className="space-y-3 mb-6">
            <h2 className={`text-sm font-bold px-1 mb-3 ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
              {replies.filter((r) => r.moderation_status === 'published' || r.user_id === user?.id).length}{' '}
              {isRTL ? 'ردود' : replies.filter((r) => r.moderation_status === 'published' || r.user_id === user?.id).length === 1 ? 'reply' : 'replies'}
            </h2>

            {(() => {
              const visibleReplies = replies.filter((r) => r.moderation_status === 'published' || r.user_id === user?.id);
              const topLevel = visibleReplies.filter((r) => !r.parent_reply_id);
              const nestedMap: Record<string, CommunityReply[]> = {};
              visibleReplies.filter((r) => r.parent_reply_id).forEach((r) => {
                if (!nestedMap[r.parent_reply_id!]) nestedMap[r.parent_reply_id!] = [];
                nestedMap[r.parent_reply_id!].push(r);
              });
              return topLevel.map((reply, idx) => {
              const replyAuthorName = reply.author?.name || reply.author?.email?.split('@')[0] || '?';
              const isOwnReply = reply.user_id === user?.id;
              const isEditing = editingReplyId === reply.id;
              const children = nestedMap[reply.id] || [];

              return (
                <div key={reply.id}>
                <div
                  className="rounded-2xl p-5"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    opacity: deletingId === reply.id ? 0.5 : 1,
                  }}
                >
                  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Avatar name={isOwnReply ? (user?.email || '') : replyAuthorName} size={36} />
                    <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                      <div className={`flex items-center gap-2 mb-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {isOwnReply ? (isRTL ? 'أنت' : 'You') : replyAuthorName}
                        </span>
                        {statsMap[reply.user_id] && (
                          <ReputationBadge level={statsMap[reply.user_id].reputation_level as import('../services/communityApi').ReputationLevel} size="sm" />
                        )}
                        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                          {timeAgo(reply.created_at, language)}
                        </span>
                        {reply.is_edited && (
                          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                            {isRTL ? '(معدّل)' : '(edited)'}
                          </span>
                        )}
                        {reply.moderation_status === 'pending_review' && isOwnReply && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
                          >
                            {isRTL ? 'قيد المراجعة' : 'Under Review'}
                          </span>
                        )}
                        {reply.moderation_status === 'rejected' && isOwnReply && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                          >
                            {isRTL ? 'مرفوض' : 'Rejected'}
                          </span>
                        )}
                        <span className="text-xs font-bold" style={{ color: 'var(--color-text-tertiary)', opacity: 0.5 }}>
                          #{idx + 1}
                        </span>
                      </div>

                      {isEditing ? (
                        <div>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            dir={isRTL ? 'rtl' : 'ltr'}
                            rows={4}
                            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-accent)', color: 'var(--color-text-primary)' }}
                          />
                          <div className={`flex gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button
                              onClick={() => handleEditReply(reply.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90"
                              style={{ backgroundColor: '#dc2626', color: '#fff' }}
                            >
                              {isRTL ? 'حفظ' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingReplyId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
                              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                            >
                              {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="text-sm leading-relaxed whitespace-pre-wrap"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {reply.content}
                        </p>
                      )}

                      {!isEditing && (
                        <div className={`flex items-center gap-3 mt-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <button
                            onClick={() => handleReplyLike(reply.id)}
                            disabled={!user}
                            className={`flex items-center gap-1 text-xs transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
                            style={{
                              color: likedReplies.has(reply.id) ? '#dc2626' : 'var(--color-text-tertiary)',
                              transition: 'transform 0.15s, color 0.15s',
                              cursor: user ? 'pointer' : 'default',
                            }}
                            onMouseEnter={(e) => { if (user) { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.color = '#dc2626'; } }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = likedReplies.has(reply.id) ? '#dc2626' : 'var(--color-text-tertiary)'; }}
                          >
                            <svg className="w-3.5 h-3.5" fill={likedReplies.has(reply.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" style={{ transition: 'fill 0.15s' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {(reply.likes_count || 0) > 0 && <span>{reply.likes_count}</span>}
                          </button>

                          {user && !topic.is_locked && !reply.parent_reply_id && (
                            <button
                              onClick={() => setReplyingTo(replyingTo?.id === reply.id ? null : { id: reply.id, author: replyAuthorName })}
                              className="text-xs transition-opacity hover:opacity-70"
                              style={{ color: replyingTo?.id === reply.id ? '#dc2626' : 'var(--color-text-tertiary)' }}
                            >
                              {isRTL ? 'رد' : 'Reply'}
                            </button>
                          )}

                          {isOwnReply && (
                            <>
                              <button
                                onClick={() => { setEditingReplyId(reply.id); setEditContent(reply.content); }}
                                className="text-xs hover:opacity-80 transition-opacity"
                                style={{ color: 'var(--color-text-tertiary)' }}
                              >
                                {isRTL ? 'تعديل' : 'Edit'}
                              </button>
                              <button
                                onClick={() => handleDeleteReply(reply.id)}
                                className="text-xs hover:opacity-80 transition-opacity"
                                style={{ color: '#ef4444' }}
                              >
                                {isRTL ? 'حذف' : 'Delete'}
                              </button>
                            </>
                          )}
                          {!isOwnReply && user && (
                            <button
                              onClick={() => setReportModal({ type: 'reply', id: reply.id })}
                              className="text-xs hover:opacity-80 transition-opacity"
                              style={{ color: 'var(--color-text-tertiary)' }}
                            >
                              {isRTL ? 'إبلاغ' : 'Report'}
                            </button>
                          )}
                        </div>
                      )}

                      {replyingTo?.id === reply.id && (
                        <div className="mt-3">
                          <textarea
                            value={nestedContent}
                            onChange={(e) => setNestedContent(e.target.value)}
                            dir={isRTL ? 'rtl' : 'ltr'}
                            rows={3}
                            placeholder={isRTL ? `ردًّا على ${replyingTo.author}...` : `Replying to ${replyingTo.author}...`}
                            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
                            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid #dc2626', color: 'var(--color-text-primary)' }}
                            autoFocus
                          />
                          <div className={`flex gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button
                              onClick={handleSubmitNested}
                              disabled={submittingNested || !nestedContent.trim()}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                              style={{ backgroundColor: '#dc2626', color: '#fff' }}
                            >
                              {submittingNested ? (isRTL ? 'جارٍ الإرسال...' : 'Sending...') : (isRTL ? 'إرسال' : 'Send')}
                            </button>
                            <button
                              onClick={() => { setReplyingTo(null); setNestedContent(''); }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
                              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
                            >
                              {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {children.map((child) => {
                  const childAuthor = child.author?.name || child.author?.email?.split('@')[0] || '?';
                  const isOwnChild = child.user_id === user?.id;
                  const isEditingChild = editingReplyId === child.id;
                  return (
                    <div
                      key={child.id}
                      className={`rounded-xl p-4 mt-2 ${isRTL ? 'mr-8' : 'ml-8'}`}
                      style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        borderLeft: isRTL ? '1px solid var(--color-border)' : '3px solid rgba(220,38,38,0.25)',
                        borderRight: isRTL ? '3px solid rgba(220,38,38,0.25)' : '1px solid var(--color-border)',
                        opacity: deletingId === child.id ? 0.5 : 1,
                      }}
                    >
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Avatar name={isOwnChild ? (user?.email || '') : childAuthor} size={28} />
                        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                          <div className={`flex items-center gap-2 mb-1.5 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {isOwnChild ? (isRTL ? 'أنت' : 'You') : childAuthor}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                              {timeAgo(child.created_at, language)}
                            </span>
                            {child.moderation_status === 'pending_review' && isOwnChild && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                                {isRTL ? 'قيد المراجعة' : 'Under Review'}
                              </span>
                            )}
                          </div>
                          {isEditingChild ? (
                            <div>
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                dir={isRTL ? 'rtl' : 'ltr'}
                                rows={3}
                                className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid #dc2626', color: 'var(--color-text-primary)' }}
                              />
                              <div className={`flex gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <button onClick={() => handleEditReply(child.id)} className="px-3 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#dc2626', color: '#fff' }}>
                                  {isRTL ? 'حفظ' : 'Save'}
                                </button>
                                <button onClick={() => setEditingReplyId(null)} className="px-3 py-1 rounded-lg text-xs font-semibold hover:opacity-80" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}>
                                  {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                              {child.content}
                            </p>
                          )}
                          {!isEditingChild && (
                            <div className={`flex items-center gap-3 mt-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <button
                                onClick={() => handleReplyLike(child.id)}
                                disabled={!user}
                                className="flex items-center gap-1 text-xs transition-all"
                                style={{ color: likedReplies.has(child.id) ? '#dc2626' : 'var(--color-text-tertiary)', transition: 'transform 0.15s, color 0.15s', cursor: user ? 'pointer' : 'default' }}
                                onMouseEnter={(e) => { if (user) { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.color = '#dc2626'; } }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = likedReplies.has(child.id) ? '#dc2626' : 'var(--color-text-tertiary)'; }}
                              >
                                <svg className="w-3 h-3" fill={likedReplies.has(child.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" style={{ transition: 'fill 0.15s' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                {(child.likes_count || 0) > 0 && <span>{child.likes_count}</span>}
                              </button>
                              {isOwnChild && (
                                <>
                                  <button onClick={() => { setEditingReplyId(child.id); setEditContent(child.content); }} className="text-xs hover:opacity-70" style={{ color: 'var(--color-text-tertiary)' }}>
                                    {isRTL ? 'تعديل' : 'Edit'}
                                  </button>
                                  <button onClick={() => handleDeleteReply(child.id)} className="text-xs hover:opacity-70" style={{ color: '#ef4444' }}>
                                    {isRTL ? 'حذف' : 'Delete'}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              );
            });
            })()}
          </div>
        )}

        {user && isFrozen ? (
          <div
            className={`rounded-2xl p-4 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
            style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#3b82f6' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL
                ? 'تم تجميد مشاركتك في المجتمع مؤقتاً. يرجى التواصل مع الدعم.'
                : 'Your community participation has been temporarily frozen. Please contact support.'}
            </p>
          </div>
        ) : user && !topic.is_locked ? (
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h3 className={`text-sm font-semibold mb-3 ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'أضف ردًّا' : 'Add a Reply'}
            </h3>
            <textarea
              ref={replyRef}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              dir={isRTL ? 'rtl' : 'ltr'}
              rows={4}
              placeholder={isRTL ? 'اكتب ردك هنا...' : 'Write your reply here...'}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
            <div className={`flex justify-end mt-3 ${isRTL ? 'flex-row-reverse justify-start' : ''}`}>
              <button
                onClick={handleSubmitReply}
                disabled={submitting || !replyContent.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{ backgroundColor: '#dc2626', color: '#fff', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#b91c1c'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {submitting ? (isRTL ? 'جارٍ الإرسال...' : 'Sending...') : (isRTL ? 'إرسال' : 'Reply')}
              </button>
            </div>
          </div>
        ) : topic.is_locked ? (
          <div
            className={`rounded-2xl p-4 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
            style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'هذا الموضوع مغلق، لا يمكن إضافة ردود جديدة.' : 'This topic is locked and cannot receive new replies.'}
            </p>
          </div>
        ) : (
          <div
            className={`rounded-2xl p-4 text-center text-sm ${isRTL ? '' : ''}`}
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <Link to="/login" style={{ color: 'var(--color-accent)' }}>
              {isRTL ? 'سجّل دخولك' : 'Sign in'}
            </Link>
            {' '}{isRTL ? 'للمشاركة في النقاش' : 'to join the discussion'}
          </div>
        )}
      </main>

      {showFeedbackModal && user && topic && (
        <FeedbackReplyModal
          topicId={topic.id}
          userId={user.id}
          language={language}
          isRTL={isRTL}
          existing={myFeedback}
          onClose={() => setShowFeedbackModal(false)}
          onSubmitted={(fb) => {
            setShowFeedbackModal(false);
            setMyFeedback(fb);
            setFeedbackReplies((prev) => {
              const without = prev.filter((f) => f.user_id !== user.id);
              return [...without, { ...fb, author: { id: user.id, name: null, email: user.email || '' } }];
            });
            if (fb.overall_rating) {
              setMyRating(fb.overall_rating);
              setRatings((prev) => {
                const without = prev.filter((r) => r.user_id !== user.id);
                return [...without, { id: '', topic_id: topic.id, user_id: user.id, score: fb.overall_rating!, created_at: new Date().toISOString() }];
              });
            }
          }}
        />
      )}

      {reportModal && user && (
        <ReportModal
          contentType={reportModal.type}
          contentId={reportModal.id}
          userId={user.id}
          language={language}
          isRTL={isRTL}
          onClose={() => setReportModal(null)}
          onReported={() => setReportModal(null)}
        />
      )}
    </div>
  );
}

function ReportModal({
  contentType,
  contentId,
  userId,
  isRTL,
  onClose,
  onReported,
}: {
  contentType: 'topic' | 'reply';
  contentId: string;
  userId: string;
  language?: string;
  isRTL: boolean;
  onClose: () => void;
  onReported: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (reason.trim().length < 5) {
      setError(isRTL ? 'يرجى توضيح السبب (5 أحرف على الأقل)' : 'Please describe the reason (min 5 characters)');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await reportContent(userId, contentType, contentId, reason.trim());
      onReported();
    } catch (err) {
      console.error('[ReportModal] Failed:', err);
      setError(isRTL ? 'فشل الإبلاغ، حاول مجدداً' : 'Report failed, please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? `الإبلاغ عن ${contentType === 'topic' ? 'موضوع' : 'رد'}` : `Report ${contentType}`}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className={`text-sm mb-3 ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-secondary)' }}>
          {isRTL ? 'وضّح سبب الإبلاغ عن هذا المحتوى' : 'Describe why you are reporting this content'}
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          dir={isRTL ? 'rtl' : 'ltr'}
          rows={4}
          placeholder={isRTL ? 'سبب الإبلاغ...' : 'Reason for report...'}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        />

        {error && <p className={`mt-1.5 text-xs ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-error)' }}>{error}</p>}

        <div className={`flex gap-3 mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-80"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#ef4444', color: '#fff' }}
          >
            {submitting ? (isRTL ? 'جارٍ الإرسال...' : 'Sending...') : (isRTL ? 'إرسال البلاغ' : 'Submit Report')}
          </button>
        </div>
      </div>
    </div>
  );
}
