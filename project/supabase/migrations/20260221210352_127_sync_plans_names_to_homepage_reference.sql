/*
  # Sync Plans Table Names to Homepage Reference

  The homepage_content table is the source of truth for plan display names.
  This migration updates the plans table name_ar and name_en columns to match.

  Changes:
  - free:  name_ar → "كاتب هاوي",   name_en → "Hobbyist Writer"
  - pro:   name_ar → "كاتب جاد",    name_en → "Serious Writer"
  - max:   name_ar → "كاتب محترف",  name_en → "Professional Writer"
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'name_en') THEN
    UPDATE plans SET name_ar = 'كاتب هاوي',  name_en = 'Hobbyist Writer'    WHERE name = 'free';
    UPDATE plans SET name_ar = 'كاتب جاد',   name_en = 'Serious Writer'     WHERE name = 'pro';
    UPDATE plans SET name_ar = 'كاتب محترف', name_en = 'Professional Writer' WHERE name = 'max';
  ELSE
    UPDATE plans SET name_ar = 'كاتب هاوي'  WHERE name = 'free';
    UPDATE plans SET name_ar = 'كاتب جاد'   WHERE name = 'pro';
    UPDATE plans SET name_ar = 'كاتب محترف' WHERE name = 'max';
  END IF;
END $$;
