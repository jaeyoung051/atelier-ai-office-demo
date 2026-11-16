CREATE TABLE proposal_briefs (
 id TEXT PRIMARY KEY, task_id TEXT UNIQUE REFERENCES tasks(id) ON DELETE RESTRICT,
 project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
 request_json TEXT NOT NULL CHECK(json_valid(request_json)),
 source_json TEXT NOT NULL CHECK(json_valid(source_json)), input_text TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX proposal_briefs_project ON proposal_briefs(project_id);
CREATE TABLE proposal_versions (
 id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL, body TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE(task_id,version)
) STRICT;
