import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import GlobalHeader from '../components/GlobalHeader';
import VideoPlayer from '../components/academy/VideoPlayer';
import { supabase } from '../services/api';
import {
  getLessonById,
  getCourseModules,
  getEnrollment,
  markLessonComplete,
  getUserLessonProgress,
  updateEnrollmentProgress,
  getCertificate,
  issueCertificate,
  getLessonNote,
  saveLessonNote,
  getLatestSubmission,
  getUserSubmissions,
  createSubmission,
} from '../services/academyApi';
import type { AcademyLesson, AcademyModule, AcademyCertificate, AcademySubmission } from '../types/academy';

export default function AcademyLessonPage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const [lesson, setLesson] = useState<AcademyLesson | null>(null);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [marking, setMarking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<AcademyCertificate | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const [noteContent, setNoteContent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSavedAt, setNoteSavedAt] = useState<Date | null>(null);
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [latestSubmission, setLatestSubmission] = useState<AcademySubmission | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      try {
        const lessonData = await getLessonById(id!);
        if (!lessonData) {
          navigate('/academy');
          return;
        }
        setLesson(lessonData);

        const { data: moduleData } = await supabase
          .from('academy_modules')
          .select('course_id')
          .eq('id', lessonData.module_id)
          .maybeSingle();

        if (moduleData?.course_id) {
          setCourseId(moduleData.course_id);
          const mods = await getCourseModules(moduleData.course_id);
          setModules(mods);

          const initialExpanded = new Set<string>();
          mods.forEach((m) => {
            if ((m.lessons || []).some((l) => l.id === id)) {
              initialExpanded.add(m.id);
            }
          });
          setExpandedModules(initialExpanded);

          if (user) {
            const enrollment = await getEnrollment(user.id, moduleData.course_id);
            if (enrollment) {
              setEnrollmentId(enrollment.id);
              setCurrentProgress(enrollment.progress_percentage);
              const allLessonIds = mods.flatMap((mod) => (mod.lessons || []).map((l) => l.id));
              const progress = await getUserLessonProgress(user.id, allLessonIds);
              const map: Record<string, boolean> = {};
              progress.forEach((p) => { map[p.lesson_id] = p.completed; });
              setProgressMap(map);
              setIsCompleted(map[id!] ?? false);

              if (enrollment.completed_at) {
                const cert = await getCertificate(user.id, moduleData.course_id);
                setCertificate(cert);
              }
            }

            const note = await getLessonNote(user.id, id!);
            if (note) setNoteContent(note.content);

            if (lessonData.content_type === 'exercise') {
              const sub = await getLatestSubmission(user.id, id!);
              setLatestSubmission(sub);
            }
          }
        }
      } catch (err) {
        console.error('[AcademyLesson] Failed to load:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  const handleNoteChange = useCallback((value: string) => {
    setNoteContent(value);
    if (!user || !id) return;
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(async () => {
      setNoteSaving(true);
      try {
        await saveLessonNote(user.id, id, value);
        setNoteSavedAt(new Date());
      } catch (err) {
        console.error('[AcademyLesson] Note save failed:', err);
      } finally {
        setNoteSaving(false);
      }
    }, 1200);
  }, [user, id]);

  async function handleMarkComplete() {
    if (!user || !id || marking) return;
    setMarking(true);
    try {
      await markLessonComplete(user.id, id);
      setIsCompleted(true);
      setProgressMap((prev) => ({ ...prev, [id]: true }));

      if (enrollmentId && courseId && modules.length > 0) {
        const allLessons = modules.flatMap((m) => m.lessons || []);
        const updatedProgress = await getUserLessonProgress(user.id, allLessons.map((l) => l.id));
        const map: Record<string, boolean> = {};
        updatedProgress.forEach((p) => { map[p.lesson_id] = p.completed; });
        setProgressMap(map);

        const completedCount = updatedProgress.filter((p) => p.completed).length;
        const pct = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;
        const isFullyDone = pct === 100;
        const completedAt = isFullyDone ? new Date().toISOString() : null;

        await updateEnrollmentProgress(enrollmentId, pct, completedAt);
        setCurrentProgress(pct);

        if (isFullyDone) {
          setJustCompleted(true);
          const cert = await issueCertificate(user.id, courseId, enrollmentId);
          setCertificate(cert);
        }
      }
    } catch (err) {
      console.error('[AcademyLesson] Mark complete failed:', err);
    } finally {
      setMarking(false);
    }
  }

  function getAdjacentLesson(direction: 'prev' | 'next'): AcademyLesson | null {
    if (!lesson || modules.length === 0) return null;
    const allLessons = modules.flatMap((m) => m.lessons || []);
    const idx = allLessons.findIndex((l) => l.id === lesson.id);
    if (direction === 'prev') return idx > 0 ? allLessons[idx - 1] : null;
    return idx >= 0 && idx + 1 < allLessons.length ? allLessons[idx + 1] : null;
  }

  function toggleModule(moduleId: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

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

  if (!lesson) return null;

  const nextLesson = getAdjacentLesson('next');
  const prevLesson = getAdjacentLesson('prev');

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <GlobalHeader />

      {justCompleted && certificate && (
        <CourseCelebrationBanner
          isRTL={isRTL}
          courseId={courseId!}
          certificateId={certificate.id}
          onDismiss={() => setJustCompleted(false)}
        />
      )}

      <div className="flex" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <CourseSidebar
          modules={modules}
          currentLessonId={id!}
          progressMap={progressMap}
          expandedModules={expandedModules}
          onToggleModule={toggleModule}
          isRTL={isRTL}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          courseId={courseId}
          currentProgress={currentProgress}
          hasEnrollment={!!enrollmentId}
        />

        <main
          className="flex-1 overflow-y-auto"
          style={{ minWidth: 0 }}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
            <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className="p-2 rounded-lg transition-colors hover:opacity-80 lg:hidden"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                {courseId && (
                  <Link
                    to={`/academy/course/${courseId}`}
                    className={`flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {isRTL ? 'العودة للدورة' : 'Back to course'}
                  </Link>
                )}
              </div>

              {enrollmentId && (
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-28 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-muted)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${currentProgress}%`, backgroundColor: 'var(--color-accent)' }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {currentProgress}%
                  </span>
                </div>
              )}
            </div>

            {certificate && !justCompleted && (
              <Link
                to={`/academy/certificate/${certificate.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-6 transition-all hover:opacity-90 ${isRTL ? 'flex-row-reverse' : ''}`}
                style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span className="text-sm font-semibold flex-1" style={{ color: '#f59e0b' }}>
                  {isRTL ? 'عرض شهادة الإتمام' : 'View completion certificate'}
                </span>
                <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}

            <div
              className="rounded-2xl overflow-hidden mb-6"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="p-6">
                <div className={`flex items-start justify-between gap-4 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center gap-2 mb-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <ContentTypeBadge type={lesson.content_type} isRTL={isRTL} />
                      {lesson.duration_minutes && (
                        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                          {lesson.duration_minutes} {isRTL ? 'دقيقة' : 'min'}
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl font-black leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                      {lesson.title}
                    </h1>
                  </div>

                  {isCompleted && (
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0"
                      style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {isRTL ? 'مكتمل' : 'Completed'}
                    </div>
                  )}
                </div>

                <LessonContent
                  lesson={lesson}
                  isRTL={isRTL}
                  user={user}
                  enrollmentId={enrollmentId}
                  latestSubmission={latestSubmission}
                  onSubmissionCreated={setLatestSubmission}
                />
              </div>

              {user && enrollmentId && (
                <div
                  className="px-6 py-4"
                  style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
                >
                  {!isCompleted ? (
                    <button
                      onClick={handleMarkComplete}
                      disabled={marking}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60 ${isRTL ? 'flex-row-reverse' : ''}`}
                      style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                    >
                      {marking ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isRTL ? 'تحديد كمكتمل' : 'Mark as complete'}
                    </button>
                  ) : (
                    <div className={`flex items-center gap-2 text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`} style={{ color: '#22c55e' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {isRTL ? 'أنجزت هذا الدرس' : 'You have completed this lesson'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {user && enrollmentId && (
              <NotesSection
                value={noteContent}
                onChange={handleNoteChange}
                saving={noteSaving}
                savedAt={noteSavedAt}
                isRTL={isRTL}
              />
            )}

            <div className={`flex items-center justify-between mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {prevLesson ? (
                <Link
                  to={`/academy/lesson/${prevLesson.id}`}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 ${isRTL ? 'flex-row-reverse' : ''}`}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {isRTL ? 'الدرس السابق' : 'Previous lesson'}
                </Link>
              ) : <div />}

              {nextLesson ? (
                <Link
                  to={`/academy/lesson/${nextLesson.id}`}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 ${isRTL ? 'flex-row-reverse' : ''}`}
                  style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                >
                  {isRTL ? 'الدرس التالي' : 'Next lesson'}
                  <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : courseId ? (
                <Link
                  to={`/academy/course/${courseId}`}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 ${isRTL ? 'flex-row-reverse' : ''}`}
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  {isRTL ? 'صفحة الدورة' : 'Course page'}
                  <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : <div />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function CourseSidebar({
  modules,
  currentLessonId,
  progressMap,
  expandedModules,
  onToggleModule,
  isRTL,
  isOpen,
  onToggle,
  courseId,
  currentProgress,
  hasEnrollment,
}: {
  modules: AcademyModule[];
  currentLessonId: string;
  progressMap: Record<string, boolean>;
  expandedModules: Set<string>;
  onToggleModule: (id: string) => void;
  isRTL: boolean;
  isOpen: boolean;
  onToggle: () => void;
  courseId: string | null;
  currentProgress: number;
  hasEnrollment: boolean;
}) {
  const totalLessons = modules.flatMap((m) => m.lessons || []).length;
  const completedLessons = Object.values(progressMap).filter(Boolean).length;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={onToggle}
        />
      )}

      <aside
        className={`
          fixed top-0 bottom-0 z-30 transition-all duration-300
          lg:sticky lg:top-0 lg:z-auto
          flex flex-col
          ${isRTL ? 'right-0' : 'left-0'}
          ${isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
          lg:translate-x-0
        `}
        style={{
          width: 280,
          height: '100vh',
          backgroundColor: 'var(--color-surface)',
          borderRight: isRTL ? 'none' : '1px solid var(--color-border)',
          borderLeft: isRTL ? '1px solid var(--color-border)' : 'none',
          top: 0,
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {courseId && (
              <Link
                to={`/academy/course/${courseId}`}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            )}
            <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {isRTL ? 'محتوى الدورة' : 'Course content'}
            </span>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70 lg:hidden"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {hasEnrollment && totalLessons > 0 && (
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className={`flex items-center justify-between mb-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {completedLessons}/{totalLessons} {isRTL ? 'درس' : 'lessons'}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                {currentProgress}%
              </span>
            </div>
            <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--color-muted)' }}>
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${currentProgress}%`, backgroundColor: 'var(--color-accent)' }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {modules.map((mod, modIdx) => {
            const isExpanded = expandedModules.has(mod.id);
            const lessons = mod.lessons || [];
            const modCompleted = lessons.length > 0 && lessons.every((l) => progressMap[l.id]);

            return (
              <div key={mod.id}>
                <button
                  onClick={() => onToggleModule(mod.id)}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors hover:opacity-80 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                  style={{ backgroundColor: 'transparent' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      backgroundColor: modCompleted ? 'rgba(34,197,94,0.15)' : 'var(--color-muted)',
                      color: modCompleted ? '#22c55e' : 'var(--color-text-tertiary)',
                    }}
                  >
                    {modCompleted ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (modIdx + 1)}
                  </div>
                  <span className="flex-1 text-xs font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                    {mod.title}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div>
                    {lessons.map((les) => {
                      const isCurrent = les.id === currentLessonId;
                      const isDone = progressMap[les.id] ?? false;

                      return (
                        <Link
                          key={les.id}
                          to={`/academy/lesson/${les.id}`}
                          className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                          style={{
                            backgroundColor: isCurrent ? 'rgba(var(--color-accent-rgb, 16,185,129),0.08)' : 'transparent',
                            borderLeft: !isRTL && isCurrent ? '3px solid var(--color-accent)' : '3px solid transparent',
                            borderRight: isRTL && isCurrent ? '3px solid var(--color-accent)' : '3px solid transparent',
                          }}
                        >
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: isDone ? 'rgba(34,197,94,0.15)' : 'var(--color-muted)',
                              border: isCurrent && !isDone ? '1.5px solid var(--color-accent)' : 'none',
                            }}
                          >
                            {isDone ? (
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#22c55e' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <LessonTypeIcon type={les.content_type} size={10} />
                            )}
                          </div>
                          <span
                            className="flex-1 text-xs leading-snug line-clamp-2"
                            style={{ color: isCurrent ? 'var(--color-accent)' : 'var(--color-text-secondary)', fontWeight: isCurrent ? 600 : 400 }}
                          >
                            {les.title}
                          </span>
                          {les.duration_minutes && (
                            <span className="text-xs shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                              {les.duration_minutes}m
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}

function LessonContent({
  lesson,
  isRTL,
  user,
  enrollmentId,
  latestSubmission,
  onSubmissionCreated,
}: {
  lesson: AcademyLesson;
  isRTL: boolean;
  user: { id: string } | null;
  enrollmentId: string | null;
  latestSubmission: AcademySubmission | null;
  onSubmissionCreated: (sub: AcademySubmission) => void;
}) {
  if (lesson.content_type === 'video' && lesson.content_url) {
    return <VideoPlayer url={lesson.content_url} title={lesson.title} />;
  }

  if (lesson.content_type === 'pdf' && lesson.content_url) {
    return (
      <div
        className="rounded-xl p-6 flex flex-col items-center gap-5 text-center"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#ef4444' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{lesson.title}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {isRTL ? 'اضغط لتنزيل الملف أو فتحه' : 'Click to download or view the file'}
          </p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <a
            href={lesson.content_url}
            download
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isRTL ? 'تنزيل' : 'Download'}
          </a>
          <a
            href={lesson.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {isRTL ? 'فتح' : 'Open'}
          </a>
        </div>
      </div>
    );
  }

  if (lesson.content_type === 'article') {
    return (
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
      >
        <p
          className="text-sm leading-loose"
          style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}
        >
          {lesson.content_url || (isRTL ? 'محتوى المقال سيظهر هنا' : 'Article content will appear here')}
        </p>
      </div>
    );
  }

  if (lesson.content_type === 'exercise') {
    return (
      <ExerciseBlock
        lesson={lesson}
        isRTL={isRTL}
        user={user}
        enrollmentId={enrollmentId}
        latestSubmission={latestSubmission}
        onSubmissionCreated={onSubmissionCreated}
      />
    );
  }

  return (
    <div className="text-center py-10" style={{ color: 'var(--color-text-tertiary)' }}>
      {isRTL ? 'لا يوجد محتوى لهذا الدرس بعد' : 'No content available for this lesson yet'}
    </div>
  );
}

function ExerciseBlock({
  lesson,
  isRTL,
  user,
  enrollmentId,
  latestSubmission,
  onSubmissionCreated,
}: {
  lesson: AcademyLesson;
  isRTL: boolean;
  user: { id: string } | null;
  enrollmentId: string | null;
  latestSubmission: AcademySubmission | null;
  onSubmissionCreated: (sub: AcademySubmission) => void;
}) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [viewing, setViewing] = useState<AcademySubmission | null>(latestSubmission);

  useEffect(() => {
    setViewing(latestSubmission);
    setSubmitted(!!latestSubmission);
    setDraft('');
  }, [latestSubmission]);

  async function handleSubmit() {
    if (!user || !draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      const sub = await createSubmission(user.id, lesson.id, draft.trim());
      onSubmissionCreated(sub);
      setViewing(sub);
      setSubmitted(true);
      setDraft('');
    } catch (err) {
      console.error('[ExerciseBlock] submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  const prompt = lesson.content_url || null;
  const canSubmit = !!user && !!enrollmentId;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
      >
        <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <p className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'تمرين كتابي' : 'Writing prompt'}
          </p>
        </div>
        {prompt ? (
          <p className="text-sm leading-loose" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
            {prompt}
          </p>
        ) : (
          <p className="text-sm italic" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL ? 'تعليمات التمرين ستظهر هنا' : 'Exercise instructions will appear here'}
          </p>
        )}
      </div>

      {canSubmit && !submitted && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              {isRTL ? 'إجابتك' : 'Your response'}
            </span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={isRTL ? 'اكتب إجابتك هنا…' : 'Write your response here…'}
            rows={8}
            className="w-full px-4 py-4 text-sm resize-none outline-none"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              direction: isRTL ? 'rtl' : 'ltr',
            }}
          />
          <div
            className={`px-4 py-3 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {draft.trim().length > 0
                ? `${draft.trim().split(/\s+/).filter(Boolean).length} ${isRTL ? 'كلمة' : 'words'}`
                : (isRTL ? 'ابدأ الكتابة…' : 'Start writing…')}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!draft.trim() || submitting}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 ${isRTL ? 'flex-row-reverse' : ''}`}
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              {isRTL ? 'إرسال' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {canSubmit && submitted && viewing && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <div
            className={`px-4 py-3 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
            style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
          >
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#22c55e' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>
                {isRTL ? 'تم الإرسال' : 'Submitted'}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                · {new Date(viewing.created_at).toLocaleDateString(isRTL ? 'ar' : 'en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <button
              onClick={() => { setSubmitted(false); setDraft(viewing.content); setShowHistory(false); }}
              className="text-xs font-medium hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-accent)' }}
            >
              {isRTL ? 'تحرير / إعادة الإرسال' : 'Edit / Resubmit'}
            </button>
          </div>

          <div
            className="px-4 py-4"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <p className="text-sm leading-loose" style={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', direction: isRTL ? 'rtl' : 'ltr' }}>
              {viewing.content}
            </p>
          </div>

          {viewing.feedback && (
            <div
              className="px-4 py-4"
              style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'rgba(59,130,246,0.04)' }}
            >
              <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#3b82f6' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-xs font-bold" style={{ color: '#3b82f6' }}>
                  {isRTL ? 'ملاحظات' : 'Feedback'}
                </span>
              </div>
              <p className="text-sm leading-loose" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
                {viewing.feedback}
              </p>
            </div>
          )}

          <div
            className="px-4 py-2.5"
            style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
          >
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={`flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity ${isRTL ? 'flex-row-reverse' : ''}`}
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {isRTL ? 'سجل الإرسالات' : 'Submission history'}
            </button>
          </div>
        </div>
      )}

      {showHistory && user && (
        <SubmissionHistory userId={user.id} lessonId={lesson.id} isRTL={isRTL} onView={setViewing} currentId={viewing?.id} />
      )}

      {!canSubmit && (
        <div
          className="rounded-xl px-5 py-4 text-center"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL ? 'سجّل في الدورة لتتمكن من الإجابة' : 'Enroll in the course to submit your response'}
          </p>
        </div>
      )}
    </div>
  );
}

function SubmissionHistory({
  userId,
  lessonId,
  isRTL,
  onView,
  currentId,
}: {
  userId: string;
  lessonId: string;
  isRTL: boolean;
  onView: (sub: AcademySubmission) => void;
  currentId?: string;
}) {
  const [submissions, setSubmissions] = useState<AcademySubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getUserSubmissions(userId, lessonId);
        setSubmissions(data);
      } catch (err) {
        console.error('[SubmissionHistory] load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, lessonId]);

  if (loading) return (
    <div className="flex justify-center py-4">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
    </div>
  );

  if (submissions.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
          {isRTL ? `${submissions.length} إرسالات سابقة` : `${submissions.length} past submission${submissions.length > 1 ? 's' : ''}`}
        </span>
      </div>
      <div>
        {submissions.map((sub, idx) => (
          <button
            key={sub.id}
            onClick={() => onView(sub)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-80 ${isRTL ? 'flex-row-reverse' : ''}`}
            style={{
              backgroundColor: sub.id === currentId ? 'var(--color-bg-secondary)' : 'transparent',
              borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none',
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-text-tertiary)' }}
            >
              {submissions.length - idx}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                {sub.content.split('\n')[0].slice(0, 80)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {new Date(sub.created_at).toLocaleDateString(isRTL ? 'ar' : 'en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {sub.feedback && (
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#3b82f6' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function NotesSection({
  value,
  onChange,
  saving,
  savedAt,
  isRTL,
}: {
  value: string;
  onChange: (v: string) => void;
  saving: boolean;
  savedAt: Date | null;
  isRTL: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-5 py-4 transition-opacity hover:opacity-80 ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--color-muted)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div className={`flex-1 text-left ${isRTL ? 'text-right' : ''}`}>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'ملاحظاتي' : 'My notes'}
          </span>
          {value && (
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {value}
            </p>
          )}
        </div>
        <div className={`flex items-center gap-2 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {saving && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2" style={{ borderColor: 'var(--color-accent)' }} />
          )}
          {savedAt && !saving && (
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {isRTL ? 'محفوظ' : 'Saved'}
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--color-border)' }}>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isRTL ? 'اكتب ملاحظاتك هنا…' : 'Write your notes here…'}
            rows={6}
            className="w-full mt-4 px-4 py-3 rounded-xl text-sm resize-none outline-none transition-all focus:ring-2"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              direction: isRTL ? 'rtl' : 'ltr',
            }}
          />
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL ? 'يتم الحفظ تلقائياً' : 'Saves automatically as you type'}
          </p>
        </div>
      )}
    </div>
  );
}

function ContentTypeBadge({ type, isRTL }: { type: string; isRTL: boolean }) {
  const labels: Record<string, { ar: string; en: string; color: string }> = {
    video:    { ar: 'فيديو',   en: 'Video',    color: '#3b82f6' },
    article:  { ar: 'مقال',    en: 'Article',  color: '#8b5cf6' },
    exercise: { ar: 'تمرين',   en: 'Exercise', color: '#f59e0b' },
    pdf:      { ar: 'PDF',     en: 'PDF',      color: '#ef4444' },
  };
  const info = labels[type] || { ar: type, en: type, color: 'var(--color-accent)' };
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded"
      style={{ backgroundColor: `${info.color}18`, color: info.color }}
    >
      {isRTL ? info.ar : info.en}
    </span>
  );
}

function LessonTypeIcon({ type, size = 12 }: { type: string; size?: number }) {
  const s = `w-${size === 10 ? '2.5' : '3'} h-${size === 10 ? '2.5' : '3'}`;
  if (type === 'video') return (
    <svg className={s} fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)' }}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
  if (type === 'pdf') return (
    <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)', strokeWidth: 2 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
  return (
    <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-text-tertiary)', strokeWidth: 2 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CourseCelebrationBanner({
  isRTL,
  certificateId,
  onDismiss,
}: {
  isRTL: boolean;
  courseId: string;
  certificateId: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-white font-black text-lg leading-tight">
              {isRTL ? 'مبروك! أكملت الدورة بنجاح' : 'Congratulations! You completed the course'}
            </p>
            <p className="text-white text-sm opacity-90 mt-0.5">
              {isRTL ? 'شهادتك جاهزة الآن' : 'Your certificate is ready'}
            </p>
          </div>
          <div className={`flex items-center gap-3 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Link
              to={`/academy/certificate/${certificateId}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: 'white', color: '#d97706' }}
            >
              {isRTL ? 'عرض الشهادة' : 'View Certificate'}
            </Link>
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
