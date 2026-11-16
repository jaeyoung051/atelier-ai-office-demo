ALTER TABLE operation_documents ADD COLUMN schedule_document_id TEXT REFERENCES operation_documents(id) ON DELETE RESTRICT;
ALTER TABLE operation_documents ADD COLUMN schedule_revision INTEGER;
ALTER TABLE operation_documents ADD COLUMN schedule_step INTEGER;
CREATE INDEX operation_schedule ON operation_documents(schedule_document_id);
CREATE TABLE order_schedule_changes (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES operation_documents(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL CHECK(revision>1),
 previous_json TEXT NOT NULL CHECK(json_valid(previous_json)),
 next_json TEXT NOT NULL CHECK(json_valid(next_json)),
 comment TEXT NOT NULL CHECK(length(comment)>0),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(order_id,revision)
) STRICT;
