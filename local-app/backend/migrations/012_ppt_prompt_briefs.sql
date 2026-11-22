CREATE TABLE ppt_source_files(media_id TEXT PRIMARY KEY REFERENCES media_files(id) ON DELETE RESTRICT,created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))) STRICT;
CREATE TABLE ppt_prompt_briefs(
 id TEXT PRIMARY KEY, title TEXT NOT NULL, request_json TEXT NOT NULL CHECK(json_valid(request_json)),
 status TEXT NOT NULL CHECK(status IN ('running','ready','failed')),model TEXT NOT NULL,
 analysis_json TEXT CHECK(analysis_json IS NULL OR json_valid(analysis_json)),prompt TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1,reviewed INTEGER NOT NULL DEFAULT 0 CHECK(reviewed IN (0,1)),error_code TEXT,
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),updated_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE TABLE ppt_brief_files(brief_id TEXT NOT NULL REFERENCES ppt_prompt_briefs(id) ON DELETE RESTRICT,media_id TEXT NOT NULL REFERENCES ppt_source_files(media_id) ON DELETE RESTRICT,position INTEGER NOT NULL CHECK(position>=1),PRIMARY KEY(brief_id,media_id),UNIQUE(brief_id,position)) STRICT;
