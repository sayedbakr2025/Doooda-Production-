import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import GlobalHeader from '../components/GlobalHeader';
import {
  getCourseById,
  getCourseModules,
  getEnrollment,
  enrollInCourse,
  getUserLessonProgress,
  getCertificate,
} from '../services/academyApi';
import { supabase } from '../services/api';
import type { AcademyCourse, AcademyModule, AcademyEnrollment, AcademyProgress, AcademyCertificate, CourseLevel } from '../types/academy';

const LEVEL_LABELS: Record<CourseLevel, { ar: string; en: string; color: string }> = {
  beginner:     { ar: 'مبتدئ',   en: 'Beginner',     color: '#22c55e' },
  intermediate: { ar: 'متوسط',   en: 'Intermediate', color: '#f59e0b' },
  advanced:     { ar: 'متقدم',   en: 'Advanced',     color: '#ef4444' },
};

const CONTENT_TYPE_ICONS: Record<string, string> = {
  video:    'M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  article:  'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  exercise: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4',
  pdf:      'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
};

const PEXELS_DEFAULT = 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=1200';

export default function AcademyCourse() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [enrollment, setEnrollment] = useState<AcademyEnrollment | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, AcademyProgress>>({});
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [certificate, setCertificate] = useState<AcademyCertificate | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  async function refreshProgress() {
    if (!user || !id || !modules.length) return;
    try {
      const [freshEnrollment, allLessonIds] = [
        await getEnrollment(user.id, id),
        modules.flatMap((m) => (m.lessons || []).map((l) => l.id)),
      ];
      setEnrollment(freshEnrollment);
      if (allLessonIds.length > 0) {
        const progressData = await getUserLessonProgress(user.id, allLessonIds);
        const pMap: Record<string, AcademyProgress> = {};
        progressData.forEach((p) => { pMap[p.lesson_id] = p; });
        setProgressMap(pMap);
      }
      if (freshEnrollment?.completed_at && !certificate) {
        const cert = await getCertificate(user.id, id);
        setCertificate(cert);
      }
    } catch (err) {
      console.error('[AcademyCourse] Progress refresh failed:', err);
    }
  }

  useEffect(() => {
    function onFocus() { refreshProgress(); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, id, modules, certificate]);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      try {
        const [courseData, modulesData] = await Promise.all([
          getCourseById(id!),
          getCourseModules(id!),
        ]);

        if (!courseData) {
          navigate('/academy');
          return;
        }

        setCourse(courseData);
        setModules(modulesData);

        if (modulesData.length > 0) {
          setOpenModules(new Set([modulesData[0].id]));
        }

        if (user) {
          const enrollmentData = await getEnrollment(user.id, id!);
          setEnrollment(enrollmentData);

          const { data: userData } = await supabase
            .from('users')
            .select('tokens_balance')
            .eq('id', user.id)
            .maybeSingle();
          if (userData) setTokenBalance(userData.tokens_balance);

          const allLessonIds = modulesData.flatMap((m) => (m.lessons || []).map((l) => l.id));
          const progressData = await getUserLessonProgress(user.id, allLessonIds);
          const pMap: Record<string, AcademyProgress> = {};
          progressData.forEach((p) => { pMap[p.lesson_id] = p; });
          setProgressMap(pMap);

          if (enrollmentData?.completed_at) {
            const cert = await getCertificate(user.id, id!);
            setCertificate(cert);
          }
        }
      } catch (err) {
        console.error('[AcademyCourse] Failed to load:', err);
        setError(isRTL ? 'فشل تحميل الدورة' : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  function handleEnrollClick() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!course) return;
    if (!course.is_free && course.price_tokens) {
      setShowConfirm(true);
      return;
    }
    doEnroll();
  }

  async function doEnroll() {
    if (!user || !course || !id) return;
    setShowConfirm(false);
    setEnrolling(true);
    setError('');
    try {
      const result = await enrollInCourse(user.id, id);
      if (!result.success) {
        if (result.error === 'insufficient_tokens') {
          setError(
            isRTL
              ? `رصيدك غير كافٍ. مطلوب ${result.required} رمز، لديك ${result.available} رمز.`
              : `Insufficient balance. Required: ${result.required} tokens, you have: ${result.available}.`
          );
        } else if (result.error === 'price_not_set') {
          setError(isRTL ? 'سعر الدورة غير محدد، تواصل مع الإدارة' : 'Course price is not set. Contact admin.');
        } else {
          setError(isRTL ? 'فشل التسجيل، حاول مرة أخرى' : 'Enrollment failed, please try again');
        }
        return;
      }
      setEnrollment(result.enrollment);
      if (result.tokens_deducted > 0) {
        setTokenBalance((prev) => prev !== null ? prev - result.tokens_deducted : null);
      }
    } catch (err) {
      console.error('[AcademyCourse] Enroll failed:', err);
      setError(isRTL ? 'فشل التسجيل، حاول مرة أخرى' : 'Enrollment failed, please try again');
    } finally {
      setEnrolling(false);
    }
  }

  function toggleModule(moduleId: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }

  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedLessons = Object.values(progressMap).filter((p) => p.completed).length;

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <GlobalHeader />
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
        </div>
      </div>
    );
  }

  if (!course) return null;

  const title = language === 'ar' ? course.title_ar : course.title_en;
  const level = LEVEL_LABELS[course.level];
  const cover = course.cover_image || PEXELS_DEFAULT;
  const isLocked = !course.is_free && !enrollment;
  const canAccess = course.is_free || !!enrollment;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <GlobalHeader />

      <div
        className="relative h-64 sm:h-80 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, #1a6b4a 100%)' }}
      >
        <img
          src={cover}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 text-white">
          <Link
            to="/academy"
            className={`inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100 mb-4 transition-opacity ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {isRTL ? 'الأكاديمية' : 'Academy'}
          </Link>

          <div className={`flex flex-wrap gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: level.color }}
            >
              {isRTL ? level.ar : level.en}
            </span>
            {course.is_free ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#22c55e', color: '#fff' }}>
                {isRTL ? 'مجاني' : 'Free'}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
                {course.price_tokens ? `${course.price_tokens} ${isRTL ? 'رمز' : 'tokens'}` : (isRTL ? 'مدفوع' : 'Paid')}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black leading-tight">{title}</h1>
          {course.instructor_name && (
            <div className={`flex items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                {course.instructor_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {course.instructor_name}
              </span>
            </div>
          )}
        </div>
      </div>

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 ${isRTL ? 'direction-rtl' : ''}`}>
        <div className={`lg:col-span-2 ${isRTL ? 'lg:order-1' : ''}`}>
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'عن الدورة' : 'About this course'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {language === 'ar' ? (course.description_ar || course.description) : (course.description_en || course.description)}
            </p>
            {(!course.description_ar && !course.description_en) && course.description && course.description !== course.description && (
              <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                {language === 'ar' ? course.description_en : course.description_ar}
              </p>
            )}
            <div className={`flex flex-wrap gap-6 mt-5 text-sm ${isRTL ? 'flex-row-reverse' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>{modules.length} {isRTL ? 'وحدة' : 'modules'}</span>
              </div>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>{totalLessons} {isRTL ? 'درس' : 'lessons'}</span>
              </div>
            </div>
          </div>

          {course.instructor_name && (
            <div
              className="rounded-2xl p-6 mb-6"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {isRTL ? 'مقدم الدورة' : 'Course Instructor'}
              </h2>
              <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                  style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                >
                  {course.instructor_name.charAt(0).toUpperCase()}
                </div>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {course.instructor_name}
                  </h3>
                  {course.instructor_bio && (
                    <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {course.instructor_bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div
              className="px-6 py-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {isRTL ? 'محتوى الدورة' : 'Course content'}
              </h2>
            </div>

            {modules.length === 0 ? (
              <div className="py-12 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                {isRTL ? 'لا يوجد محتوى حتى الآن' : 'No content yet'}
              </div>
            ) : (
              modules.map((mod, modIdx) => {
                const isOpen = openModules.has(mod.id);
                const lessons = mod.lessons || [];
                const completedInModule = lessons.filter((l) => progressMap[l.id]?.completed).length;

                return (
                  <div key={mod.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className={`w-full flex items-center justify-between px-6 py-4 hover:bg-opacity-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                      style={{ backgroundColor: isOpen ? 'var(--color-bg-secondary)' : 'transparent' }}
                    >
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                        >
                          {modIdx + 1}
                        </div>
                        <span className="font-semibold text-sm text-left" style={{ color: 'var(--color-text-primary)' }}>
                          {mod.title}
                        </span>
                      </div>
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {enrollment && (
                          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                            {completedInModule}/{lessons.length}
                          </span>
                        )}
                        <svg
                          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isOpen && (
                      <div style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                        {lessons.map((lesson, lessonIdx) => {
                          const isCompleted = progressMap[lesson.id]?.completed;
                          const iconPath = CONTENT_TYPE_ICONS[lesson.content_type] || CONTENT_TYPE_ICONS.article;

                          return (
                            <div key={lesson.id}>
                              {canAccess || lesson.is_preview ? (
                                <Link
                                  to={`/academy/lesson/${lesson.id}`}
                                  className={`flex items-center gap-3 px-6 py-3.5 hover:bg-opacity-50 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}
                                  style={{ backgroundColor: 'transparent' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                                    style={{
                                      backgroundColor: isCompleted ? 'var(--color-accent)' : 'var(--color-surface)',
                                      border: `1px solid ${isCompleted ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                    }}
                                  >
                                    {isCompleted ? (
                                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                                      {lessonIdx + 1}. {lesson.title}
                                    </p>
                                    <div className={`flex items-center gap-2 mt-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                      <span className="text-xs capitalize" style={{ color: 'var(--color-text-tertiary)' }}>
                                        {lesson.content_type}
                                      </span>
                                      {lesson.duration_minutes && (
                                        <>
                                          <span style={{ color: 'var(--color-border)' }}>•</span>
                                          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                                            {lesson.duration_minutes} {isRTL ? 'دقيقة' : 'min'}
                                          </span>
                                        </>
                                      )}
                                      {lesson.is_preview && !enrollment && (
                                        <>
                                          <span style={{ color: 'var(--color-border)' }}>•</span>
                                          <span className="text-xs font-medium" style={{ color: '#22c55e' }}>
                                            {isRTL ? 'معاينة مجانية' : 'Free preview'}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </Link>
                              ) : (
                                <div className={`flex items-center gap-3 px-6 py-3.5 opacity-60 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-secondary)' }}>
                                      {lessonIdx + 1}. {lesson.title}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={`${isRTL ? 'lg:order-2' : ''}`}>
          <div
            className="rounded-2xl p-6 sticky top-24"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            {enrollment ? (
              <>
                <div className="mb-5">
                  <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>{isRTL ? 'التقدم الكلي' : 'Overall progress'}</span>
                    <span className="font-semibold">{enrollment.progress_percentage}%</span>
                  </div>
                  <div className="w-full rounded-full h-2.5" style={{ backgroundColor: 'var(--color-muted)' }}>
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{ width: `${enrollment.progress_percentage}%`, backgroundColor: 'var(--color-accent)' }}
                    />
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
                    {completedLessons} / {totalLessons} {isRTL ? 'درس مكتمل' : 'lessons completed'}
                  </p>
                </div>
                {enrollment.completed_at ? (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm"
                    style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{isRTL ? 'أكملت هذه الدورة!' : 'Course completed!'}</span>
                  </div>
                ) : null}
                <button
                  onClick={() => {
                    const allLessons = modules.flatMap((m) => m.lessons || []);
                    const firstIncomplete = allLessons.find((l) => !progressMap[l.id]?.completed);
                    const target = firstIncomplete || allLessons[0];
                    if (target) navigate(`/academy/lesson/${target.id}`);
                  }}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                >
                  {enrollment.completed_at
                    ? (isRTL ? 'مراجعة الدورة' : 'Review Course')
                    : (isRTL ? 'متابعة التعلم' : 'Continue Learning')}
                </button>
                {certificate && (
                  <button
                    onClick={() => navigate(`/academy/certificate/${certificate.id}`)}
                    className={`w-full mt-3 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{ border: '1px solid rgba(245,158,11,0.5)', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    {isRTL ? 'عرض الشهادة' : 'View Certificate'}
                  </button>
                )}
              </>
            ) : (
              <>
                {isLocked ? (
                  <div className="text-center mb-5">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                      style={{ backgroundColor: 'var(--color-muted)' }}
                    >
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-secondary)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>
                      {isRTL ? 'هذه دورة مدفوعة' : 'This is a paid course'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {course.price_tokens
                        ? `${course.price_tokens} ${isRTL ? 'رمز للتسجيل' : 'tokens to enroll'}`
                        : (isRTL ? 'مطلوب اشتراك مدفوع' : 'Paid subscription required')}
                    </p>
                  </div>
                ) : null}

                {error && (
                  <p className="text-xs text-center mb-3" style={{ color: 'var(--color-error)' }}>{error}</p>
                )}

                {!course.is_free && tokenBalance !== null && (
                  <div
                    className={`flex items-center justify-between rounded-lg px-3 py-2 mb-3 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                  >
                    <span style={{ color: 'var(--color-text-tertiary)' }}>
                      {isRTL ? 'رصيدك' : 'Your balance'}
                    </span>
                    <span
                      className="font-bold"
                      style={{ color: tokenBalance >= (course.price_tokens || 0) ? 'var(--color-accent)' : 'var(--color-error)' }}
                    >
                      {tokenBalance.toLocaleString()} {isRTL ? 'رمز' : 'tokens'}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleEnrollClick}
                  disabled={enrolling}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                >
                  {enrolling
                    ? (isRTL ? 'جارٍ التسجيل...' : 'Enrolling...')
                    : course.is_free
                      ? (isRTL ? 'ابدأ مجاناً' : 'Start for Free')
                      : (isRTL ? 'سجّل في الدورة' : 'Enroll in Course')}
                </button>
              </>
            )}

            <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--color-border)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                {isRTL ? 'تفاصيل الدورة' : 'Course details'}
              </h3>
              <div className="space-y-2.5">
                {[
                  {
                    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
                    label: isRTL ? `${modules.length} وحدة` : `${modules.length} modules`,
                  },
                  {
                    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
                    label: isRTL ? `${totalLessons} درس` : `${totalLessons} lessons`,
                  },
                  {
                    icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129',
                    label: isRTL ? 'عربي / إنجليزي' : 'Arabic / English',
                  },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2.5 text-sm ${isRTL ? 'flex-row-reverse' : ''}`} style={{ color: 'var(--color-text-secondary)' }}>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showConfirm && course && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
                  {isRTL ? 'تأكيد التسجيل' : 'Confirm Enrollment'}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  {isRTL ? 'سيتم خصم الرموز من رصيدك' : 'Tokens will be deducted from your balance'}
                </p>
              </div>
            </div>

            <div
              className="rounded-xl p-4 mb-5 space-y-2"
              style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
            >
              <div className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'الدورة' : 'Course'}
                </span>
                <span className="font-medium truncate max-w-[55%] text-right" style={{ color: 'var(--color-text-primary)' }}>
                  {language === 'ar' ? course.title_ar : course.title_en}
                </span>
              </div>
              <div className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {isRTL ? 'التكلفة' : 'Cost'}
                </span>
                <span className="font-bold" style={{ color: '#f59e0b' }}>
                  {course.price_tokens?.toLocaleString()} {isRTL ? 'رمز' : 'tokens'}
                </span>
              </div>
              {tokenBalance !== null && (
                <>
                  <div
                    className="my-1"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  />
                  <div className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'رصيدك الحالي' : 'Current balance'}
                    </span>
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {tokenBalance.toLocaleString()} {isRTL ? 'رمز' : 'tokens'}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {isRTL ? 'الرصيد بعد التسجيل' : 'Balance after enrollment'}
                    </span>
                    <span
                      className="font-bold"
                      style={{ color: tokenBalance - (course.price_tokens || 0) >= 0 ? 'var(--color-accent)' : 'var(--color-error)' }}
                    >
                      {(tokenBalance - (course.price_tokens || 0)).toLocaleString()} {isRTL ? 'رمز' : 'tokens'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={doEnroll}
                disabled={tokenBalance !== null && tokenBalance < (course.price_tokens || 0)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                {isRTL ? 'تأكيد التسجيل' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
