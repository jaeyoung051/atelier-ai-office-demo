CREATE TABLE post_rewrites(
 id TEXT PRIMARY KEY,post_id TEXT NOT NULL REFERENCES channel_posts(id) ON DELETE RESTRICT,
 source_revision INTEGER NOT NULL CHECK(source_revision>0),result_revision INTEGER,
 status TEXT NOT NULL CHECK(status IN ('running','completed','failed')),
 provider TEXT NOT NULL,model TEXT NOT NULL,rejection_comment TEXT NOT NULL,
 source_body TEXT NOT NULL,output_body TEXT,input_snapshot TEXT NOT NULL CHECK(json_valid(input_snapshot)),error_code TEXT,
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),completed_at TEXT
) STRICT;
CREATE INDEX idx_rewrites_post ON post_rewrites(post_id,created_at);
CREATE UNIQUE INDEX idx_one_running_rewrite ON post_rewrites(post_id) WHERE status='running';
