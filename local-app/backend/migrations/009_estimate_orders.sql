ALTER TABLE operation_documents ADD COLUMN source_document_id TEXT REFERENCES operation_documents(id) ON DELETE RESTRICT;
ALTER TABLE operation_documents ADD COLUMN source_revision INTEGER;
ALTER TABLE operation_documents ADD COLUMN source_item INTEGER;
CREATE UNIQUE INDEX operation_order_source ON operation_documents(source_document_id,source_revision,source_item) WHERE source_document_id IS NOT NULL;
CREATE INDEX operation_source ON operation_documents(source_document_id);
