import { supabase } from './api';
import type {
  AcademyCourse,
  AcademyModule,
  AcademyLesson,
  AcademyEnrollment,
  AcademyProgress,
  AcademyCertificate,
  AcademySubmission,
  LessonNote,
  CourseWithEnrollment,
  AcademySkillLevel,
  AcademyCourseScore,
  AcademyLearningPath,
  AcademyWeeklyChallenge,
  AcademyChallengeSubmission,
} from '../types/academy';

export async function getPublishedCourses(): Promise<AcademyCourse[]> {
  const { data, error } = await supabase
    .from('academy_courses')
    .select('*')
    .eq('is_published', true)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAllCourses(): Promise<AcademyCourse[]> {
  const { data, error } = await supabase
    .from('academy_courses')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getCourseById(id: string): Promise<CourseWithEnrollment | null> {
  const { data, error } = await supabase
    .from('academy_courses')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCourseModules(courseId: string): Promise<AcademyModule[]> {
  const { data: modules, error: modulesError } = await supabase
    .from('academy_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (modulesError) throw modulesError;
  if (!modules || modules.length === 0) return [];

  const moduleIds = modules.map((m) => m.id);
  const { data: lessons, error: lessonsError } = await supabase
    .from('academy_lessons')
    .select('*')
    .in('module_id', moduleIds)
    .order('order_index', { ascending: true });

  if (lessonsError) throw lessonsError;

  return modules.map((mod) => ({
    ...mod,
    lessons: (lessons || []).filter((l) => l.module_id === mod.id),
  }));
}

export async function getLessonById(id: string): Promise<AcademyLesson | null> {
  const { data, error } = await supabase
    .from('academy_lessons')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getUserEnrollments(userId: string): Promise<AcademyEnrollment[]> {
  const { data, error } = await supabase
    .from('academy_enrollments')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

export async function getEnrollment(userId: string, courseId: string): Promise<AcademyEnrollment | null> {
  const { data, error } = await supabase
    .from('academy_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type EnrollResult =
  | { success: true; already_enrolled: boolean; enrollment: AcademyEnrollment; tokens_deducted: number }
  | { success: false; error: 'insufficient_tokens'; required: number; available: number }
  | { success: false; error: 'price_not_set' | 'course_not_found' | 'user_not_found' };

export async function enrollInCourse(userId: string, courseId: string): Promise<EnrollResult> {
  const { data, error } = await supabase.rpc('enroll_in_course', {
    p_user_id: userId,
    p_course_id: courseId,
  });

  if (error) throw error;
  return data as EnrollResult;
}

export async function getUserLessonProgress(userId: string, lessonIds: string[]): Promise<AcademyProgress[]> {
  if (lessonIds.length === 0) return [];

  const { data, error } = await supabase
    .from('academy_progress')
    .select('*')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds);

  if (error) throw error;
  return data || [];
}

export async function markLessonComplete(userId: string, lessonId: string): Promise<AcademyProgress> {
  const { data, error } = await supabase
    .from('academy_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEnrollmentProgress(
  enrollmentId: string,
  progressPercentage: number,
  completedAt?: string | null
): Promise<void> {
  const update: Record<string, unknown> = { progress_percentage: progressPercentage };
  if (completedAt !== undefined) update.completed_at = completedAt;

  const { error } = await supabase
    .from('academy_enrollments')
    .update(update)
    .eq('id', enrollmentId);

  if (error) throw error;
}

export async function createCourse(course: Omit<AcademyCourse, 'id' | 'created_at'>): Promise<AcademyCourse> {
  const { data, error } = await supabase
    .from('academy_courses')
    .insert(course)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCourse(id: string, updates: Partial<AcademyCourse>): Promise<AcademyCourse> {
  const { data, error } = await supabase
    .from('academy_courses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase
    .from('academy_courses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function createModule(mod: Omit<AcademyModule, 'id' | 'created_at' | 'lessons'>): Promise<AcademyModule> {
  const { data, error } = await supabase
    .from('academy_modules')
    .insert(mod)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateModule(id: string, updates: Partial<AcademyModule>): Promise<AcademyModule> {
  const { data, error } = await supabase
    .from('academy_modules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteModule(id: string): Promise<void> {
  const { error } = await supabase
    .from('academy_modules')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function createLesson(lesson: Omit<AcademyLesson, 'id' | 'created_at'>): Promise<AcademyLesson> {
  const { data, error } = await supabase
    .from('academy_lessons')
    .insert(lesson)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLesson(id: string, updates: Partial<AcademyLesson>): Promise<AcademyLesson> {
  const { data, error } = await supabase
    .from('academy_lessons')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await supabase
    .from('academy_lessons')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getUserCertificates(userId: string): Promise<AcademyCertificate[]> {
  const { data, error } = await supabase
    .from('academy_certificates')
    .select('*')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCertificate(userId: string, courseId: string): Promise<AcademyCertificate | null> {
  const { data, error } = await supabase
    .from('academy_certificates')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCertificateById(id: string): Promise<AcademyCertificate | null> {
  const { data, error } = await supabase
    .from('academy_certificates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function issueCertificate(
  userId: string,
  courseId: string,
  enrollmentId: string
): Promise<AcademyCertificate> {
  const { data, error } = await supabase
    .from('academy_certificates')
    .upsert(
      { user_id: userId, course_id: courseId, enrollment_id: enrollmentId },
      { onConflict: 'user_id,course_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLessonNote(userId: string, lessonId: string): Promise<LessonNote | null> {
  const { data, error } = await supabase
    .from('academy_lesson_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveLessonNote(userId: string, lessonId: string, content: string): Promise<LessonNote> {
  const { data, error } = await supabase
    .from('academy_lesson_notes')
    .upsert(
      { user_id: userId, lesson_id: lessonId, content, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLatestSubmission(userId: string, lessonId: string): Promise<AcademySubmission | null> {
  const { data, error } = await supabase
    .from('academy_submissions')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getUserSubmissions(userId: string, lessonId: string): Promise<AcademySubmission[]> {
  const { data, error } = await supabase
    .from('academy_submissions')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSubmission(userId: string, lessonId: string, content: string): Promise<AcademySubmission> {
  const { data, error } = await supabase
    .from('academy_submissions')
    .insert({ user_id: userId, lesson_id: lessonId, content })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserSkillLevels(userId: string): Promise<AcademySkillLevel[]> {
  const { data, error } = await supabase
    .from('academy_skill_levels')
    .select('*')
    .eq('user_id', userId)
    .order('score', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertSkillLevel(userId: string, skillTag: string, score: number): Promise<void> {
  const { error } = await supabase
    .from('academy_skill_levels')
    .upsert(
      { user_id: userId, skill_tag: skillTag, score, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,skill_tag' }
    );

  if (error) throw error;
}

export async function getCourseScore(userId: string, courseId: string): Promise<AcademyCourseScore | null> {
  const { data, error } = await supabase
    .from('academy_course_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function calculateAndSaveCourseScore(userId: string, courseId: string): Promise<AcademyCourseScore | null> {
  const { error } = await supabase.rpc('calculate_course_score', {
    p_user_id: userId,
    p_course_id: courseId,
  });

  if (error) throw error;
  return getCourseScore(userId, courseId);
}

export async function getUserCourseScores(userId: string): Promise<AcademyCourseScore[]> {
  const { data, error } = await supabase
    .from('academy_course_scores')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

export async function getActiveLearningPaths(): Promise<AcademyLearningPath[]> {
  const { data: paths, error: pathsError } = await supabase
    .from('academy_learning_paths')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true });

  if (pathsError) throw pathsError;
  if (!paths || paths.length === 0) return [];

  const pathIds = paths.map((p) => p.id);
  const { data: pathCourses, error: pcError } = await supabase
    .from('academy_learning_path_courses')
    .select('path_id, course_id, position')
    .in('path_id', pathIds)
    .order('position', { ascending: true });

  if (pcError) throw pcError;

  const courseIds = [...new Set((pathCourses || []).map((pc) => pc.course_id))];
  let coursesMap: Record<string, AcademyCourse> = {};

  if (courseIds.length > 0) {
    const { data: courses, error: cError } = await supabase
      .from('academy_courses')
      .select('*')
      .in('id', courseIds);

    if (cError) throw cError;
    coursesMap = Object.fromEntries((courses || []).map((c) => [c.id, c]));
  }

  return paths.map((path) => ({
    ...path,
    courses: (pathCourses || [])
      .filter((pc) => pc.path_id === path.id)
      .map((pc) => coursesMap[pc.course_id])
      .filter(Boolean),
  }));
}

export async function getAllLearningPaths(): Promise<AcademyLearningPath[]> {
  const { data, error } = await supabase
    .from('academy_learning_paths')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createLearningPath(path: Omit<AcademyLearningPath, 'id' | 'created_at' | 'courses'>): Promise<AcademyLearningPath> {
  const { data, error } = await supabase
    .from('academy_learning_paths')
    .insert(path)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLearningPath(id: string, updates: Partial<AcademyLearningPath>): Promise<AcademyLearningPath> {
  const { courses: _courses, ...rest } = updates as AcademyLearningPath;
  const { data, error } = await supabase
    .from('academy_learning_paths')
    .update(rest)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLearningPath(id: string): Promise<void> {
  const { error } = await supabase
    .from('academy_learning_paths')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function setLearningPathCourses(pathId: string, courseIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('academy_learning_path_courses')
    .delete()
    .eq('path_id', pathId);

  if (deleteError) throw deleteError;

  if (courseIds.length === 0) return;

  const rows = courseIds.map((courseId, idx) => ({ path_id: pathId, course_id: courseId, position: idx }));
  const { error } = await supabase
    .from('academy_learning_path_courses')
    .insert(rows);

  if (error) throw error;
}

export async function getActiveWeeklyChallenge(): Promise<AcademyWeeklyChallenge | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('academy_weekly_challenges')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAllWeeklyChallenges(): Promise<AcademyWeeklyChallenge[]> {
  const { data, error } = await supabase
    .from('academy_weekly_challenges')
    .select('*')
    .order('starts_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createWeeklyChallenge(challenge: Omit<AcademyWeeklyChallenge, 'id' | 'created_at'>): Promise<AcademyWeeklyChallenge> {
  const { data, error } = await supabase
    .from('academy_weekly_challenges')
    .insert(challenge)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWeeklyChallenge(id: string, updates: Partial<AcademyWeeklyChallenge>): Promise<AcademyWeeklyChallenge> {
  const { data, error } = await supabase
    .from('academy_weekly_challenges')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWeeklyChallenge(id: string): Promise<void> {
  const { error } = await supabase
    .from('academy_weekly_challenges')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getChallengeSubmission(userId: string, challengeId: string): Promise<AcademyChallengeSubmission | null> {
  const { data, error } = await supabase
    .from('academy_challenge_submissions')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function submitChallengeEntry(userId: string, challengeId: string, content: string): Promise<AcademyChallengeSubmission> {
  const { data, error } = await supabase
    .from('academy_challenge_submissions')
    .upsert(
      { user_id: userId, challenge_id: challengeId, content, updated_at: new Date().toISOString() },
      { onConflict: 'challenge_id,user_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getChallengeSubmissionCount(challengeId: string): Promise<number> {
  const { count, error } = await supabase
    .from('academy_challenge_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('challenge_id', challengeId);

  if (error) throw error;
  return count ?? 0;
}
