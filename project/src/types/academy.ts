export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type LessonContentType = 'video' | 'article' | 'exercise' | 'pdf';

export interface AcademyCourse {
  id: string;
  title_ar: string;
  title_en: string;
  description: string;
  level: CourseLevel;
  is_free: boolean;
  price_tokens: number | null;
  is_published: boolean;
  cover_image: string | null;
  order_index: number;
  created_at: string;
}

export interface AcademyModule {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
  lessons?: AcademyLesson[];
}

export interface AcademyLesson {
  id: string;
  module_id: string;
  title: string;
  content_type: LessonContentType;
  content_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  is_preview: boolean;
  created_at: string;
}

export interface AcademyEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress_percentage: number;
  completed_at: string | null;
  created_at: string;
}

export interface AcademyProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
}

export interface AcademySubmission {
  id: string;
  user_id: string;
  lesson_id: string;
  content: string;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonNote {
  id: string;
  user_id: string;
  lesson_id: string;
  content: string;
  updated_at: string;
  created_at: string;
}

export interface AcademyCertificate {
  id: string;
  user_id: string;
  course_id: string;
  enrollment_id: string;
  issued_at: string;
}

export interface CourseWithEnrollment extends AcademyCourse {
  enrollment?: AcademyEnrollment;
  modules?: AcademyModule[];
}

export interface AcademySkillLevel {
  id: string;
  user_id: string;
  skill_tag: string;
  score: number;
  updated_at: string;
}

export interface AcademyCourseScore {
  id: string;
  user_id: string;
  course_id: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  lessons_completed: number;
  lessons_total: number;
  exercises_submitted: number;
  calculated_at: string;
}

export interface AcademyLearningPath {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  target_level: CourseLevel;
  skill_tags: string[];
  is_active: boolean;
  order_index: number;
  created_at: string;
  courses?: AcademyCourse[];
}

export interface AcademyLearningPathCourse {
  id: string;
  path_id: string;
  course_id: string;
  position: number;
}

export interface AcademyWeeklyChallenge {
  id: string;
  title_ar: string;
  title_en: string;
  prompt_ar: string;
  prompt_en: string;
  skill_tags: string[];
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  tokens_reward: number;
  created_at: string;
}

export interface AcademyChallengeSubmission {
  id: string;
  challenge_id: string;
  user_id: string;
  content: string;
  score: number | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}
