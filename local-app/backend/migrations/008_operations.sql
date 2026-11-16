CREATE TABLE materials_catalog (
 id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK(length(name)>0), unit TEXT NOT NULL,
 supplier TEXT NOT NULL DEFAULT '', price_won INTEGER NOT NULL CHECK(price_won>=0),
 lead_days INTEGER NOT NULL DEFAULT 0 CHECK(lead_days BETWEEN 0 AND 365), revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE TABLE operation_documents (
 id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
 kind TEXT NOT NULL CHECK(kind IN ('estimate','schedule','order')), title TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'review' CHECK(status IN ('review','approved','rejected','ordered','received')),
 body_json TEXT NOT NULL CHECK(json_valid(body_json)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX operations_project_kind ON operation_documents(project_id,kind,created_at);
CREATE TABLE operation_reviews (
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES operation_documents(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('approved','rejected','ordered','received')),
 comment TEXT NOT NULL, snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(document_id,revision,decision)
) STRICT;
INSERT INTO materials_catalog(id,name,unit,supplier,price_won,lead_days) VALUES
 ('demo-floor','[가상] 바닥재','㎡','가상 공급처',25000,5),
 ('demo-tile','[가상] 타일','㎡','가상 공급처',30000,7),
 ('demo-light','[가상] 조명','개','가상 공급처',45000,3);
