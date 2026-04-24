ALTER TABLE project_collaborators
DROP CONSTRAINT IF EXISTS project_collaborators_status_check;

ALTER TABLE project_collaborators
ADD CONSTRAINT project_collaborators_status_check
CHECK (status IN ('pending', 'active', 'frozen', 'rejected'));
