import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import GlobalHeader from '../components/GlobalHeader';
import LearningPathWidget from '../components/academy/LearningPathWidget';
import WeeklyChallengeWidget from '../components/academy/WeeklyChallengeWidget';
import SkillProgressWidget from '../components/academy/SkillProgressWidget';
import {
  getPublishedCourses,
  getUserEnrollments,
  getActiveLearningPaths,
  getActiveWeeklyChallenge,
  getUserSkillLevels,
  getUserCourseScores,
} from '../services/academyApi';
import type {
  AcademyCourse,
  AcademyEnrollment,
  CourseLevel,
  CourseLanguage,
  AcademyLearningPath,
  AcademyWeeklyChallenge,
  AcademySkillLevel,
  AcademyCourseScore,
} from '../types/academy';

const LEVEL_LABELS: Record<CourseLevel, { ar: string; en: string; color: string }> = {
  beginner:     { ar: 'مبتدئ',   en: 'Beginner',     color: '#22c55e' },
  intermediate: { ar: 'متوسط',   en: 'Intermediate', color: '#f59e0b' },
  advanced:     { ar: 'متقدم',   en: 'Advanced',     color: '#ef4444' },
};

const LANG_LABELS: Record<CourseLanguage, { ar: string; en: string; color: string }> = {
  ar:   { ar: 'عربي', en: 'AR', color: '#3b82f6' },
  en:   { ar: 'إنجليزي', en: 'EN', color: '#22c55e' },
  both: { ar: 'ثنائي', en: 'AR+EN', color: '#8b5cf6' },
};

const PRICING_OPTIONS = {
  free: { ar: 'مجاني', en: 'Free' },
  paid: { ar: 'مدفوع', en: 'Paid' },
};

const PEXELS_COVERS: Record<CourseLevel, string> = {
  beginner:     'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=800',
  intermediate: 'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=800',
  advanced:     'https://images.pexels.com/photos/3747139/pexels-photo-3747139.jpeg?auto=compress&cs=tinysrgb&w=800',
};

export default function Academy() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [enrollments, setEnrollments] = useState<AcademyEnrollment[]>([]);
  const [learningPaths, setLearningPaths] = useState<AcademyLearningPath[]>([]);
  const [weeklyChallenge, setWeeklyChallenge] = useState<AcademyWeeklyChallenge | null>(null);
  const [skillLevels, setSkillLevels] = useState<AcademySkillLevel[]>([]);
  const [courseScores, setCourseScores] = useState<AcademyCourseScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<CourseLevel[]>([]);
  const [pricingFilter, setPricingFilter] = useState<('free' | 'paid')[]>([]);
  const [languageFilter, setLanguageFilter] = useState<CourseLanguage[]>([]);
  const [openFilter, setOpenFilter] = useState<'level' | 'pricing' | 'language' | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [coursesData, enrollmentsData, pathsData, challengeData] = await Promise.all([
          getPublishedCourses(),
          user ? getUserEnrollments(user.id) : Promise.resolve([]),
          getActiveLearningPaths(),
          getActiveWeeklyChallenge(),
        ]);
        setCourses(coursesData);
        setEnrollments(enrollmentsData);
        setLearningPaths(pathsData);
        setWeeklyChallenge(challengeData);

        if (user) {
          const [skills, scores] = await Promise.all([
            getUserSkillLevels(user.id),
            getUserCourseScores(user.id),
          ]);
          setSkillLevels(skills);
          setCourseScores(scores);
        }
      } catch (err) {
        console.error('[Academy] Failed to load:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const enrollmentMap = Object.fromEntries(
    enrollments.map((e) => [e.course_id, e])
  );

  const filtered = courses.filter((c) => {
    if (levelFilter.length > 0 && !levelFilter.includes(c.level)) return false;
    if (pricingFilter.length > 0) {
      if (pricingFilter.includes('free') && pricingFilter.includes('paid')) {
        // show both
      } else if (pricingFilter.includes('free') && c.is_paid) return false;
      else if (pricingFilter.includes('paid') && !c.is_paid) return false;
    }
    if (languageFilter.length > 0 && !languageFilter.includes(c.language || 'ar')) return false;
    return true;
  });

  const heroImage = 'https://images.pexels.com/photos/6238297/pexels-photo-6238297.jpeg?auto=compress&cs=tinysrgb&w=1600';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <GlobalHeader />

      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--color-accent) 0%, #1a6b4a 100%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-white">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>{isRTL ? 'أكاديمية دوودة' : 'Doooda Academy'}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
            {isRTL ? 'تعلّم فن الكتابة الإبداعية' : 'Master the Art of Creative Writing'}
          </h1>
          <p className="text-lg sm:text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
            {isRTL
              ? 'دورات متخصصة لكل مرحلة من مراحل رحلتك الكتابية، من المبتدئ إلى المحترف'
              : 'Specialized courses for every stage of your writing journey, from beginner to professional'}
          </p>
          <div className="flex items-center justify-center gap-8 mt-10 text-sm opacity-80">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{isRTL ? `${courses.length} دورة` : `${courses.length} Courses`}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{isRTL ? 'تعلم بالسرعة التي تريدها' : 'Learn at your own pace'}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{isRTL ? 'شهادات إتمام' : 'Completion certificates'}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {weeklyChallenge && (
          <WeeklyChallengeWidget
            challenge={weeklyChallenge}
            userId={user?.id || null}
            language={language}
            isRTL={isRTL}
          />
        )}

        {user && (skillLevels.length > 0 || courseScores.length > 0) && (
          <SkillProgressWidget
            skillLevels={skillLevels}
            courseScores={courseScores}
            language={language}
            isRTL={isRTL}
          />
        )}

        {learningPaths.length > 0 && (
          <LearningPathWidget
            paths={learningPaths}
            enrollments={enrollments}
            language={language}
            isRTL={isRTL}
          />
        )}

        <div ref={filterRef} className={`flex flex-wrap gap-3 mb-8 items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Level Filter */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === 'level' ? null : 'level')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: levelFilter.length > 0 ? 'var(--color-accent)' : 'var(--color-surface)',
                color: levelFilter.length > 0 ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${levelFilter.length > 0 ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 8h6m0 0l-1.5-1.5M9 8l1.5 1.5M3 12h12m0 0l-1.5-1.5M15 12l1.5 1.5M3 16h18" />
              </svg>
              {isRTL ? 'المستوى' : 'Level'}
              {levelFilter.length > 0 && (
                <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                  {levelFilter.length}
                </span>
              )}
              <svg className={`w-3 h-3 transition-transform ${openFilter === 'level' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openFilter === 'level' && (
              <div
                className={`absolute top-full mt-1 ${isRTL ? 'right-0' : 'left-0'} z-20 rounded-xl shadow-lg py-1 min-w-[180px]`}
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                {(['beginner', 'intermediate', 'advanced'] as CourseLevel[]).map((lvl) => {
                  const selected = levelFilter.includes(lvl);
                  return (
                    <button
                      key={lvl}
                      onClick={() => {
                        setLevelFilter(selected
                          ? levelFilter.filter(l => l !== lvl)
                          : [...levelFilter, lvl]);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{
                        backgroundColor: selected ? 'rgba(34,197,94,0.1)' : 'transparent',
                        color: selected ? '#22c55e' : 'var(--color-text-primary)',
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center text-xs border"
                        style={{
                          borderColor: selected ? '#22c55e' : 'var(--color-border)',
                          backgroundColor: selected ? '#22c55e' : 'transparent',
                          color: '#fff',
                        }}
                      >
                        {selected && '✓'}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: LEVEL_LABELS[lvl].color }}
                      />
                      {isRTL ? LEVEL_LABELS[lvl].ar : LEVEL_LABELS[lvl].en}
                    </button>
                  );
                })}
                {levelFilter.length > 0 && (
                  <button
                    onClick={() => setLevelFilter([])}
                    className="w-full px-4 py-2 text-xs font-medium transition-colors"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {isRTL ? 'مسح الاختيار' : 'Clear'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pricing Filter */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === 'pricing' ? null : 'pricing')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: pricingFilter.length > 0 ? 'var(--color-accent)' : 'var(--color-surface)',
                color: pricingFilter.length > 0 ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${pricingFilter.length > 0 ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8c1.11 0 2.08.4 2.71 1H17v2h-1.54c.09.54.04 1.1-.25 1.6L17 16l-1.96 1-1.62-2.3A5.07 5.07 0 0012 15c-1.66 0-3-.9-3-2s1.34-2 3-2 3-.9 3-2-1.34-2-3-2z" />
              </svg>
              {isRTL ? 'السعر' : 'Pricing'}
              {pricingFilter.length > 0 && (
                <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                  {pricingFilter.length}
                </span>
              )}
              <svg className={`w-3 h-3 transition-transform ${openFilter === 'pricing' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openFilter === 'pricing' && (
              <div
                className={`absolute top-full mt-1 ${isRTL ? 'right-0' : 'left-0'} z-20 rounded-xl shadow-lg py-1 min-w-[160px]`}
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                {(['free', 'paid'] as const).map((p) => {
                  const selected = pricingFilter.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        setPricingFilter(selected
                          ? pricingFilter.filter(x => x !== p)
                          : [...pricingFilter, p]);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{
                        backgroundColor: selected ? (p === 'free' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)') : 'transparent',
                        color: selected ? (p === 'free' ? '#22c55e' : '#f59e0b') : 'var(--color-text-primary)',
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center text-xs border"
                        style={{
                          borderColor: selected ? (p === 'free' ? '#22c55e' : '#f59e0b') : 'var(--color-border)',
                          backgroundColor: selected ? (p === 'free' ? '#22c55e' : '#f59e0b') : 'transparent',
                          color: '#fff',
                        }}
                      >
                        {selected && '✓'}
                      </span>
                      {isRTL ? PRICING_OPTIONS[p].ar : PRICING_OPTIONS[p].en}
                    </button>
                  );
                })}
                {pricingFilter.length > 0 && (
                  <button
                    onClick={() => setPricingFilter([])}
                    className="w-full px-4 py-2 text-xs font-medium transition-colors"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {isRTL ? 'مسح الاختيار' : 'Clear'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Language Filter */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === 'language' ? null : 'language')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: languageFilter.length > 0 ? 'var(--color-accent)' : 'var(--color-surface)',
                color: languageFilter.length > 0 ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${languageFilter.length > 0 ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 12m6.088 4.788A15.947 15.947 0 0112 15a15.947 15.947 0 01-2.5 1.788M7.5 9h.01M3 17h12" />
              </svg>
              {isRTL ? 'اللغة' : 'Language'}
              {languageFilter.length > 0 && (
                <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                  {languageFilter.length}
                </span>
              )}
              <svg className={`w-3 h-3 transition-transform ${openFilter === 'language' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openFilter === 'language' && (
              <div
                className={`absolute top-full mt-1 ${isRTL ? 'right-0' : 'left-0'} z-20 rounded-xl shadow-lg py-1 min-w-[160px]`}
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                {(['ar', 'en', 'both'] as CourseLanguage[]).map((l) => {
                  const selected = languageFilter.includes(l);
                  return (
                    <button
                      key={l}
                      onClick={() => {
                        setLanguageFilter(selected
                          ? languageFilter.filter(x => x !== l)
                          : [...languageFilter, l]);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{
                        backgroundColor: selected ? `${LANG_LABELS[l].color}20` : 'transparent',
                        color: selected ? LANG_LABELS[l].color : 'var(--color-text-primary)',
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center text-xs border"
                        style={{
                          borderColor: selected ? LANG_LABELS[l].color : 'var(--color-border)',
                          backgroundColor: selected ? LANG_LABELS[l].color : 'transparent',
                          color: '#fff',
                        }}
                      >
                        {selected && '✓'}
                      </span>
                      {isRTL ? LANG_LABELS[l].ar : LANG_LABELS[l].en}
                    </button>
                  );
                })}
                {languageFilter.length > 0 && (
                  <button
                    onClick={() => setLanguageFilter([])}
                    className="w-full px-4 py-2 text-xs font-medium transition-colors"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {isRTL ? 'مسح الاختيار' : 'Clear'}
                  </button>
                )}
              </div>
            )}
          </div>

          {(levelFilter.length > 0 || pricingFilter.length > 0 || languageFilter.length > 0) && (
            <button
              onClick={() => { setLevelFilter([]); setPricingFilter([]); setLanguageFilter([]); }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              {isRTL ? 'مسح الكل' : 'Clear all'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="text-5xl mb-4">📚</div>
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'لا توجد دورات حتى الآن' : 'No courses yet'}
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'سيتم إضافة الدورات قريباً' : 'Courses will be added soon'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                enrollment={enrollmentMap[course.id]}
                language={language}
                isRTL={isRTL}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CourseCard({
  course,
  enrollment,
  language,
  isRTL,
}: {
  course: AcademyCourse;
  enrollment?: AcademyEnrollment;
  language: string;
  isRTL: boolean;
}) {
  const level = LEVEL_LABELS[course.level];
  const title = language === 'ar' ? course.title_ar : course.title_en;
  const cover = course.cover_image || PEXELS_COVERS[course.level];
  const isLocked = !course.is_free && !enrollment;
  const progress = enrollment?.progress_percentage ?? 0;

  return (
    <Link
      to={`/academy/course/${course.id}`}
      className="group block rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
      }}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={cover}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }} />

        <div className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} flex gap-2 flex-wrap`}>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: level.color }}
          >
            {isRTL ? level.ar : level.en}
          </span>
          {course.category && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: 'rgba(139,92,246,0.9)', color: '#fff' }}
            >
              {course.category}
            </span>
          )}
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: LANG_LABELS[course.language || 'ar'].color, color: '#fff' }}
          >
            {isRTL ? LANG_LABELS[course.language || 'ar'].ar : LANG_LABELS[course.language || 'ar'].en}
          </span>
          {!course.is_paid ? (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: '#22c55e', color: '#fff' }}
            >
              {isRTL ? 'مجاني' : 'Free'}
            </span>
          ) : (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: '#f59e0b', color: '#fff' }}
            >
              {course.price_tokens
                ? `${course.price_tokens} ${isRTL ? 'رمز' : 'tokens'}`
                : (isRTL ? 'مدفوع' : 'Paid')}
            </span>
          )}
        </div>

        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-bold text-base mb-2 leading-snug line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        <p className="text-sm line-clamp-2 mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {course.description}
        </p>

        {enrollment && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              <span>{isRTL ? 'التقدم' : 'Progress'}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--color-muted)' }}>
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: 'var(--color-accent)' }}
              />
            </div>
          </div>
        )}

        <div
          className="flex items-center justify-between text-xs"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {enrollment ? (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-accent)' }}
            >
              {isRTL ? 'مسجل' : 'Enrolled'}
            </span>
          ) : (
            <span>{isRTL ? 'ابدأ الآن' : 'Start learning'}</span>
          )}
          <svg
            className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
