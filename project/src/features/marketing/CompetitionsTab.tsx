import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../contexts/LanguageContext';

interface Prize {
  id: string;
  position: number;
  title_ar: string;
  title_en: string;
  reward_description_ar: string;
  reward_description_en: string;
  amount: number | null;
  currency: string | null;
}

interface Competition {
  id: string;
  title_ar: string;
  title_en: string;
  organizer_name_ar: string;
  organizer_name_en: string;
  description_ar: string;
  description_en: string;
  submission_conditions_ar: string;
  submission_conditions_en: string;
  submission_start_at: string;
  submission_end_at: string;
  timezone: string;
  submission_method: 'email' | 'external_link' | 'via_doooda';
  submission_email: string | null;
  submission_link: string | null;
  country_ar: string;
  country_en: string;
  genre_ar: string;
  genre_en: string;
  created_at: string;
  is_ending_soon: boolean;
  is_new: boolean;
  first_prize_amount: number | null;
  prizes?: Prize[];
}

type SortKey = 'deadline' | 'prize' | 'newest';

function useServerCountdown(endAtUtc: string) {
  const endMs = new Date(endAtUtc).getTime();
  const calc = () => Math.max(0, Math.floor((endMs - Date.now()) / 1000));
  const [secs, setSecs] = useState(calc);

  useEffect(() => {
    if (calc() <= 0) return;
    const id = setInterval(() => {
      const v = calc();
      setSecs(v);
      if (v <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [endAtUtc]);

  if (secs <= 0) return null;

  return {
    days: Math.floor(secs / 86400),
    hours: Math.floor((secs % 86400) / 3600),
    mins: Math.floor((secs % 3600) / 60),
    secs: secs % 60,
  };
}

function CountdownDisplay({ endAt, isRTL }: { endAt: string; isRTL: boolean }) {
  const countdown = useServerCountdown(endAt);

  if (!countdown) {
    return (
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
      >
        {isRTL ? 'انتهى التقديم' : 'Submissions Closed'}
      </span>
    );
  }

  const { days, hours, mins, secs } = countdown;
  const urgency =
    days < 3
      ? { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' }
      : days < 7
      ? { bg: 'rgba(234,179,8,0.1)', color: '#ca8a04' }
      : { bg: 'rgba(34,197,94,0.1)', color: '#16a34a' };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        {isRTL ? 'ينتهي خلال' : 'Closes in'}
      </span>
      <div className="flex items-center gap-1">
        {days > 0 && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ background: urgency.bg, color: urgency.color }}
          >
            {days}{isRTL ? 'ي' : 'd'}
          </span>
        )}
        <span
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{ background: urgency.bg, color: urgency.color }}
        >
          {String(hours).padStart(2, '0')}{isRTL ? 'س' : 'h'}
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{ background: urgency.bg, color: urgency.color }}
        >
          {String(mins).padStart(2, '0')}{isRTL ? 'د' : 'm'}
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{ background: urgency.bg, color: urgency.color }}
        >
          {String(secs).padStart(2, '0')}{isRTL ? 'ث' : 's'}
        </span>
      </div>
    </div>
  );
}

function CompetitionCard({
  competition,
  isRTL,
  onExpired,
  isUpcoming = false,
  onDooodaSubmit,
}: {
  competition: Competition;
  isRTL: boolean;
  onExpired: (id: string) => void;
  isUpcoming?: boolean;
  onDooodaSubmit?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (isUpcoming) return;
    const endMs = new Date(competition.submission_end_at).getTime();
    const delay = endMs - Date.now();
    if (delay <= 0) {
      onExpired(competition.id);
      return;
    }
    const id = setTimeout(() => {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpired(competition.id);
      }
    }, delay);
    return () => clearTimeout(id);
  }, [competition.id, competition.submission_end_at, onExpired, isUpcoming]);

  const title = isRTL ? competition.title_ar : competition.title_en;
  const organizer = isRTL ? competition.organizer_name_ar : competition.organizer_name_en;
  const description = isRTL ? competition.description_ar : competition.description_en;
  const conditions = isRTL ? competition.submission_conditions_ar : competition.submission_conditions_en;

  const prizes = competition.prizes || [];
  const firstPrize = prizes.find((p) => p.position === 1);
  const firstPrizeTitle = firstPrize
    ? isRTL
      ? firstPrize.title_ar
      : firstPrize.title_en
    : null;
  const firstPrizeReward = firstPrize
    ? isRTL
      ? firstPrize.reward_description_ar
      : firstPrize.reward_description_en
    : null;

  function handleSubmit() {
    if (competition.submission_method === 'via_doooda') {
      onDooodaSubmit?.();
    } else if (competition.submission_method === 'email' && competition.submission_email) {
      window.location.href = `mailto:${competition.submission_email}`;
    } else if (
      competition.submission_method === 'external_link' &&
      competition.submission_link
    ) {
      window.open(competition.submission_link, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        boxShadow: hovered
          ? '0 8px 32px rgba(0,0,0,0.12)'
          : '0 2px 8px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <h3
                className="font-bold text-base leading-snug"
                style={{
                  color: 'var(--color-text-primary)',
                  direction: isRTL ? 'rtl' : 'ltr',
                }}
              >
                {title}
              </h3>
              {competition.is_ending_soon && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                >
                  {isRTL ? 'ينتهي قريباً' : 'Ending Soon'}
                </span>
              )}
              {competition.is_new && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(59,130,246,0.12)', color: '#2563eb' }}
                >
                  {isRTL ? 'جديد' : 'New'}
                </span>
              )}
            </div>
            <p
              className="text-xs truncate"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {organizer}
            </p>
          </div>
          <span
            className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: isUpcoming ? 'rgba(59,130,246,0.12)' : 'rgba(34,197,94,0.12)',
              color: isUpcoming ? '#2563eb' : '#16a34a',
              whiteSpace: 'nowrap',
            }}
          >
            {isUpcoming ? (isRTL ? 'قادم' : 'Upcoming') : (isRTL ? 'مفتوح' : 'Open')}
          </span>
        </div>

        {(competition.country_en || competition.genre_en) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {competition.country_en && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {isRTL && competition.country_ar
                  ? competition.country_ar
                  : competition.country_en}
              </span>
            )}
            {competition.genre_en && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {isRTL && competition.genre_ar
                  ? competition.genre_ar
                  : competition.genre_en}
              </span>
            )}
          </div>
        )}

        <div className="mb-3">
          {isUpcoming ? (
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {isRTL ? 'يبدأ التقديم: ' : 'Opens: '}
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                {new Date(competition.submission_start_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </span>
          ) : (
            <CountdownDisplay endAt={competition.submission_end_at} isRTL={isRTL} />
          )}
        </div>

        {firstPrize && (
          <div
            className="rounded-xl px-3 py-2.5 mb-3"
            style={{
              background:
                'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(245,158,11,0.06) 100%)',
              border: '1px solid rgba(234,179,8,0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                style={{ color: '#ca8a04' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              </svg>
              <span className="text-xs font-bold" style={{ color: '#ca8a04' }}>
                {isRTL ? 'الجائزة الأولى' : 'First Prize'}
              </span>
              {firstPrize.amount != null && firstPrize.currency && (
                <span
                  className="text-xs font-semibold ms-auto"
                  style={{ color: '#ca8a04' }}
                >
                  {Number(firstPrize.amount).toLocaleString()} {firstPrize.currency}
                </span>
              )}
            </div>
            {firstPrizeTitle && (
              <p
                className="text-xs font-medium"
                style={{
                  color: 'var(--color-text-primary)',
                  direction: isRTL ? 'rtl' : 'ltr',
                }}
              >
                {firstPrizeTitle}
              </p>
            )}
            {firstPrizeReward && (
              <p
                className="text-xs mt-0.5"
                style={{
                  color: 'var(--color-text-secondary)',
                  direction: isRTL ? 'rtl' : 'ltr',
                }}
              >
                {firstPrizeReward}
              </p>
            )}
          </div>
        )}

        {prizes.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {prizes.slice(1).map((p) => (
              <span
                key={p.id}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                #{p.position} {isRTL ? p.title_ar : p.title_en}
                {p.amount != null && p.currency
                  ? ` · ${Number(p.amount).toLocaleString()} ${p.currency}`
                  : ''}
              </span>
            ))}
          </div>
        )}

        <div
          className="overflow-hidden transition-all duration-300"
          style={{
            maxHeight: hovered ? '220px' : '0px',
            opacity: hovered ? 1 : 0,
          }}
        >
          {description && (
            <div className="mb-2">
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {isRTL ? 'عن المسابقة' : 'About'}
              </p>
              <p
                className="text-xs leading-relaxed line-clamp-3"
                style={{
                  color: 'var(--color-text-secondary)',
                  direction: isRTL ? 'rtl' : 'ltr',
                }}
              >
                {description}
              </p>
            </div>
          )}
          {conditions && (
            <div className="mb-3">
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {isRTL ? 'شروط التقديم' : 'Submission Conditions'}
              </p>
              <p
                className="text-xs leading-relaxed line-clamp-3"
                style={{
                  color: 'var(--color-text-secondary)',
                  direction: isRTL ? 'rtl' : 'ltr',
                }}
              >
                {conditions}
              </p>
            </div>
          )}
        </div>

        {isUpcoming ? (
          <div
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-tertiary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isRTL ? 'التقديم لم يفتح بعد' : 'Submissions not open yet'}
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              backgroundColor: competition.submission_method === 'via_doooda'
                ? 'var(--color-accent)'
                : 'var(--color-accent)',
              color: 'white',
              opacity: hovered ? 1 : 0.92,
              transform: hovered ? 'scale(1.01)' : 'scale(1)',
            }}
          >
            {competition.submission_method === 'via_doooda' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            ) : competition.submission_method === 'email' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            )}
            {competition.submission_method === 'via_doooda'
              ? (isRTL ? 'قدّم عبر دووودة' : 'Submit via Doooda')
              : (isRTL ? 'تقديم العمل' : 'Submit Work')}
          </button>
        )}
      </div>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  isRTL,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  isRTL: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={isRTL ? 'rtl' : 'ltr'}
        className="appearance-none text-xs font-medium px-3 py-1.5 rounded-lg pr-7 transition-colors"
        style={{
          background: value ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
          color: value ? 'white' : 'var(--color-text-secondary)',
          border: '1px solid',
          borderColor: value ? 'var(--color-accent)' : 'var(--color-border)',
          cursor: 'pointer',
          paddingInlineEnd: '1.75rem',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute inset-y-0 flex items-center"
        style={{ [isRTL ? 'left' : 'right']: '0.5rem', color: value ? 'white' : 'var(--color-text-tertiary)' }}
      >
        <ChevronDown />
      </span>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
      style={{
        background: active ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
        color: active ? 'white' : 'var(--color-text-secondary)',
        border: '1px solid',
        borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
      }}
    >
      {children}
    </button>
  );
}

type TabKey = 'open' | 'upcoming';

async function fetchCompetitionsWithPrizes(rpcName: string): Promise<Competition[]> {
  const { data: comps, error } = await supabase.rpc(rpcName);
  if (error || !comps || comps.length === 0) return [];

  const ids = comps.map((c: Competition) => c.id);
  const { data: prizes } = await supabase
    .from('competition_prizes')
    .select('*')
    .in('competition_id', ids)
    .order('position', { ascending: true });

  const prizesByComp: Record<string, Prize[]> = {};
  for (const p of prizes || []) {
    if (!prizesByComp[p.competition_id]) prizesByComp[p.competition_id] = [];
    prizesByComp[p.competition_id].push(p);
  }

  return comps.map((c: Competition) => ({ ...c, prizes: prizesByComp[c.id] || [] }));
}

export default function CompetitionsTab({ onDooodaSubmit }: { onDooodaSubmit?: () => void } = {}) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [tab, setTab] = useState<TabKey>('open');
  const [openCompetitions, setOpenCompetitions] = useState<Competition[]>([]);
  const [upcomingCompetitions, setUpcomingCompetitions] = useState<Competition[]>([]);
  const [expiredIds, setExpiredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [filterCountry, setFilterCountry] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('deadline');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [open, upcoming] = await Promise.all([
        fetchCompetitionsWithPrizes('get_open_competitions'),
        fetchCompetitionsWithPrizes('get_upcoming_competitions'),
      ]);
      setOpenCompetitions(open);
      setUpcomingCompetitions(upcoming);
      setLoading(false);
    }
    load();
  }, []);

  const handleExpired = (id: string) => {
    setExpiredIds((prev) => new Set([...prev, id]));
  };

  const allCompetitions = tab === 'open'
    ? openCompetitions.filter((c) => !expiredIds.has(c.id))
    : upcomingCompetitions;

  const countryOptions = Array.from(
    new Map(
      allCompetitions
        .filter((c) => c.country_en)
        .map((c) => [c.country_en, { value: c.country_en, label: isRTL && c.country_ar ? c.country_ar : c.country_en }])
    ).values()
  );

  const genreOptions = Array.from(
    new Map(
      allCompetitions
        .filter((c) => c.genre_en)
        .map((c) => [c.genre_en, { value: c.genre_en, label: isRTL && c.genre_ar ? c.genre_ar : c.genre_en }])
    ).values()
  );

  let filtered = allCompetitions;
  if (filterCountry) filtered = filtered.filter((c) => c.country_en === filterCountry);
  if (filterGenre) filtered = filtered.filter((c) => c.genre_en === filterGenre);

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'deadline') {
      const dateA = tab === 'open' ? a.submission_end_at : a.submission_start_at;
      const dateB = tab === 'open' ? b.submission_end_at : b.submission_start_at;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    }
    if (sortKey === 'prize') {
      const pa = a.first_prize_amount ?? 0;
      const pb = b.first_prize_amount ?? 0;
      return pb - pa;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const hasFilters = countryOptions.length > 0 || genreOptions.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{
              borderColor: 'var(--color-accent)',
              borderTopColor: 'transparent',
            }}
          />
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL ? 'جارٍ التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex gap-2 mb-4">
        {(['open', 'upcoming'] as TabKey[]).map((t) => {
          const count = t === 'open'
            ? openCompetitions.filter((c) => !expiredIds.has(c.id)).length
            : upcomingCompetitions.length;
          const label = t === 'open'
            ? (isRTL ? 'مفتوحة' : 'Open')
            : (isRTL ? 'قادمة' : 'Upcoming');
          return (
            <button
              key={t}
              onClick={() => { setTab(t); setFilterCountry(''); setFilterGenre(''); }}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
              style={{
                backgroundColor: tab === t ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                color: tab === t ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${tab === t ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {label}
              {count > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    backgroundColor: tab === t ? 'rgba(255,255,255,0.25)' : 'var(--color-bg)',
                    color: tab === t ? '#fff' : 'var(--color-text-tertiary)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {allCompetitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {tab === 'open'
                ? (isRTL ? 'لا توجد مسابقات مفتوحة حالياً' : 'No open competitions right now')
                : (isRTL ? 'لا توجد مسابقات قادمة' : 'No upcoming competitions')}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {isRTL
                ? 'تابعنا لمعرفة آخر المسابقات الأدبية'
                : 'Check back soon for new literary contests'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {(hasFilters || allCompetitions.length > 1) && (
            <div
              className="rounded-xl px-3 py-2.5 mb-4 space-y-2.5"
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {hasFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-xs font-semibold shrink-0"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {isRTL ? 'تصفية:' : 'Filter:'}
                  </span>
                  {countryOptions.length > 0 && (
                    <FilterSelect
                      value={filterCountry}
                      onChange={setFilterCountry}
                      options={countryOptions}
                      placeholder={isRTL ? 'الدولة' : 'Country'}
                      isRTL={isRTL}
                    />
                  )}
                  {genreOptions.length > 0 && (
                    <FilterSelect
                      value={filterGenre}
                      onChange={setFilterGenre}
                      options={genreOptions}
                      placeholder={isRTL ? 'النوع الأدبي' : 'Genre'}
                      isRTL={isRTL}
                    />
                  )}
                  {(filterCountry || filterGenre) && (
                    <button
                      onClick={() => { setFilterCountry(''); setFilterGenre(''); }}
                      className="text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {isRTL ? 'مسح' : 'Clear'}
                    </button>
                  )}
                </div>
              )}

              {allCompetitions.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-xs font-semibold shrink-0"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {isRTL ? 'ترتيب:' : 'Sort:'}
                  </span>
                  <SortButton active={sortKey === 'deadline'} onClick={() => setSortKey('deadline')}>
                    {tab === 'open'
                      ? (isRTL ? 'أقرب موعد' : 'Nearest Deadline')
                      : (isRTL ? 'أقرب بداية' : 'Soonest Start')}
                  </SortButton>
                  <SortButton active={sortKey === 'prize'} onClick={() => setSortKey('prize')}>
                    {isRTL ? 'أعلى جائزة' : 'Highest Prize'}
                  </SortButton>
                  <SortButton active={sortKey === 'newest'} onClick={() => setSortKey('newest')}>
                    {isRTL ? 'الأحدث' : 'Newly Added'}
                  </SortButton>
                </div>
              )}
            </div>
          )}

          {sorted.length === 0 ? (
            <div
              className="rounded-xl px-4 py-8 text-center"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {isRTL
                  ? 'لا توجد مسابقات تطابق الفلتر المحدد'
                  : 'No competitions match the selected filters'}
              </p>
              <button
                onClick={() => { setFilterCountry(''); setFilterGenre(''); }}
                className="text-xs mt-2 underline"
                style={{ color: 'var(--color-accent)' }}
              >
                {isRTL ? 'مسح الفلتر' : 'Clear filters'}
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                {isRTL
                  ? `${sorted.length} مسابقة`
                  : `${sorted.length} competition${sorted.length !== 1 ? 's' : ''}`}
              </p>
              <div className="space-y-3">
                {sorted.map((c) => (
                  <CompetitionCard
                    key={c.id}
                    competition={c}
                    isRTL={isRTL}
                    onExpired={handleExpired}
                    isUpcoming={tab === 'upcoming'}
                    onDooodaSubmit={c.submission_method === 'via_doooda' ? onDooodaSubmit : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
