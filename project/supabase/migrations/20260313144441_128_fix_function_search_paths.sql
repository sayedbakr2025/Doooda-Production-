
/*
  # Fix Function Search Path Mutable Warnings

  ## Summary
  Sets `search_path = public` on all functions that currently have a mutable search_path.
  This prevents potential search_path injection attacks.

  ## Functions Fixed
  - compute_competition_status
  - execute_plot_transaction
  - create_plot_project_for_new_project
  - update_plot_updated_at
  - deduct_tokens
  - log_and_deduct_tokens
  - update_plot_templates_updated_at
  - calculate_scene_word_count
  - handle_new_user
  - update_project_timestamp
  - update_logline_timestamp
  - update_chapter_timestamp
  - calculate_chapter_word_count
  - calculate_logline_word_count
  - update_scene_timestamp
  - update_task_timestamp
  - update_character_timestamp
  - update_session_timestamp
  - check_goal_reached
*/

CREATE OR REPLACE FUNCTION public.compute_competition_status(p_start timestamp with time zone, p_end timestamp with time zone)
  RETURNS competition_status
  LANGUAGE sql
  IMMUTABLE
  SET search_path = public
AS $function$
SELECT CASE
WHEN now() < p_start THEN 'upcoming'::competition_status
WHEN now() BETWEEN p_start AND p_end THEN 'open'::competition_status
ELSE 'expired'::competition_status
END;
$function$;

CREATE OR REPLACE FUNCTION public.execute_plot_transaction(p_plot_project_id uuid, p_project_id uuid, p_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
DECLARE
v_plot_executed boolean;
v_plot_project_id_from_db uuid;
v_project_user_id uuid;
v_chapter record;
v_scene record;
v_chapter_id uuid;
v_chapters_created integer := 0;
v_scenes_created integer := 0;
v_chapters_disabled integer := 0;
v_chapter_id_map jsonb := '{}';
BEGIN
SELECT id, executed INTO v_plot_project_id_from_db, v_plot_executed
FROM plot_projects
WHERE id = p_plot_project_id AND project_id = p_project_id;

IF NOT FOUND THEN
RAISE EXCEPTION 'Plot project not found or does not belong to this project';
END IF;

IF v_plot_executed THEN
RAISE EXCEPTION 'Plot has already been executed';
END IF;

SELECT user_id INTO v_project_user_id
FROM projects
WHERE id = p_project_id;

IF NOT FOUND THEN
RAISE EXCEPTION 'Project not found';
END IF;

IF v_project_user_id != p_user_id THEN
RAISE EXCEPTION 'Unauthorized access to project';
END IF;

UPDATE chapters
SET 
is_active = false,
updated_at = now()
WHERE 
project_id = p_project_id 
AND is_active = true
AND deleted_at IS NULL;

GET DIAGNOSTICS v_chapters_disabled = ROW_COUNT;

FOR v_chapter IN
SELECT 
order_index,
title,
summary
FROM plot_chapters
WHERE plot_project_id = p_plot_project_id
ORDER BY order_index
LOOP
INSERT INTO chapters (
project_id,
title,
summary,
chapter_number,
content,
word_count,
is_active
) VALUES (
p_project_id,
v_chapter.title,
COALESCE(v_chapter.summary, ''),
v_chapter.order_index,
'',
0,
true
)
RETURNING id INTO v_chapter_id;

v_chapter_id_map := jsonb_set(
v_chapter_id_map,
ARRAY[v_chapter.order_index::text],
to_jsonb(v_chapter_id)
);

v_chapters_created := v_chapters_created + 1;
END LOOP;

FOR v_scene IN
SELECT 
pc.order_index as chapter_order_index,
ps.order_index as scene_order_index,
ps.title,
ps.summary,
ps.hook
FROM plot_scenes ps
JOIN plot_chapters pc ON pc.id = ps.chapter_id
WHERE pc.plot_project_id = p_plot_project_id
ORDER BY pc.order_index, ps.order_index
LOOP
v_chapter_id := (v_chapter_id_map->>v_scene.chapter_order_index::text)::uuid;

IF v_chapter_id IS NULL THEN
CONTINUE;
END IF;

INSERT INTO scenes (
chapter_id,
title,
summary,
hook,
position,
content,
word_count
) VALUES (
v_chapter_id,
v_scene.title,
COALESCE(v_scene.summary, ''),
v_scene.hook,
v_scene.scene_order_index,
'',
0
);

v_scenes_created := v_scenes_created + 1;
END LOOP;

UPDATE plot_projects
SET 
executed = true,
updated_at = now()
WHERE id = p_plot_project_id;

RETURN jsonb_build_object(
'success', true,
'chapters_created', v_chapters_created,
'scenes_created', v_scenes_created,
'chapters_disabled', v_chapters_disabled
);

EXCEPTION WHEN OTHERS THEN
RAISE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_plot_project_for_new_project()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
INSERT INTO plot_projects (project_id)
VALUES (NEW.id);
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_plot_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.deduct_tokens(p_user_id uuid, p_amount integer)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  UPDATE user_tokens
  SET 
    tokens_remaining = tokens_remaining - p_amount,
    tokens_used = tokens_used + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User tokens not found';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_and_deduct_tokens(p_user_id uuid, p_feature text, p_provider text, p_model text, p_prompt_tokens integer, p_completion_tokens integer, p_multiplier numeric DEFAULT 2.0, p_request_metadata jsonb DEFAULT '{}'::jsonb, p_response_metadata jsonb DEFAULT '{}'::jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
DECLARE
v_total_tokens integer;
v_final_cost integer;
v_current_balance integer;
v_remaining_balance integer;
v_log_id uuid;
BEGIN
v_total_tokens := p_prompt_tokens + p_completion_tokens;

v_final_cost := GREATEST(
CAST((v_total_tokens * p_multiplier) AS integer),
50
);

SELECT tokens_balance INTO v_current_balance
FROM users
WHERE id = p_user_id;

IF NOT FOUND THEN
RAISE EXCEPTION 'User not found';
END IF;

IF v_current_balance < v_final_cost THEN
INSERT INTO ai_usage_logs (
user_id,
feature,
provider,
model,
prompt_tokens,
completion_tokens,
total_tokens,
multiplier,
final_cost,
status,
error_message,
request_metadata,
response_metadata
) VALUES (
p_user_id,
p_feature,
p_provider,
p_model,
p_prompt_tokens,
p_completion_tokens,
v_total_tokens,
p_multiplier,
v_final_cost,
'insufficient_tokens',
'User does not have sufficient token balance',
p_request_metadata,
p_response_metadata
);

RETURN jsonb_build_object(
'success', false,
'error', 'insufficient_tokens',
'required', v_final_cost,
'available', v_current_balance
);
END IF;

UPDATE users
SET 
tokens_balance = tokens_balance - v_final_cost,
updated_at = now()
WHERE id = p_user_id;

v_remaining_balance := v_current_balance - v_final_cost;

INSERT INTO ai_usage_logs (
user_id,
feature,
provider,
model,
prompt_tokens,
completion_tokens,
total_tokens,
multiplier,
final_cost,
status,
request_metadata,
response_metadata
) VALUES (
p_user_id,
p_feature,
p_provider,
p_model,
p_prompt_tokens,
p_completion_tokens,
v_total_tokens,
p_multiplier,
v_final_cost,
'success',
p_request_metadata,
p_response_metadata
)
RETURNING id INTO v_log_id;

RETURN jsonb_build_object(
'success', true,
'log_id', v_log_id,
'tokens_deducted', v_final_cost,
'tokens_remaining', v_remaining_balance,
'prompt_tokens', p_prompt_tokens,
'completion_tokens', p_completion_tokens,
'total_tokens', v_total_tokens,
'multiplier', p_multiplier
);

EXCEPTION WHEN OTHERS THEN
RAISE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_plot_templates_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_scene_word_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
IF NEW.content IS NOT NULL THEN
NEW.word_count = array_length(regexp_split_to_array(trim(regexp_replace(NEW.content, '<[^>]+>', '', 'g')), '\s+'), 1);
IF NEW.word_count IS NULL THEN
NEW.word_count = 0;
END IF;
ELSE
NEW.word_count = 0;
END IF;
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
INSERT INTO public.users (
id,
email,
password_hash,
role,
email_verified,
first_name,
last_name,
pen_name,
locale,
plan,
tokens_balance,
created_at,
updated_at
)
VALUES (
NEW.id,
NEW.email,
'',
'writer',
NEW.email_confirmed_at IS NOT NULL,
COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
COALESCE(NEW.raw_user_meta_data->>'pen_name', ''),
COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
'free',
5000,
NEW.created_at,
NEW.updated_at
)
ON CONFLICT (id) DO NOTHING;

RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_project_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_logline_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_chapter_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_chapter_word_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
IF NEW.content IS NOT NULL THEN
NEW.word_count = array_length(regexp_split_to_array(trim(NEW.content), '\s+'), 1);
IF NEW.word_count IS NULL THEN
NEW.word_count = 0;
END IF;
ELSE
NEW.word_count = 0;
END IF;
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_logline_word_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
IF NEW.content IS NOT NULL THEN
NEW.word_count = array_length(regexp_split_to_array(trim(regexp_replace(NEW.content, '<[^>]+>', '', 'g')), '\s+'), 1);
IF NEW.word_count IS NULL THEN
NEW.word_count = 0;
END IF;
ELSE
NEW.word_count = 0;
END IF;
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_scene_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_task_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_character_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_session_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_goal_reached()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
DECLARE
daily_goal integer;
schedule_enabled boolean;
scheduled_days integer[];
day_of_week integer;
BEGIN
SELECT 
(writing_schedule->>'dailyGoal')::integer,
COALESCE((writing_schedule->>'enabled')::boolean, false),
COALESCE(
(SELECT array_agg(value::integer) 
FROM jsonb_array_elements_text(writing_schedule->'days')),
ARRAY[]::integer[]
)
INTO daily_goal, schedule_enabled, scheduled_days
FROM projects
WHERE id = NEW.project_id;

day_of_week = EXTRACT(DOW FROM NEW.session_date)::integer;

IF schedule_enabled 
AND daily_goal IS NOT NULL 
AND daily_goal > 0 
AND day_of_week = ANY(scheduled_days)
AND NEW.words_written >= daily_goal 
AND NEW.goal_reached = false THEN
NEW.goal_reached = true;
NEW.goal_reached_at = now();
END IF;

RETURN NEW;
END;
$function$;
