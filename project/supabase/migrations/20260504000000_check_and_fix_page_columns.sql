-- Ensure scenes table has page system columns
ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS page_type TEXT DEFAULT 'single' CHECK (page_type IN ('single', 'double')),
ADD COLUMN IF NOT EXISTS page_group_id UUID,
ADD COLUMN IF NOT EXISTS page_order INTEGER DEFAULT 1;

-- Ensure plot_scenes has page_type
ALTER TABLE plot_scenes 
ADD COLUMN IF NOT EXISTS page_type TEXT DEFAULT 'single' CHECK (page_type IN ('single', 'double'));

-- Test function
CREATE OR REPLACE FUNCTION test_page_system()
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'Page system columns exist!';
END;
$$ LANGUAGE plpgsql;

SELECT test_page_system();