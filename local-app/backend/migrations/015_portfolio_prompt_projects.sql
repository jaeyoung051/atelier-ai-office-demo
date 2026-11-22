ALTER TABLE ppt_prompt_briefs ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT;
ALTER TABLE ppt_prompt_briefs ADD COLUMN purpose TEXT NOT NULL DEFAULT 'proposal' CHECK(purpose IN ('proposal','portfolio'));
CREATE INDEX idx_ppt_portfolio_project ON ppt_prompt_briefs(project_id,purpose,status);
