import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import GlobalHeader from '../components/GlobalHeader';
import {
  getTopics,
  createTopic,
  getUserStats,
  getMultipleUserStats,
  getHotTopics,
  getActiveWriters,
  getUserLikes,
  toggleLike,
} from '../services/communityApi';
import type {
  CommunityTopic,
  CommunityCategory,
  CommunityUserStats,
  ReputationLevel,
  ActiveWriter,
} from '../services/communityApi';
import { ReputationBadge } from '../components/community/ReputationBadge';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const CATEGORIES: { value: CommunityCategory | 'all'; labelAr: string; labelEn: string; color: string }[] = [
  { value: 'all',              labelAr: 'الكل',               labelEn: 'All',              color: '#1a1a1a' },
  { value: 'general',          labelAr: 'عام',                labelEn: 'General',          color: '#3b82f6' },
  { value: 'craft',            labelAr: 'الحرفة',             labelEn: 'Craft',            color: '#0ea5e9' },
  { value: 'request_feedback', labelAr: 'طلب تغذية راجعة',   labelEn: 'Request Feedback', color: '#f97316' },
  { value: 'feedback',         labelAr: 'التغذية الراجعة',   labelEn: 'Feedback',         color: '#f97316' },
  { value: 'publishing',       labelAr: 'النشر',              labelEn: 'Publishing',       color: '#16a34a' },
  { value: 'technical',        labelAr: 'تقني',               labelEn: 'Technical',        color: '#dc2626' },
];

const REPUTATION_COLORS: Record<string, string> = {
  'Beginner Writer':     '#94a3b8',
  'Emerging Writer':     '#3b82f6',
  'Active Contributor':  '#16a34a',
  'Community Pillar':    '#f97316',
  'Master Storyteller':  '#dc2626',
};

function getCategoryMeta(value: string) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[1];
}

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

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const palette = ['#dc2626', '#e11d48', '#b91c1c', '#ef4444', '#f87171'];
  const color = palette[initial.charCodeAt(0) % palette.length];
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: Math.floor(size * 0.38) }}
    >
      {initial}
    </div>
  );
}

export default function Community() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [hotTopics, setHotTopics] = useState<CommunityTopic[]>([]);
  const [activeWriters, setActiveWriters] = useState<ActiveWriter[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<CommunityCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [myStats, setMyStats] = useState<CommunityUserStats | null>(null);
  const [topicStatsMap, setTopicStatsMap] = useState<Record<string, CommunityUserStats>>({});
  const [likedTopics, setLikedTopics] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'latest' | 'hot'>('latest');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSidebar();
  }, []);

  useEffect(() => {
    load();
  }, [category, search, sortBy]);

  useEffect(() => {
    if (user) {
      getUserStats(user.id).then((s) => setMyStats(s)).catch(() => {});
    }
  }, [user]);

  async function loadSidebar() {
    try {
      const [hot, writers] = await Promise.all([getHotTopics(5), getActiveWriters()]);
      setHotTopics(hot);
      setActiveWriters(writers);
    } catch {}
  }

  async function load() {
    setLoading(true);
    try {
      const data = await getTopics({ category, search: search || undefined, limit: 50 });
      const sorted = sortBy === 'hot'
        ? [...data].sort((a, b) => (b.hot_score || 0) - (a.hot_score || 0))
        : data;
      setTopics(sorted);
      const userIds = [...new Set(data.map((t) => t.user_id))];
      getMultipleUserStats(userIds).then(setTopicStatsMap).catch(() => {});
      if (user) {
        getUserLikes(user.id, 'topic', data.map((t) => t.id)).then(setLikedTopics).catch(() => {});
      }
    } catch (err) {
      console.error('[Community] Failed to load topics:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchChange(val: string) {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  }

  async function handleTopicLike(e: React.MouseEvent, topicId: string) {
    e.preventDefault();
    if (!user) return;
    const wasLiked = likedTopics.has(topicId);
    setLikedTopics((prev) => {
      const next = new Set(prev);
      wasLiked ? next.delete(topicId) : next.add(topicId);
      return next;
    });
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? { ...t, likes_count: Math.max(0, (t.likes_count || 0) + (wasLiked ? -1 : 1)) }
          : t
      )
    );
    try {
      await toggleLike(user.id, 'topic', topicId);
    } catch {
      setLikedTopics((prev) => {
        const next = new Set(prev);
        wasLiked ? next.add(topicId) : next.delete(topicId);
        return next;
      });
    }
  }

  const pinnedTopics = topics.filter((t) => t.is_pinned);
  const regularTopics = topics.filter((t) => !t.is_pinned);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <GlobalHeader />

      <div className="relative overflow-hidden" style={{ backgroundColor: '#0d0d0d' }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 15% 60%, rgba(220,38,38,0.12) 0%, transparent 45%), radial-gradient(circle at 85% 25%, rgba(220,38,38,0.07) 0%, transparent 40%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex flex-col items-center text-center">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 tracking-widest uppercase ${isRTL ? 'flex-row-reverse' : ''}`}
              style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#dc2626' }} />
              {isRTL ? 'مجتمع دوودة' : 'Doooda Community'}
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 leading-tight tracking-tight text-center">
              {isRTL ? (
                <>تحدّث، تعلّم، <span style={{ color: '#dc2626' }}>اكتشف</span></>
              ) : (
                <>Discuss, Learn, <span style={{ color: '#dc2626' }}>Discover</span></>
              )}
            </h1>
            <p className="text-base mb-8 max-w-lg" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {isRTL
                ? 'مساحة للكتّاب لتبادل الأفكار ونقاش فن الكتابة'
                : 'A space for writers to share ideas and discuss the craft'}
            </p>

            <div className={`flex items-center gap-3 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="relative">
                <svg
                  className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 ${isRTL ? 'right-3.5' : 'left-3.5'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={isRTL ? 'ابحث في النقاشات...' : 'Search discussions...'}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className="rounded-xl py-2.5 text-sm outline-none w-64 sm:w-80"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    paddingLeft: isRTL ? '1rem' : '2.5rem',
                    paddingRight: isRTL ? '2.5rem' : '1rem',
                    transition: 'border-color 0.2s, background-color 0.2s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(220,38,38,0.5)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; }}
                />
              </div>

              {user && (
                <button
                  onClick={() => setShowCreate(true)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
                  style={{ backgroundColor: '#dc2626', color: '#fff', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#b91c1c'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  {isRTL ? 'موضوع جديد' : 'New Topic'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`flex gap-8 items-start ${isRTL ? 'flex-row-reverse' : ''}`}>

          <div className="flex-1 min-w-0">
            <div className={`flex items-center gap-2 mb-5 flex-wrap ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <div className={`flex flex-wrap gap-1.5 flex-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                {CATEGORIES.map((cat) => {
                  const isActive = category === cat.value;
                  const label = isRTL ? cat.labelAr : cat.labelEn;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
                      style={{
                        backgroundColor: isActive ? cat.color : 'var(--color-surface)',
                        color: isActive ? '#fff' : 'var(--color-text-secondary)',
                        border: `1px solid ${isActive ? cat.color : 'var(--color-border)'}`,
                        transform: isActive ? 'scale(1.04)' : 'scale(1)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div
                className="flex items-center gap-0.5 rounded-full p-1 shrink-0"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                {(['latest', 'hot'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all`}
                    style={{
                      backgroundColor: sortBy === s ? 'var(--color-text-primary)' : 'transparent',
                      color: sortBy === s ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {s === 'hot' ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 23C6.477 23 2 18.523 2 13c0-3.812 2.191-7.5 5-9.5C7 6 7.5 8.5 9 10c.5-3 2-6 5-7.5C14 5 14.5 8 16.5 9.5 17.5 7 17 5 17 5c3 2 5 5.5 5 8 0 5.523-4.477 10-10 10z"/>
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {s === 'hot' ? (isRTL ? 'رائج' : 'Hot') : (isRTL ? 'أحدث' : 'Latest')}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: '#dc2626', borderTopColor: 'transparent' }} />
              </div>
            ) : topics.length === 0 ? (
              <div
                className="text-center py-20 rounded-2xl"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(220,38,38,0.06)' }}>
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#dc2626', opacity: 0.4 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                  {isRTL ? 'لا توجد نقاشات' : 'No discussions yet'}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'كن أول من يبدأ نقاشاً!' : 'Be the first to start a discussion!'}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                {pinnedTopics.length > 0 && (
                  <div className="sticky top-16 z-10">
                    {pinnedTopics.map((topic) => (
                      <TopicRow
                        key={topic.id}
                        topic={topic}
                        isRTL={isRTL}
                        language={language}
                        user={user}
                        statsMap={topicStatsMap}
                        likedTopics={likedTopics}
                        onLike={handleTopicLike}
                        pinned
                      />
                    ))}
                  </div>
                )}
                {regularTopics.map((topic) => (
                  <TopicRow
                    key={topic.id}
                    topic={topic}
                    isRTL={isRTL}
                    language={language}
                    user={user}
                    statsMap={topicStatsMap}
                    likedTopics={likedTopics}
                    onLike={handleTopicLike}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="hidden lg:flex flex-col gap-5 w-72 shrink-0">
            {hotTopics.length > 0 && (
              <HotTopicsWidget topics={hotTopics} isRTL={isRTL} language={language} />
            )}
            {activeWriters.length > 0 && (
              <ActiveWritersWidget writers={activeWriters} isRTL={isRTL} />
            )}
            {myStats && (
              <MyStatsWidget stats={myStats} isRTL={isRTL} />
            )}
          </aside>
        </div>
      </main>

      {showCreate && user && (
        <CreateTopicModal
          userId={user.id}
          language={language}
          isRTL={isRTL}
          onClose={() => setShowCreate(false)}
          onCreated={(topic) => {
            setShowCreate(false);
            navigate(`/community/topic/${topic.id}`);
          }}
        />
      )}
    </div>
  );
}

function TopicRow({
  topic,
  isRTL,
  language,
  user,
  statsMap,
  likedTopics,
  onLike,
  pinned = false,
}: {
  topic: CommunityTopic;
  isRTL: boolean;
  language: string;
  user: { id: string } | null;
  statsMap: Record<string, CommunityUserStats>;
  likedTopics: Set<string>;
  onLike: (e: React.MouseEvent, id: string) => void;
  pinned?: boolean;
}) {
  const catMeta = getCategoryMeta(topic.category);
  const displayName = topic.author?.name || topic.author?.email?.split('@')[0] || '?';
  const isLiked = likedTopics.has(topic.id);

  return (
    <Link
      to={`/community/topic/${topic.id}`}
      className="group flex items-start gap-4 px-5 py-4 transition-all cursor-pointer"
      style={{
        backgroundColor: pinned ? 'rgba(220,38,38,0.025)' : 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        borderLeft: isRTL ? 'none' : `3px solid ${pinned ? '#dc2626' : 'transparent'}`,
        borderRight: isRTL ? `3px solid ${pinned ? '#dc2626' : 'transparent'}` : 'none',
        direction: isRTL ? 'rtl' : 'ltr',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = pinned ? 'rgba(220,38,38,0.04)' : 'var(--color-bg-secondary)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = pinned ? 'rgba(220,38,38,0.025)' : 'var(--color-surface)'; }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold mt-0.5"
        style={{ backgroundColor: catMeta.color }}
      >
        {(isRTL ? catMeta.labelAr : catMeta.labelEn).charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className={`flex items-center gap-2 mb-0.5 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
          {pinned && (
            <span className={`flex items-center gap-1 text-xs font-bold ${isRTL ? 'flex-row-reverse' : ''}`} style={{ color: '#dc2626' }}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 1l-4 4-4-4-1 1 4 4v7l-2 4h6l-2-4V6l4-4z"/>
              </svg>
              {isRTL ? 'مثبّت' : 'Pinned'}
            </span>
          )}
          {topic.is_locked && (
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
              {isRTL ? 'مغلق' : 'Locked'}
            </span>
          )}
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: `${catMeta.color}12`, color: catMeta.color }}
          >
            {isRTL ? catMeta.labelAr : catMeta.labelEn}
          </span>
        </div>

        <h3
          className="font-bold text-sm leading-snug mb-1"
          style={{ color: 'var(--color-text-primary)', transition: 'opacity 0.15s' }}
        >
          {topic.title}
        </h3>

        <p className="text-xs line-clamp-1 mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          {topic.content.replace(/<[^>]+>/g, '')}
        </p>

        <div className={`flex items-center gap-3 text-xs flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
          <span className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Avatar name={displayName} size={18} />
            <span>{displayName}</span>
            {statsMap[topic.user_id] && (
              <ReputationBadge level={statsMap[topic.user_id].reputation_level as ReputationLevel} size="sm" />
            )}
          </span>
          <span>{timeAgo(topic.updated_at, language)}</span>

          <span className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {topic.replies_count}
          </span>

          <button
            onClick={(e) => onLike(e, topic.id)}
            className={`flex items-center gap-1 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
            style={{
              color: isLiked ? '#dc2626' : 'var(--color-text-tertiary)',
              pointerEvents: user ? 'auto' : 'none',
              transition: 'transform 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => { if (user) { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.color = '#dc2626'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = isLiked ? '#dc2626' : 'var(--color-text-tertiary)'; }}
          >
            <svg
              className="w-3.5 h-3.5"
              fill={isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ transition: 'fill 0.15s' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {(topic.likes_count || 0) > 0 && <span>{topic.likes_count}</span>}
          </button>
        </div>
      </div>
    </Link>
  );
}

function HotTopicsWidget({ topics, isRTL, language }: { topics: CommunityTopic[]; isRTL: boolean; language: string }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div
        className={`flex items-center gap-2.5 px-4 py-3.5 ${isRTL ? 'flex-row-reverse' : ''}`}
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(220,38,38,0.1)' }}>
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#dc2626' }}>
            <path d="M12 23C6.477 23 2 18.523 2 13c0-3.812 2.191-7.5 5-9.5C7 6 7.5 8.5 9 10c.5-3 2-6 5-7.5C14 5 14.5 8 16.5 9.5 17.5 7 17 5 17 5c3 2 5 5.5 5 8 0 5.523-4.477 10-10 10z"/>
          </svg>
        </div>
        <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {isRTL ? 'المواضيع الرائجة' : 'Hot Topics'}
        </span>
      </div>
      {topics.map((topic, i) => (
        <Link
          key={topic.id}
          to={`/community/topic/${topic.id}`}
          className={`flex items-start gap-3 px-4 py-3 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          style={{ borderBottom: i < topics.length - 1 ? '1px solid var(--color-border)' : 'none' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-secondary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <span
            className="text-base font-black shrink-0 mt-0.5 w-5 text-center"
            style={{ color: i === 0 ? '#dc2626' : i === 1 ? '#ef4444' : 'var(--color-text-tertiary)' }}
          >
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold leading-snug line-clamp-2 mb-1 ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-primary)' }}>
              {topic.title}
            </p>
            <div className={`flex items-center gap-2 text-xs ${isRTL ? 'flex-row-reverse' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {topic.replies_count}
              </span>
              <span>{timeAgo(topic.updated_at, language)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ActiveWritersWidget({ writers, isRTL }: { writers: ActiveWriter[]; isRTL: boolean }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div
        className={`flex items-center gap-2.5 px-4 py-3.5 ${isRTL ? 'flex-row-reverse' : ''}`}
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(220,38,38,0.1)' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#dc2626' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {isRTL ? 'أكثر الكتّاب نشاطاً' : 'Most Active Writers'}
        </span>
      </div>
      {writers.slice(0, 7).map((writer, i) => (
        <div
          key={writer.user_id}
          className={`flex items-center gap-3 px-4 py-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}
          style={{ borderBottom: i < Math.min(writers.length, 7) - 1 ? '1px solid var(--color-border)' : 'none' }}
        >
          <span
            className="text-xs font-black shrink-0 w-4 text-center"
            style={{ color: i < 3 ? '#dc2626' : 'var(--color-text-tertiary)' }}
          >
            {i + 1}
          </span>
          <Avatar name={writer.display_name} size={28} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold truncate ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-primary)' }}>
              {writer.display_name}
            </p>
            <p className={`text-xs truncate ${isRTL ? 'text-right' : ''}`} style={{ color: REPUTATION_COLORS[writer.reputation_level] || 'var(--color-text-tertiary)' }}>
              {writer.reputation_level}
            </p>
          </div>
          <span
            className="text-xs font-bold shrink-0 px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(220,38,38,0.07)', color: '#dc2626' }}
          >
            {writer.points}
          </span>
        </div>
      ))}
    </div>
  );
}

function MyStatsWidget({ stats, isRTL }: { stats: CommunityUserStats; isRTL: boolean }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <p className={`text-xs font-bold mb-3 uppercase tracking-wider ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
        {isRTL ? 'إحصائياتك' : 'Your Stats'}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: isRTL ? 'نقاط' : 'Points', value: stats.points, accent: true },
          { label: isRTL ? 'مواضيع' : 'Topics', value: stats.topics_created, accent: false },
          { label: isRTL ? 'ردود' : 'Replies', value: stats.replies_count, accent: false },
        ].map((s) => (
          <div key={s.label} className="text-center p-2 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <p className="text-lg font-black leading-none mb-0.5" style={{ color: s.accent ? '#dc2626' : 'var(--color-text-primary)' }}>
              {s.value}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{s.label}</p>
          </div>
        ))}
      </div>
      <p
        className="text-xs font-bold text-center mt-3 py-1.5 rounded-lg"
        style={{
          backgroundColor: `${REPUTATION_COLORS[stats.reputation_level] || '#94a3b8'}12`,
          color: REPUTATION_COLORS[stats.reputation_level] || '#94a3b8',
        }}
      >
        {stats.reputation_level}
      </p>
    </div>
  );
}

function CreateTopicModal({
  userId,
  isRTL,
  onClose,
  onCreated,
}: {
  userId: string;
  language?: string;
  isRTL: boolean;
  onClose: () => void;
  onCreated: (topic: CommunityTopic) => void;
}) {
  const [form, setForm] = useState({ title: '', content: '', category: 'general' as CommunityCategory });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (form.title.trim().length < 3) {
      setError(isRTL ? 'العنوان قصير جداً (3 أحرف على الأقل)' : 'Title is too short (min 3 characters)');
      return;
    }
    if (form.content.trim().length < 10) {
      setError(isRTL ? 'المحتوى قصير جداً (10 أحرف على الأقل)' : 'Content is too short (min 10 characters)');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const topic = await createTopic(userId, { title: form.title.trim(), content: form.content.trim(), category: form.category });
      onCreated(topic);
    } catch {
      setError(isRTL ? 'فشل إنشاء الموضوع' : 'Failed to create topic');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full sm:max-w-xl rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className={`flex items-center justify-between mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'موضوع جديد' : 'New Topic'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-muted)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wide ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
              {isRTL ? 'التصنيف' : 'Category'}
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as CommunityCategory })}
              dir={isRTL ? 'rtl' : 'ltr'}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                <option key={c.value} value={c.value}>{isRTL ? c.labelAr : c.labelEn}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wide ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
              {isRTL ? 'العنوان' : 'Title'}
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              dir={isRTL ? 'rtl' : 'ltr'}
              placeholder={isRTL ? 'عنوان موضوعك...' : 'Topic title...'}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', transition: 'border-color 0.2s' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#dc2626'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wide ${isRTL ? 'text-right' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
              {isRTL ? 'المحتوى' : 'Content'}
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              dir={isRTL ? 'rtl' : 'ltr'}
              rows={6}
              placeholder={isRTL ? 'اكتب موضوعك هنا...' : 'Write your topic here...'}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', transition: 'border-color 0.2s' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#dc2626'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
          </div>
        </div>

        {error && (
          <p className={`mt-2 text-xs font-semibold ${isRTL ? 'text-right' : ''}`} style={{ color: '#dc2626' }}>
            {error}
          </p>
        )}

        <div className={`flex gap-3 mt-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ backgroundColor: '#dc2626', color: '#fff', transition: 'background-color 0.2s' }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#b91c1c'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
          >
            {saving ? (isRTL ? 'جارٍ النشر...' : 'Publishing...') : (isRTL ? 'نشر الموضوع' : 'Publish Topic')}
          </button>
        </div>
      </div>
    </div>
  );
}
