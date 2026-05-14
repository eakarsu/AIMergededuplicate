# Audit Note — AIMergededuplicate

Source audit: `_AUDIT/reports/batch_05.md` § 23

## Original audit recommendations

### Missing AI endpoints
- `/detect-duplicates`
- `/merge-rules-suggest`
- `/image-similarity`
- `/pricing-trend-analyzer`

### Missing non-AI features
- Image deduplication
- Bulk edit workflows
- Merge preview/approval workflows
- E-commerce platform integration (Shopify, WooCommerce)
- Inventory sync
- Supplier data validation

### Custom feature suggestions
- Agentic duplicate detection & merging
- Vision-based product data enrichment
- Streaming data quality scoring
- Multi-channel product sync
- Supplier data orchestration
- Vertical data templates

## Implemented in this pass
The service module already exported `detectDuplicates` and `suggestMerge` but no route was wired up. Connected them and added two endpoints to `routes/ai.js`:

1. **POST `/api/ai/detect-duplicates`** — finds candidate duplicates for a product (via SKU/name LIKE), runs each candidate through `detectDuplicates`, returns ranked matches. Persists to `ai_jobs`.
2. **POST `/api/ai/merge-rules-suggest`** — runs `suggestMerge` across a supplied list of `product_ids`, persists structured result.

Both reuse existing service exports + `parseAIJson` + `authenticate` middleware. ESM import check OK.

## Backlog (priority order)

### Mechanical
- `/pricing-trend-analyzer` (uses `price_history` table — straightforward)

### Needs creds / external SDK
- `/image-similarity` — needs vision embeddings model + image storage
- E-commerce integrations (Shopify Admin API, WooCommerce REST)
- Inventory sync (real-time webhooks)

### Needs product decision
- Image deduplication (storage tier, perceptual hash vs embeddings)
- Bulk edit workflows (UI + transactional rollback)
- Merge preview / approval workflows (state machine)
- Supplier data validation (which authority sources)
- Vertical data templates (electronics / apparel / food schemas)

## Apply pass 5 (all backlog)

Closed the remaining backlog by adding `backend/src/routes/aiBacklog.js` (ESM, mounted at `/api/ai-backlog`). Additive new file. Cap: 10 features.

| Item | Category | Endpoint(s) |
|---|---|---|
| Image similarity (vision embeddings) | NEEDS-CREDS `IMAGE_EMBED_API_KEY` | `POST /image-similarity` |
| Shopify catalog sync | NEEDS-CREDS `SHOPIFY_API_TOKEN` | `POST /shopify/sync` |
| WooCommerce catalog sync | NEEDS-CREDS `WOOCOMMERCE_API_KEY` | `POST /woocommerce/sync` |
| Inventory sync webhook | NEEDS-CREDS `INVENTORY_WEBHOOK_SECRET` | `POST /inventory/sync` |
| Image deduplication (perceptual hash) | NEEDS-PRODUCT-DECISION (hex-prefix Hamming stub; pHash/dHash/embedding choice deferred) | `POST /image-dedup` |
| Bulk edit workflow | NEEDS-PRODUCT-DECISION (dry-run patch diff) | `POST /bulk-edit/preview` |
| Merge preview/approval workflow | NEEDS-PRODUCT-DECISION (in-memory state machine pending → approved/rejected) | `POST /merge/proposals`, `GET /merge/proposals/:id`, `POST /merge/proposals/:id/decide` |
| Supplier data validation | NEEDS-PRODUCT-DECISION (validates against client-supplied authority rules) | `POST /supplier/validate` |
| Apply merge proposal | TOO-RISKY-stub (returns 501; rollback path not yet implemented) | `POST /merge/proposals/:id/apply` |
| Capabilities listing | MECHANICAL | `GET /_capabilities` |

Smoke test: PASS — `node src/server.js` on port 4000; logged in `admin@catalog.com/admin123`; `/shopify/sync` → 503 `missing:"SHOPIFY_API_TOKEN"`; `/image-dedup` returned grouping; `/bulk-edit/preview` returned per-row diff; `/merge/proposals` minted `mp_*` id; `/supplier/validate` returned issues.

## Apply pass 4 (mechanical backlog)

Closed the single MECHANICAL item: `POST /api/ai/pricing-trend-analyzer`.

- Backend: added route to `backend/src/routes/ai.js`. Reads `price_history` for a product over a configurable window (`days`, default 90), passes it through `callOpenRouter` with a strict-JSON prompt (trend, average, volatility, anomalies, 30-day forecast, recommended actions), parses with `parseAIJson`, persists to `ai_jobs`. Returns 503 if `OPENROUTER_API_KEY` is unset/placeholder.
- Frontend: added `pricingTrendAnalyzer()` to `frontend/src/services/api.js` and a third tool tab in `frontend/src/pages/AiAdvancedTools.jsx` with product selector + lookback days input, reusing the existing `AiResultDisplay` component.

Smoke test: PASS — backend up on port 4000; logged in `admin@catalog.com`; `POST /api/ai/pricing-trend-analyzer {product_id:1}` returned HTTP 404 "No price history found" (route reachable, DB query executed correctly; the no-history path is reached before any LLM call).

## Apply pass 3 (frontend)

**Action:** LEFT-AS-IS — FE already wired.

Vite/React frontend has `pages/AiAdvancedTools.jsx` listing the pass-2 endpoints (`detect-duplicates`, `merge-rules-suggest`) and `services/api.js` exposes them as `detectDuplicatesAi` / `suggestMergeRules` using the bearer-token request helper. Routed at `/ai-advanced` in `App.jsx`. No modifications needed.
