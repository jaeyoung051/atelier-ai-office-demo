ALTER TABLE portfolios ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(tags_json) AND json_type(tags_json)='array');
ALTER TABLE portfolios ADD COLUMN materials TEXT NOT NULL DEFAULT '';
ALTER TABLE portfolios ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN (0,1));
ALTER TABLE tasks ADD COLUMN portfolio_id TEXT REFERENCES portfolios(id) ON DELETE RESTRICT;
ALTER TABLE tasks ADD COLUMN portfolio_snapshot TEXT;
CREATE INDEX idx_tasks_portfolio ON tasks(portfolio_id);
