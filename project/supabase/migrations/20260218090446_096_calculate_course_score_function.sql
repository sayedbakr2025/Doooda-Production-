/*
  # Calculate Course Score Function

  ## Purpose
  Calculates a user's score for a completed or in-progress course.

  ## Scoring Formula
  - Lesson completion = 70% weight (lessons_completed / lessons_total * 70)
  - Exercise submissions = 30% weight (exercises_submitted / exercises_total * 30)
  - If no exercises exist, lesson completion = 100% weight
  - Grade: A=90+, B=75+, C=60+, D=50+, F=below 50

  ## Behavior
  - Upserts into academy_course_scores
  - Returns the final score object
*/

CREATE OR REPLACE FUNCTION calculate_course_score(
  p_user_id uuid,
  p_course_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lessons_total integer;
  v_lessons_completed integer;
  v_exercises_total integer;
  v_exercises_submitted integer;
  v_lesson_score numeric;
  v_exercise_score numeric;
  v_final_score integer;
  v_grade text;
  v_result record;
BEGIN
  SELECT COUNT(*)
  INTO v_lessons_total
  FROM academy_lessons al
  JOIN academy_modules am ON am.id = al.module_id
  WHERE am.course_id = p_course_id;

  SELECT COUNT(*)
  INTO v_lessons_completed
  FROM academy_progress ap
  JOIN academy_lessons al ON al.id = ap.lesson_id
  JOIN academy_modules am ON am.id = al.module_id
  WHERE am.course_id = p_course_id
    AND ap.user_id = p_user_id
    AND ap.completed = true;

  SELECT COUNT(*)
  INTO v_exercises_total
  FROM academy_lessons al
  JOIN academy_modules am ON am.id = al.module_id
  WHERE am.course_id = p_course_id
    AND al.content_type = 'exercise';

  SELECT COUNT(DISTINCT al.id)
  INTO v_exercises_submitted
  FROM academy_submissions asub
  JOIN academy_lessons al ON al.id = asub.lesson_id
  JOIN academy_modules am ON am.id = al.module_id
  WHERE am.course_id = p_course_id
    AND asub.user_id = p_user_id;

  IF v_lessons_total = 0 THEN
    v_final_score := 0;
  ELSIF v_exercises_total = 0 THEN
    v_final_score := CAST((v_lessons_completed::numeric / v_lessons_total * 100) AS integer);
  ELSE
    v_lesson_score := v_lessons_completed::numeric / v_lessons_total * 70;
    v_exercise_score := LEAST(v_exercises_submitted::numeric / v_exercises_total, 1.0) * 30;
    v_final_score := CAST(v_lesson_score + v_exercise_score AS integer);
  END IF;

  v_grade := CASE
    WHEN v_final_score >= 90 THEN 'A'
    WHEN v_final_score >= 75 THEN 'B'
    WHEN v_final_score >= 60 THEN 'C'
    WHEN v_final_score >= 50 THEN 'D'
    ELSE 'F'
  END;

  INSERT INTO academy_course_scores (
    user_id, course_id, score, grade,
    lessons_completed, lessons_total, exercises_submitted, calculated_at
  ) VALUES (
    p_user_id, p_course_id, v_final_score, v_grade,
    v_lessons_completed, v_lessons_total, v_exercises_submitted, now()
  )
  ON CONFLICT (user_id, course_id)
  DO UPDATE SET
    score = EXCLUDED.score,
    grade = EXCLUDED.grade,
    lessons_completed = EXCLUDED.lessons_completed,
    lessons_total = EXCLUDED.lessons_total,
    exercises_submitted = EXCLUDED.exercises_submitted,
    calculated_at = now();

  RETURN jsonb_build_object(
    'score', v_final_score,
    'grade', v_grade,
    'lessons_completed', v_lessons_completed,
    'lessons_total', v_lessons_total,
    'exercises_submitted', v_exercises_submitted,
    'exercises_total', v_exercises_total
  );
END;
$$;
