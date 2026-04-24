/*
  # Add individual character fields and dialect to project_characters

  ## Changes
  - Add individual character fields (age, gender, residence, likes, dislikes, life_goal, 
    psychological_issue, childhood_trauma, trauma_impact_adulthood, education, job, 
    work_relationships, neighbor_relationships, clothing_style, speech_style)
  - Add dialect field for the character's spoken dialect in the project
  - Keep existing aggregated fields (description, personality_traits, background, speaking_style, goals, fears) for backwards compatibility

  ## Reason
  The modal was saving data into aggregated text fields but trying to read it back as individual fields,
  causing data to appear blank when editing. Individual fields allow proper round-trip save/load.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'age') THEN
    ALTER TABLE project_characters ADD COLUMN age text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'gender') THEN
    ALTER TABLE project_characters ADD COLUMN gender text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'residence') THEN
    ALTER TABLE project_characters ADD COLUMN residence text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'likes') THEN
    ALTER TABLE project_characters ADD COLUMN likes text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'dislikes') THEN
    ALTER TABLE project_characters ADD COLUMN dislikes text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'life_goal') THEN
    ALTER TABLE project_characters ADD COLUMN life_goal text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'psychological_issue') THEN
    ALTER TABLE project_characters ADD COLUMN psychological_issue text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'childhood_trauma') THEN
    ALTER TABLE project_characters ADD COLUMN childhood_trauma text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'trauma_impact_adulthood') THEN
    ALTER TABLE project_characters ADD COLUMN trauma_impact_adulthood text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'education') THEN
    ALTER TABLE project_characters ADD COLUMN education text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'job') THEN
    ALTER TABLE project_characters ADD COLUMN job text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'work_relationships') THEN
    ALTER TABLE project_characters ADD COLUMN work_relationships text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'neighbor_relationships') THEN
    ALTER TABLE project_characters ADD COLUMN neighbor_relationships text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'clothing_style') THEN
    ALTER TABLE project_characters ADD COLUMN clothing_style text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'speech_style') THEN
    ALTER TABLE project_characters ADD COLUMN speech_style text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_characters' AND column_name = 'dialect') THEN
    ALTER TABLE project_characters ADD COLUMN dialect text DEFAULT '';
  END IF;
END $$;
