BEGIN;
CREATE TABLE IF NOT EXISTS knowledge_sources (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, source_ref TEXT NOT NULL, object_ref TEXT NOT NULL,
 object_version TEXT NOT NULL, checksum TEXT NOT NULL, normalized_hash TEXT NOT NULL, content_type TEXT NOT NULL,
 permission_version TEXT NOT NULL, retention_until TIMESTAMPTZ, legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
 status TEXT NOT NULL DEFAULT 'received', idempotency_key TEXT NOT NULL, created_by TEXT NOT NULL,
 captured_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,source_ref,object_version), UNIQUE(tenant_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS knowledge_source_acl (
 tenant_id TEXT NOT NULL, source_ref TEXT NOT NULL, object_version TEXT NOT NULL, principal_ref TEXT NOT NULL,
 permission TEXT NOT NULL CHECK(permission IN ('read','review','manage')), granted_by TEXT NOT NULL,
 granted_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,source_ref,object_version,principal_ref,permission)
);
CREATE TABLE IF NOT EXISTS knowledge_chunks (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, source_ref TEXT NOT NULL, object_version TEXT NOT NULL,
 chunk_ref TEXT NOT NULL, locator TEXT NOT NULL, content_checksum TEXT NOT NULL, index_status TEXT NOT NULL DEFAULT 'queued',
 index_receipt TEXT, attempt_count INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ,
 UNIQUE(tenant_id,source_ref,object_version,chunk_ref)
);
CREATE TABLE IF NOT EXISTS grounded_answers (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, answer_ref TEXT NOT NULL, principal_ref TEXT NOT NULL,
 query_checksum TEXT NOT NULL, dataset_version TEXT NOT NULL, answer_text TEXT, abstained BOOLEAN NOT NULL,
 abstention_reason TEXT, freshness_cutoff TIMESTAMPTZ NOT NULL, conflicts JSONB NOT NULL DEFAULT '[]'::jsonb,
 feedback_status TEXT NOT NULL DEFAULT 'unreviewed', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(tenant_id,answer_ref)
);
CREATE TABLE IF NOT EXISTS answer_citations (
 tenant_id TEXT NOT NULL, answer_ref TEXT NOT NULL, source_ref TEXT NOT NULL, object_version TEXT NOT NULL,
 locator TEXT NOT NULL, resolved BOOLEAN NOT NULL DEFAULT FALSE, PRIMARY KEY(tenant_id,answer_ref,source_ref,object_version,locator)
);
CREATE TABLE IF NOT EXISTS retrieval_evaluations (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, dataset_version TEXT NOT NULL, case_ref TEXT NOT NULL,
 recall NUMERIC(6,5), faithfulness NUMERIC(6,5), citation_resolution NUMERIC(6,5), injection_resisted BOOLEAN NOT NULL,
 freshness_passed BOOLEAN NOT NULL, conflict_action TEXT NOT NULL, evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,dataset_version,case_ref)
);
CREATE TABLE IF NOT EXISTS knowledge_deletion_receipts (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, source_ref TEXT NOT NULL, provider TEXT NOT NULL,
 idempotency_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', receipt TEXT, attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at TIMESTAMPTZ, last_error TEXT, UNIQUE(tenant_id,provider,idempotency_key)
);
CREATE TABLE IF NOT EXISTS knowledge_workflow_audit (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, source_ref TEXT NOT NULL, from_status TEXT, to_status TEXT NOT NULL,
 actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, reason TEXT NOT NULL, evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
 correlation_id TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_queue ON knowledge_chunks(index_status,next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_retention ON knowledge_sources(retention_until) WHERE legal_hold = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_knowledge_audit_correlation ON knowledge_workflow_audit(tenant_id,source_ref,correlation_id);
COMMIT;
