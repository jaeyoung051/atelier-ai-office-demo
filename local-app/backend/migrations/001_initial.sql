CREATE TABLE ai_employees (created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL CHECK(length(trim(name))>0), provider TEXT NOT NULL CHECK(provider IN ('Claude','ChatGPT','Gemini','mock')), model TEXT NOT NULL DEFAULT 'unconfigured', config_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(config_json) AND json_type(config_json)='object'), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))) STRICT;

CREATE TABLE role_instructions (created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), id TEXT PRIMARY KEY, employee_id TEXT NOT NULL REFERENCES ai_employees(id) ON DELETE RESTRICT, version INTEGER NOT NULL CHECK(version>0), goal TEXT NOT NULL, responsibilities TEXT NOT NULL, inputs TEXT NOT NULL, procedure TEXT NOT NULL, outputs TEXT NOT NULL, review TEXT NOT NULL, cautions TEXT NOT NULL, approval_conditions TEXT NOT NULL, UNIQUE(employee_id,version)) STRICT;

CREATE TABLE business_rules (created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), id TEXT PRIMARY KEY, rule_key TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('customer','estimate_material','process_order','sns_portfolio','proposal','security')), title TEXT NOT NULL CHECK(length(trim(title))>0), body TEXT NOT NULL CHECK(length(trim(body))>0), version INTEGER NOT NULL CHECK(version>0), archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)), UNIQUE(rule_key,version)) STRICT;

CREATE TABLE projects (created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK(length(trim(name))>0), customer_alias TEXT, site_summary TEXT, status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning','active','completed','archived'))) STRICT;

CREATE TABLE portfolios (created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', area_m2 REAL CHECK(area_m2>=0), publication_consent INTEGER NOT NULL DEFAULT 0 CHECK(publication_consent IN (0,1))) STRICT;

CREATE TABLE media_files (created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), id TEXT PRIMARY KEY, storage_path TEXT NOT NULL UNIQUE CHECK(length(storage_path)>0 AND substr(storage_path,1,1)<>'/' AND instr(storage_path,'..')=0 AND instr(storage_path,':')=0 AND instr(storage_path,char(92))=0), original_name TEXT NOT NULL, mime_type TEXT NOT NULL, byte_size INTEGER NOT NULL CHECK(byte_size>=0), sha256 TEXT CHECK(sha256 IS NULL OR (length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*')), metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json) AND json_type(metadata_json)='object')) STRICT;

CREATE TABLE portfolio_media (created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), id TEXT PRIMARY KEY, portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE, media_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE RESTRICT, sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order>=0), UNIQUE(portfolio_id,media_id)) STRICT;

CREATE TABLE project_media (created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, media_id TEXT NOT NULL REFERENCES media_files(id) ON DELETE RESTRICT, UNIQUE(project_id,media_id)) STRICT;

CREATE TABLE tasks (created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT, employee_id TEXT NOT NULL REFERENCES ai_employees(id) ON DELETE RESTRICT, role_instruction_id TEXT REFERENCES role_instructions(id) ON DELETE RESTRICT, title TEXT NOT NULL, input_text TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','review','approved','rejected','failed','cancelled')), result TEXT NOT NULL DEFAULT '', result_version INTEGER NOT NULL DEFAULT 0 CHECK(result_version>=0)) STRICT;

CREATE TABLE task_business_rules (created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, rule_id TEXT NOT NULL REFERENCES business_rules(id) ON DELETE RESTRICT, UNIQUE(task_id,rule_id)) STRICT;

CREATE TABLE approvals (created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, result_version INTEGER NOT NULL CHECK(result_version>0), result_snapshot TEXT NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('approved','rejected')), reviewer TEXT NOT NULL CHECK(length(trim(reviewer))>0), comment TEXT NOT NULL DEFAULT '') STRICT;
CREATE TRIGGER ai_employees_updated AFTER UPDATE ON ai_employees WHEN NEW.updated_at=OLD.updated_at BEGIN UPDATE ai_employees SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;
CREATE TRIGGER projects_updated AFTER UPDATE ON projects WHEN NEW.updated_at=OLD.updated_at BEGIN UPDATE projects SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;
CREATE TRIGGER portfolios_updated AFTER UPDATE ON portfolios WHEN NEW.updated_at=OLD.updated_at BEGIN UPDATE portfolios SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;
CREATE TRIGGER media_files_updated AFTER UPDATE ON media_files WHEN NEW.updated_at=OLD.updated_at BEGIN UPDATE media_files SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;
CREATE TRIGGER portfolio_media_updated AFTER UPDATE ON portfolio_media WHEN NEW.updated_at=OLD.updated_at BEGIN UPDATE portfolio_media SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;
CREATE TRIGGER project_media_updated AFTER UPDATE ON project_media WHEN NEW.updated_at=OLD.updated_at BEGIN UPDATE project_media SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;
CREATE TRIGGER tasks_updated AFTER UPDATE ON tasks WHEN NEW.updated_at=OLD.updated_at BEGIN UPDATE tasks SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;
CREATE TRIGGER task_business_rules_updated AFTER UPDATE ON task_business_rules WHEN NEW.updated_at=OLD.updated_at BEGIN UPDATE task_business_rules SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;
CREATE TRIGGER approvals_no_update BEFORE UPDATE ON approvals BEGIN SELECT RAISE(ABORT,'append-only history'); END;
CREATE TRIGGER approvals_no_delete BEFORE DELETE ON approvals BEGIN SELECT RAISE(ABORT,'append-only history'); END;
CREATE TRIGGER role_instructions_no_update BEFORE UPDATE ON role_instructions BEGIN SELECT RAISE(ABORT,'append-only history'); END;
CREATE TRIGGER role_instructions_no_delete BEFORE DELETE ON role_instructions BEGIN SELECT RAISE(ABORT,'append-only history'); END;
CREATE TRIGGER business_rules_no_update BEFORE UPDATE ON business_rules BEGIN SELECT RAISE(ABORT,'append-only history'); END;
CREATE TRIGGER business_rules_no_delete BEFORE DELETE ON business_rules BEGIN SELECT RAISE(ABORT,'append-only history'); END;
CREATE INDEX idx_role_instructions_employee_id ON role_instructions(employee_id);
CREATE INDEX idx_portfolios_project_id ON portfolios(project_id);
CREATE INDEX idx_project_media_media_id ON project_media(media_id);
CREATE INDEX idx_portfolio_media_media_id ON portfolio_media(media_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_employee_id_status ON tasks(employee_id,status);
CREATE INDEX idx_tasks_role_instruction_id ON tasks(role_instruction_id);
CREATE INDEX idx_task_business_rules_rule_id ON task_business_rules(rule_id);
CREATE INDEX idx_approvals_task_id_created_at ON approvals(task_id,created_at);

CREATE TRIGGER task_role_insert BEFORE INSERT ON tasks WHEN NEW.role_instruction_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM role_instructions WHERE id=NEW.role_instruction_id AND employee_id=NEW.employee_id) BEGIN SELECT RAISE(ABORT,'role employee mismatch'); END;
CREATE TRIGGER task_role_update BEFORE UPDATE ON tasks WHEN NEW.role_instruction_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM role_instructions WHERE id=NEW.role_instruction_id AND employee_id=NEW.employee_id) BEGIN SELECT RAISE(ABORT,'role employee mismatch'); END;
CREATE TRIGGER approval_validate BEFORE INSERT ON approvals WHEN NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.task_id AND status='review' AND result_version=NEW.result_version AND result=NEW.result_snapshot) BEGIN SELECT RAISE(ABORT,'approval must match current review result'); END;
CREATE TRIGGER approval_apply AFTER INSERT ON approvals BEGIN UPDATE tasks SET status=NEW.decision WHERE id=NEW.task_id; END;
CREATE TRIGGER task_decision_guard BEFORE UPDATE OF status ON tasks WHEN NEW.status IN ('approved','rejected') AND NOT EXISTS(SELECT 1 FROM approvals WHERE task_id=NEW.id AND result_version=NEW.result_version AND result_snapshot=NEW.result AND decision=NEW.status) BEGIN SELECT RAISE(ABORT,'approval record required'); END;
CREATE TRIGGER task_insert_guard BEFORE INSERT ON tasks WHEN NEW.status IN ('approved','rejected') BEGIN SELECT RAISE(ABORT,'approval record required'); END;
CREATE TRIGGER task_result_version BEFORE UPDATE ON tasks WHEN NEW.result<>OLD.result AND (NEW.result_version<>OLD.result_version+1 OR NEW.status<>'review') BEGIN SELECT RAISE(ABORT,'new result requires next version and review'); END;
