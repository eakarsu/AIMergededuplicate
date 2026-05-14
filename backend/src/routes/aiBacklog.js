// Apply pass 5 — backlog (categorized).
//
// ENV VARS used by NEEDS-CREDS endpoints (each returns 503 + { missing: <ENV> } when unset):
//   IMAGE_EMBED_API_KEY        — vision embedding provider (image-similarity)
//   SHOPIFY_API_TOKEN          — Shopify Admin API
//   WOOCOMMERCE_API_KEY        — WooCommerce REST
//   INVENTORY_WEBHOOK_SECRET   — inbound inventory sync webhook auth
//
// PRODUCT-DECISION endpoints implement small, additive synchronous handlers
// with reasonable defaults instead of waiting for full schemas. State is
// process-local (in-memory) — durable state requires schema decisions out of scope.
// TOO-RISKY items are exposed as DRY-RUN.

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

function envHas(name) {
  const v = process.env[name];
  if (!v) return false;
  if (/^your[_-]?/i.test(v)) return false;
  if (v === 'dummy' || v === 'changeme') return false;
  return true;
}

// ============================================================================
// 1. NEEDS-CREDS — Image similarity via vision embeddings.
//    In-memory hash stub mirrors the API shape so FE can wire up,
//    but real similarity is gated on the credential.
// ============================================================================
router.post('/image-similarity', (req, res) => {
  if (!envHas('IMAGE_EMBED_API_KEY')) {
    return res.status(503).json({ error: 'Image embedding provider unavailable', missing: 'IMAGE_EMBED_API_KEY' });
  }
  // PRODUCT-DECISION: even with a key present we don't ship a vision SDK in this pass.
  return res.status(503).json({ error: 'Image embedding integration deferred (creds present)', missing: 'IMAGE_EMBED_API_KEY' });
});

// ============================================================================
// 2. NEEDS-CREDS — Shopify catalog sync.
// ============================================================================
router.post('/shopify/sync', (req, res) => {
  if (!envHas('SHOPIFY_API_TOKEN')) {
    return res.status(503).json({ error: 'Shopify integration unavailable', missing: 'SHOPIFY_API_TOKEN' });
  }
  return res.status(503).json({ error: 'Shopify Admin API not bundled (creds present, deferred)', missing: 'SHOPIFY_API_TOKEN' });
});

// ============================================================================
// 3. NEEDS-CREDS — WooCommerce catalog sync.
// ============================================================================
router.post('/woocommerce/sync', (req, res) => {
  if (!envHas('WOOCOMMERCE_API_KEY')) {
    return res.status(503).json({ error: 'WooCommerce integration unavailable', missing: 'WOOCOMMERCE_API_KEY' });
  }
  return res.status(503).json({ error: 'WooCommerce REST not bundled (creds present, deferred)', missing: 'WOOCOMMERCE_API_KEY' });
});

// ============================================================================
// 4. NEEDS-CREDS — Inventory sync webhook receiver.
// ============================================================================
router.post('/inventory/sync', (req, res) => {
  if (!envHas('INVENTORY_WEBHOOK_SECRET')) {
    return res.status(503).json({ error: 'Inventory sync unavailable', missing: 'INVENTORY_WEBHOOK_SECRET' });
  }
  return res.status(503).json({ error: 'Inventory webhook handler not bundled (secret present, deferred)', missing: 'INVENTORY_WEBHOOK_SECRET' });
});

// ============================================================================
// 5. NEEDS-PRODUCT-DECISION — Image deduplication (perceptual-hash variant).
//    PRODUCT-DECISION: Use a simple hex-prefix similarity (Hamming distance on
//    short hex strings) as a placeholder. Real impl should choose between
//    pHash, dHash, and embedding-based; that decision affects storage tier.
// ============================================================================
router.post('/image-dedup', (req, res) => {
  const { hashes } = req.body || {};
  if (!Array.isArray(hashes) || hashes.length < 2) {
    return res.status(400).json({ error: 'hashes[] (>=2) is required' });
  }
  const groups = [];
  const seen = new Set();
  for (let i = 0; i < hashes.length; i++) {
    if (seen.has(i)) continue;
    const a = String(hashes[i]);
    const group = [i];
    for (let j = i + 1; j < hashes.length; j++) {
      if (seen.has(j)) continue;
      const b = String(hashes[j]);
      const len = Math.min(a.length, b.length);
      let same = 0;
      for (let k = 0; k < len; k++) if (a[k] === b[k]) same++;
      const sim = len ? same / len : 0;
      if (sim >= 0.9) { group.push(j); seen.add(j); }
    }
    if (group.length > 1) groups.push(group);
    seen.add(i);
  }
  return res.json({ groups, threshold: 0.9, algorithm: 'hex-prefix-stub' });
});

// ============================================================================
// 6. NEEDS-PRODUCT-DECISION — Bulk edit workflow (in-memory plan).
//    PRODUCT-DECISION: We compute a "preview" of the edit on the client-supplied
//    products without touching the DB. A real impl needs a transaction model
//    (per-row commit vs. all-or-nothing) and rollback storage.
// ============================================================================
router.post('/bulk-edit/preview', (req, res) => {
  const { products, patch } = req.body || {};
  if (!Array.isArray(products) || !patch) {
    return res.status(400).json({ error: 'products[] and patch are required' });
  }
  const preview = products.map((p) => ({
    id: p.id,
    before: p,
    after: { ...p, ...patch },
    changedKeys: Object.keys(patch).filter((k) => p[k] !== patch[k]),
  }));
  return res.json({ count: preview.length, preview, applied: false, mode: 'dry-run' });
});

// ============================================================================
// 7. NEEDS-PRODUCT-DECISION — Merge preview / approval workflow (in-memory).
//    PRODUCT-DECISION: state machine = pending → approved | rejected. No
//    persistence; FE owns presentation. A future revision should land on a
//    `merge_proposals` table once the approval surface is decided.
// ============================================================================
const MERGE_PROPOSALS = new Map();
router.post('/merge/proposals', (req, res) => {
  const { primary, duplicates, notes } = req.body || {};
  if (!primary || !Array.isArray(duplicates) || duplicates.length === 0) {
    return res.status(400).json({ error: 'primary and duplicates[] are required' });
  }
  const id = `mp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const proposal = { id, primary, duplicates, notes: notes || null, status: 'pending', createdAt: new Date().toISOString() };
  MERGE_PROPOSALS.set(id, proposal);
  return res.status(201).json({ proposal });
});
router.get('/merge/proposals/:id', (req, res) => {
  const p = MERGE_PROPOSALS.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'proposal not found' });
  return res.json({ proposal: p });
});
router.post('/merge/proposals/:id/decide', (req, res) => {
  const p = MERGE_PROPOSALS.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'proposal not found' });
  const { decision } = req.body || {};
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be approved|rejected' });
  }
  // PRODUCT-DECISION: approval does NOT execute the merge — only records intent.
  p.status = decision;
  p.decidedAt = new Date().toISOString();
  return res.json({ proposal: p });
});

// ============================================================================
// 8. NEEDS-PRODUCT-DECISION — Supplier data validation.
//    PRODUCT-DECISION: validate against client-supplied authority rules instead
//    of opining on which authority to use (D&B, OpenCorporates, etc.).
// ============================================================================
router.post('/supplier/validate', (req, res) => {
  const { supplier, rules } = req.body || {};
  if (!supplier) return res.status(400).json({ error: 'supplier is required' });
  const r = rules || {};
  const issues = [];
  if (r.requireTaxId && !supplier.taxId) issues.push({ field: 'taxId', issue: 'missing' });
  if (r.requireAddress && !supplier.address) issues.push({ field: 'address', issue: 'missing' });
  if (r.requireCountry && !supplier.country) issues.push({ field: 'country', issue: 'missing' });
  if (r.allowedCountries && supplier.country && !r.allowedCountries.includes(supplier.country)) {
    issues.push({ field: 'country', issue: `not in allowedCountries: ${r.allowedCountries.join(',')}` });
  }
  return res.json({ valid: issues.length === 0, issues, validatedAt: new Date().toISOString() });
});

// ============================================================================
// 9. TOO-RISKY → DRY-RUN. Apply a merge proposal to the DB. Refused.
// ============================================================================
router.post('/merge/proposals/:id/apply', (req, res) => {
  const p = MERGE_PROPOSALS.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'proposal not found' });
  if (p.status !== 'approved') return res.status(409).json({ error: 'proposal not approved' });
  // PRODUCT-DECISION: actual DB merge requires a tested rollback path. Refuse.
  return res.status(501).json({
    error: 'Live merge apply disabled (TOO-RISKY)',
    reason: 'rollback path + transactional merge not yet implemented',
    proposalId: p.id,
  });
});

// ============================================================================
// 10. MECHANICAL — capabilities listing.
// ============================================================================
router.get('/_capabilities', (_req, res) => {
  return res.json({
    capabilities: [
      { name: 'image-similarity', category: 'NEEDS-CREDS', env: 'IMAGE_EMBED_API_KEY' },
      { name: 'shopify/sync', category: 'NEEDS-CREDS', env: 'SHOPIFY_API_TOKEN' },
      { name: 'woocommerce/sync', category: 'NEEDS-CREDS', env: 'WOOCOMMERCE_API_KEY' },
      { name: 'inventory/sync', category: 'NEEDS-CREDS', env: 'INVENTORY_WEBHOOK_SECRET' },
      { name: 'image-dedup', category: 'NEEDS-PRODUCT-DECISION', env: null },
      { name: 'bulk-edit/preview', category: 'NEEDS-PRODUCT-DECISION', env: null },
      { name: 'merge/proposals*', category: 'NEEDS-PRODUCT-DECISION', env: null, note: 'in-memory' },
      { name: 'supplier/validate', category: 'NEEDS-PRODUCT-DECISION', env: null },
      { name: 'merge/proposals/:id/apply', category: 'TOO-RISKY-stub', env: null, note: 'returns 501' },
      { name: '_capabilities', category: 'MECHANICAL', env: null },
    ],
  });
});

export default router;
