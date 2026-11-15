CREATE TABLE channel_posts(
 id TEXT PRIMARY KEY,task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
 channel TEXT NOT NULL CHECK(channel IN ('instagram','blog','threads')),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),title TEXT NOT NULL DEFAULT '',body TEXT NOT NULL,
 hashtags TEXT NOT NULL DEFAULT '',photos_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(photos_json) AND json_type(photos_json)='array'),
 status TEXT NOT NULL DEFAULT 'review' CHECK(status IN ('review','approved','rejected','posted')),
 posted_url TEXT,created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),updated_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),UNIQUE(task_id,channel)
) STRICT;
CREATE TABLE channel_post_reviews(
 id TEXT PRIMARY KEY,post_id TEXT NOT NULL REFERENCES channel_posts(id) ON DELETE RESTRICT,revision INTEGER NOT NULL,
 decision TEXT NOT NULL CHECK(decision IN ('approved','rejected')),comment TEXT NOT NULL DEFAULT '',snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX idx_channel_reviews ON channel_post_reviews(post_id,revision);
CREATE TRIGGER channel_review_immutable_update BEFORE UPDATE ON channel_post_reviews BEGIN SELECT RAISE(ABORT,'append-only history'); END;
CREATE TRIGGER channel_review_immutable_delete BEFORE DELETE ON channel_post_reviews BEGIN SELECT RAISE(ABORT,'append-only history'); END;
CREATE TRIGGER channel_post_revision BEFORE UPDATE ON channel_posts
WHEN (NEW.title<>OLD.title OR NEW.body<>OLD.body OR NEW.hashtags<>OLD.hashtags OR NEW.photos_json<>OLD.photos_json)
 AND (NEW.revision<>OLD.revision+1 OR NEW.status<>'review' OR NEW.posted_url IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'changed content requires new review'); END;
