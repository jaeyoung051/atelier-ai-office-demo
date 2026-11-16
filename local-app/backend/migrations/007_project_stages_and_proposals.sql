ALTER TABLE projects ADD COLUMN lifecycle_stage TEXT NOT NULL DEFAULT 'sales' CHECK(lifecycle_stage IN ('sales','contracted','construction','completed'));
ALTER TABLE projects ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0);
UPDATE projects SET lifecycle_stage=CASE status WHEN 'active' THEN 'construction' WHEN 'completed' THEN 'completed' ELSE 'sales' END;
CREATE INDEX idx_projects_lifecycle ON projects(lifecycle_stage,created_at);
ALTER TABLE tasks ADD COLUMN kind TEXT NOT NULL DEFAULT 'general' CHECK(kind IN ('general','proposal','marketing'));
UPDATE tasks SET kind=CASE WHEN portfolio_id IS NOT NULL THEN 'marketing' WHEN title LIKE '%제안서%' THEN 'proposal' ELSE 'general' END;
CREATE INDEX idx_tasks_kind_project ON tasks(kind,project_id,created_at);
