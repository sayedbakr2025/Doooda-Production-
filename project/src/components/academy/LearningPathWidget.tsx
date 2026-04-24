import { Link } from 'react-router-dom';
import type { AcademyLearningPath, AcademyEnrollment, CourseLevel } from '../../types/academy';

const LEVEL_COLORS: Record<CourseLevel, string> = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

const LEVEL_LABELS: Record<CourseLevel, { ar: string; en: string }> = {
  beginner: { ar: 'مبتدئ', en: 'Beginner' },
  intermediate: { ar: 'متوسط', en: 'Intermediate' },
  advanced: { ar: 'متقدم', en: 'Advanced' },
};

interface Props {
  paths: AcademyLearningPath[];
  enrollments: AcademyEnrollment[];
  language: string;
  isRTL: boolean;
}

export default function LearningPathWidget({ paths, enrollments, language, isRTL }: Props) {
  if (paths.length === 0) return null;

  const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id));

  function getPathProgress(path: AcademyLearningPath): { done: number; total: number } {
    const courses = path.courses || [];
    const done = courses.filter((c) => enrolledCourseIds.has(c.id)).length;
    return { done, total: courses.length };
  }

  function getNextCourse(path: AcademyLearningPath) {
    const courses = path.courses || [];
    return courses.find((c) => !enrolledCourseIds.has(c.id)) || null;
  }

  return (
    <section className="mb-10">
      <div className={`flex items-center gap-3 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#22c55e' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <div className={isRTL ? 'text-right' : ''}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {isRTL ? 'مسارات التعلم' : 'Learning Paths'}
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {isRTL ? 'مسارات منظمة لتطوير مهاراتك' : 'Curated paths to develop your skills'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paths.map((path) => {
          const { done, total } = getPathProgress(path);
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const next = getNextCourse(path);
          const title = language === 'ar' ? path.title_ar : path.title_en;
          const desc = language === 'ar' ? path.description_ar : path.description_en;
          const lvl = LEVEL_LABELS[path.target_level];
          const lvlColor = LEVEL_COLORS[path.target_level];
          const isComplete = done === total && total > 0;

          return (
            <div
              key={path.id}
              className="rounded-2xl p-5 flex flex-col gap-4 transition-all"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: lvlColor }}
                    >
                      {isRTL ? lvl.ar : lvl.en}
                    </span>
                    {isComplete && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}
                      >
                        {isRTL ? 'مكتمل' : 'Complete'}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                    {title}
                  </h3>
                  {desc && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-tertiary)' }}>
                      {desc}
                    </p>
                  )}
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
                  style={{
                    backgroundColor: isComplete ? 'rgba(34,197,94,0.12)' : 'var(--color-bg-secondary)',
                    color: isComplete ? '#22c55e' : 'var(--color-text-secondary)',
                  }}
                >
                  {pct}%
                </div>
              </div>

              <div>
                <div className={`flex justify-between text-xs mb-1.5 ${isRTL ? 'flex-row-reverse' : ''}`} style={{ color: 'var(--color-text-tertiary)' }}>
                  <span>{done}/{total} {isRTL ? 'دورات' : 'courses'}</span>
                </div>
                <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--color-muted)' }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: isComplete ? '#22c55e' : lvlColor }}
                  />
                </div>
              </div>

              {path.skill_tags && path.skill_tags.length > 0 && (
                <div className={`flex flex-wrap gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {path.skill_tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {next && !isComplete && (
                <Link
                  to={`/academy/course/${next.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 ${isRTL ? 'flex-row-reverse' : ''}`}
                  style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="truncate">
                    {isRTL ? 'التالي:' : 'Next:'} {language === 'ar' ? next.title_ar : next.title_en}
                  </span>
                </Link>
              )}

              {isComplete && (
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${isRTL ? 'flex-row-reverse' : ''}`}
                  style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isRTL ? 'أتممت هذا المسار!' : 'Path completed!'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
