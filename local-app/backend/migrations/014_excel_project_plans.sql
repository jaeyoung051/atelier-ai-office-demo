CREATE TABLE estimate_workbooks (
 id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
 original_name TEXT NOT NULL,
 sha256 TEXT NOT NULL,
 bytes BLOB NOT NULL,
 preview_json TEXT NOT NULL CHECK(json_valid(preview_json)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(project_id,sha256)
) STRICT;
CREATE INDEX idx_estimate_workbooks_project ON estimate_workbooks(project_id,created_at);
CREATE TABLE project_plans (
 id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
 workbook_id TEXT NOT NULL REFERENCES estimate_workbooks(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 title TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'review' CHECK(status IN ('review','approved','rejected')),
 source_json TEXT NOT NULL CHECK(json_valid(source_json)),
 body_json TEXT NOT NULL CHECK(json_valid(body_json)),
 assumptions_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(assumptions_confirmed IN (0,1)),
 request_key TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX idx_project_plans_project ON project_plans(project_id,updated_at);
CREATE TABLE project_plan_versions (
 plan_id TEXT NOT NULL REFERENCES project_plans(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL CHECK(revision>0),
 title TEXT NOT NULL,
 body_json TEXT NOT NULL CHECK(json_valid(body_json)),
 assumptions_confirmed INTEGER NOT NULL CHECK(assumptions_confirmed IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(plan_id,revision)
) STRICT;
CREATE TABLE project_plan_reviews (
 id TEXT PRIMARY KEY,
 plan_id TEXT NOT NULL,
 revision INTEGER NOT NULL,
 decision TEXT NOT NULL CHECK(decision IN ('approved','rejected')),
 comment TEXT NOT NULL DEFAULT '',
 snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 FOREIGN KEY(plan_id,revision) REFERENCES project_plan_versions(plan_id,revision) ON DELETE RESTRICT
) STRICT;
