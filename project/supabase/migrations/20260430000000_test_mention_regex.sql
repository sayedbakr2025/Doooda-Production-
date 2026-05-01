DO $$
DECLARE
  v_text text := '@[alice] Hello @[bob]';
  v_match text;
BEGIN
  RAISE NOTICE 'Test content: %', v_text;
  FOR v_match IN SELECT (regexp_matches(v_text, '@\\[([^\\]]+)\\]', 'g'))[1] LOOP
    RAISE NOTICE 'Found mention: %', v_match;
  END LOOP;
END;
$$;
