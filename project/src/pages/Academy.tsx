import { useState, useEffect } from 'react';
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

const PEXELS_COVERS: Record<CourseLevel, string> = {
  beginner:     'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=800',
  intermediate: 'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=800',
  advanced:     'https://images.pexels.com/photos/3747139/pexels-photo-3747139.jpeg?auto=compress&cs=tinysrgb&w=800',
};

type LevelFilter = 'all' | CourseLevel;

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
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');

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

  const filtered = levelFilter === 'all'
    ? courses
    : courses.filter((c) => c.level === levelFilter);

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

        <div className={`flex flex-wrap gap-3 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((lvl) => {
            const isActive = levelFilter === lvl;
            const label = lvl === 'all'
              ? (isRTL ? 'الكل' : 'All')
              : (isRTL ? LEVEL_LABELS[lvl].ar : LEVEL_LABELS[lvl].en);
            return (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: isActive ? '#fff' : 'var(--color-text-secondary)',
                  border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                {label}
              </button>
            );
          })}
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

        <div className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} flex gap-2`}>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: level.color }}
          >
            {isRTL ? level.ar : level.en}
          </span>
          {course.is_free ? (
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
