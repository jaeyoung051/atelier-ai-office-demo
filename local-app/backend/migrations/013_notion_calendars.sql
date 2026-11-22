CREATE TABLE notion_calendar_events(
 id TEXT PRIMARY KEY,title TEXT NOT NULL,categories_json TEXT NOT NULL CHECK(json_valid(categories_json)),
 start_date TEXT,end_date TEXT,start_raw TEXT,end_raw TEXT,url TEXT NOT NULL,
 remote_project TEXT NOT NULL DEFAULT '',source_id TEXT NOT NULL,last_edited_time TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX notion_calendar_dates ON notion_calendar_events(start_date,end_date);
CREATE TABLE notion_calendar_project_links(event_id TEXT PRIMARY KEY REFERENCES notion_calendar_events(id) ON DELETE CASCADE,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT) STRICT;
CREATE TABLE notion_calendar_sync(id INTEGER PRIMARY KEY CHECK(id=1),source_id TEXT NOT NULL,last_success TEXT NOT NULL,event_count INTEGER NOT NULL) STRICT;
