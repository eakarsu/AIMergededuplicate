import { Router } from 'express';
import pool from '../db/connection.js';

const router = Router();

// GET /api/custom-views/cluster-graph
// Synthesize duplicate cluster graph: nodes = product records, edges = similarity links
router.get('/cluster-graph', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, sku, name, brand, price, quality_score
       FROM products
       WHERE status = 'active'
       ORDER BY brand, name
       LIMIT 36`
    );
    const products = result.rows;

    // Group by brand into clusters
    const clustersByBrand = {};
    products.forEach((p) => {
      const key = p.brand || 'Unknown';
      if (!clustersByBrand[key]) clustersByBrand[key] = [];
      clustersByBrand[key].push(p);
    });

    const clusters = [];
    const nodes = [];
    const edges = [];
    let clusterIdx = 0;

    Object.entries(clustersByBrand).forEach(([brand, items]) => {
      if (items.length < 2) return; // only clusters with potential dupes
      const cId = `cluster-${clusterIdx}`;
      clusters.push({ id: cId, brand, size: items.length });

      // Position nodes radially per cluster
      const cx = 180 + (clusterIdx % 3) * 420;
      const cy = 180 + Math.floor(clusterIdx / 3) * 360;
      items.forEach((p, i) => {
        const angle = (2 * Math.PI * i) / items.length;
        const r = 110;
        nodes.push({
          id: `p-${p.id}`,
          clusterId: cId,
          label: p.name.length > 28 ? p.name.slice(0, 26) + '…' : p.name,
          sku: p.sku,
          brand: p.brand,
          price: Number(p.price),
          quality: Number(p.quality_score),
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      });

      // Pairwise edges weighted by name-token similarity
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const sim = jaccard(tokens(items[i].name), tokens(items[j].name));
          if (sim >= 0.2) {
            edges.push({
              id: `e-${items[i].id}-${items[j].id}`,
              source: `p-${items[i].id}`,
              target: `p-${items[j].id}`,
              weight: Number(sim.toFixed(3)),
            });
          }
        }
      }
      clusterIdx++;
    });

    res.json({ clusters, nodes, edges, generated_at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/custom-views/merge-confidence
// Histogram buckets of merge candidates by confidence score
router.get('/merge-confidence', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, brand, quality_score, price FROM products WHERE status = 'active' LIMIT 200`
    );
    const products = result.rows;

    // Group by brand, score pairs
    const byBrand = {};
    products.forEach((p) => {
      const k = p.brand || 'Unknown';
      (byBrand[k] = byBrand[k] || []).push(p);
    });

    const candidates = [];
    Object.values(byBrand).forEach((items) => {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const sim = jaccard(tokens(items[i].name), tokens(items[j].name));
          const qualityBoost = (Number(items[i].quality_score) + Number(items[j].quality_score)) / 10;
          const confidence = Math.min(100, Math.round((sim * 70) + qualityBoost * 3 + 5));
          if (sim > 0.05) {
            candidates.push({
              a: items[i].name,
              b: items[j].name,
              brand: items[i].brand,
              confidence,
            });
          }
        }
      }
    });

    const buckets = [
      { range: '0-25', label: 'Low', min: 0, max: 25, count: 0 },
      { range: '25-50', label: 'Medium', min: 25, max: 50, count: 0 },
      { range: '50-75', label: 'High', min: 50, max: 75, count: 0 },
      { range: '75-100', label: 'Very High', min: 75, max: 100, count: 0 },
    ];
    candidates.forEach((c) => {
      const b = buckets.find((b) => c.confidence >= b.min && c.confidence <= b.max);
      if (b) b.count++;
    });

    const top = candidates
      .sort((x, y) => y.confidence - x.confidence)
      .slice(0, 10);

    res.json({
      buckets,
      total_candidates: candidates.length,
      top_candidates: top,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function tokens(s) {
  return new Set(
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((t) => { if (b.has(t)) inter++; });
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

// ============================================================================
// MERGE APPROVAL QUEUE
// ============================================================================

async function ensureMergeDecisionTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS merge_decisions (
      id SERIAL PRIMARY KEY,
      pair_id VARCHAR(80) UNIQUE NOT NULL,
      product_a_id INTEGER,
      product_b_id INTEGER,
      product_a_name VARCHAR(500),
      product_b_name VARCHAR(500),
      brand VARCHAR(255),
      confidence INTEGER,
      decision VARCHAR(20) NOT NULL,
      reason TEXT,
      decided_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

// Build a deterministic, stable list of candidate merge pairs based on existing
// products. The pair_id is derived from product ids so the queue is stable
// across reloads even when the page refreshes.
async function buildCandidatePairs() {
  const result = await pool.query(
    `SELECT id, sku, name, brand, price, quality_score
     FROM products WHERE status = 'active' ORDER BY brand, name LIMIT 200`
  );
  const products = result.rows;
  const byBrand = {};
  products.forEach((p) => {
    const k = p.brand || 'Unknown';
    (byBrand[k] = byBrand[k] || []).push(p);
  });
  const pairs = [];
  Object.values(byBrand).forEach((items) => {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const sim = jaccard(tokens(items[i].name), tokens(items[j].name));
        if (sim < 0.2) continue;
        const qualityBoost = (Number(items[i].quality_score) + Number(items[j].quality_score)) / 10;
        const confidence = Math.min(100, Math.round((sim * 70) + qualityBoost * 3 + 5));
        const pair_id = `pair-${items[i].id}-${items[j].id}`;
        pairs.push({
          pair_id,
          product_a_id: items[i].id,
          product_b_id: items[j].id,
          product_a_name: items[i].name,
          product_b_name: items[j].name,
          product_a_sku: items[i].sku,
          product_b_sku: items[j].sku,
          product_a_price: Number(items[i].price),
          product_b_price: Number(items[j].price),
          brand: items[i].brand,
          confidence,
          similarity: Number(sim.toFixed(3)),
        });
      }
    }
  });
  pairs.sort((a, b) => b.confidence - a.confidence);
  return pairs;
}

router.get('/merge-queue', async (req, res) => {
  try {
    await ensureMergeDecisionTable();
    const allPairs = await buildCandidatePairs();
    const decidedRows = await pool.query(
      `SELECT pair_id, decision, reason, decided_at FROM merge_decisions ORDER BY decided_at DESC`
    );
    const decidedMap = {};
    decidedRows.rows.forEach((r) => { decidedMap[r.pair_id] = r; });

    const pending = allPairs.filter((p) => !decidedMap[p.pair_id]);
    const decided = decidedRows.rows.map((r) => {
      const candidate = allPairs.find((p) => p.pair_id === r.pair_id);
      return {
        ...r,
        product_a_name: candidate?.product_a_name,
        product_b_name: candidate?.product_b_name,
        confidence: candidate?.confidence,
        brand: candidate?.brand,
      };
    });

    res.json({
      pending,
      decided,
      total: allPairs.length,
      pending_count: pending.length,
      decided_count: decided.length,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/merge-decision', async (req, res) => {
  try {
    await ensureMergeDecisionTable();
    const { pair_id, decision, reason } = req.body || {};
    if (!pair_id || !decision) {
      return res.status(400).json({ error: 'pair_id and decision are required' });
    }
    if (!['approve', 'reject', 'skip'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be approve | reject | skip' });
    }
    const allPairs = await buildCandidatePairs();
    const candidate = allPairs.find((p) => p.pair_id === pair_id);
    if (!candidate) {
      return res.status(404).json({ error: `Unknown pair_id ${pair_id}` });
    }

    await pool.query(
      `INSERT INTO merge_decisions (pair_id, product_a_id, product_b_id, product_a_name, product_b_name, brand, confidence, decision, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (pair_id) DO UPDATE SET decision = EXCLUDED.decision, reason = EXCLUDED.reason, decided_at = NOW()`,
      [
        pair_id,
        candidate.product_a_id,
        candidate.product_b_id,
        candidate.product_a_name,
        candidate.product_b_name,
        candidate.brand,
        candidate.confidence,
        decision,
        reason || null,
      ]
    );

    const decidedRows = await pool.query('SELECT COUNT(*)::int AS c FROM merge_decisions');
    const decided = decidedRows.rows[0].c;
    const remaining = allPairs.length - decided;

    res.json({ remaining, decided, pair_id, decision });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// DEDUPE RULES EDITOR
// ============================================================================

async function ensureDedupeRulesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dedupe_rules (
      id SERIAL PRIMARY KEY,
      field VARCHAR(100) NOT NULL,
      op VARCHAR(20) NOT NULL,
      pattern TEXT,
      weight INTEGER NOT NULL DEFAULT 50,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  // Seed defaults if empty (idempotent).
  const cnt = await pool.query('SELECT COUNT(*)::int AS c FROM dedupe_rules');
  if (cnt.rows[0].c === 0) {
    await pool.query(`
      INSERT INTO dedupe_rules (field, op, pattern, weight, enabled) VALUES
      ('sku', 'exact', NULL, 100, TRUE),
      ('barcode', 'exact', NULL, 95, TRUE),
      ('name', 'fuzzy', NULL, 70, TRUE),
      ('brand', 'exact', NULL, 60, TRUE),
      ('name', 'regex', '\\b(M3 ?Pro|M2|XPS|Galaxy|MacBook)\\b', 40, FALSE)
    `);
  }
}

router.get('/dedupe-rules', async (req, res) => {
  try {
    await ensureDedupeRulesTable();
    const result = await pool.query('SELECT * FROM dedupe_rules ORDER BY id ASC');
    res.json({ rules: result.rows, count: result.rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/dedupe-rules', async (req, res) => {
  try {
    await ensureDedupeRulesTable();
    const { field, op, pattern, weight, enabled } = req.body || {};
    if (!field || !op) return res.status(400).json({ error: 'field and op are required' });
    if (!['exact', 'fuzzy', 'regex'].includes(op)) {
      return res.status(400).json({ error: 'op must be exact | fuzzy | regex' });
    }
    const w = Math.max(0, Math.min(100, Number(weight ?? 50)));
    const result = await pool.query(
      `INSERT INTO dedupe_rules (field, op, pattern, weight, enabled)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [field, op, pattern || null, w, enabled !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/dedupe-rules/:id', async (req, res) => {
  try {
    await ensureDedupeRulesTable();
    const id = Number(req.params.id);
    const { field, op, pattern, weight, enabled } = req.body || {};
    const w = weight === undefined ? null : Math.max(0, Math.min(100, Number(weight)));
    const result = await pool.query(
      `UPDATE dedupe_rules
       SET field = COALESCE($1, field),
           op = COALESCE($2, op),
           pattern = $3,
           weight = COALESCE($4, weight),
           enabled = COALESCE($5, enabled),
           updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [field || null, op || null, pattern ?? null, w, enabled, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/dedupe-rules/:id', async (req, res) => {
  try {
    await ensureDedupeRulesTable();
    const id = Number(req.params.id);
    const result = await pool.query('DELETE FROM dedupe_rules WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json({ deleted: result.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Preview a rule: returns count of matches across active products.
router.get('/dedupe-rules/:id/preview', async (req, res) => {
  try {
    await ensureDedupeRulesTable();
    const id = Number(req.params.id);
    const ruleRes = await pool.query('SELECT * FROM dedupe_rules WHERE id = $1', [id]);
    if (ruleRes.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    const rule = ruleRes.rows[0];

    const allowedFields = ['sku', 'name', 'brand', 'barcode', 'description'];
    if (!allowedFields.includes(rule.field)) {
      return res.status(400).json({ error: `field ${rule.field} not supported for preview` });
    }

    const productRes = await pool.query(
      `SELECT id, sku, name, brand, barcode, description FROM products WHERE status = 'active' LIMIT 500`
    );
    const products = productRes.rows;

    let matches = 0;
    let sampleMatches = [];

    if (rule.op === 'exact') {
      const seen = {};
      products.forEach((p) => {
        const v = String(p[rule.field] ?? '').trim().toLowerCase();
        if (!v) return;
        (seen[v] = seen[v] || []).push(p);
      });
      Object.values(seen).forEach((group) => {
        if (group.length > 1) {
          matches += group.length;
          if (sampleMatches.length < 5) sampleMatches.push(group.slice(0, 2).map((g) => g.name));
        }
      });
    } else if (rule.op === 'fuzzy') {
      const pairs = [];
      for (let i = 0; i < products.length; i++) {
        for (let j = i + 1; j < products.length; j++) {
          const sim = jaccard(tokens(products[i][rule.field]), tokens(products[j][rule.field]));
          if (sim >= 0.5) {
            pairs.push([products[i].name, products[j].name, sim]);
          }
        }
      }
      matches = pairs.length;
      sampleMatches = pairs.slice(0, 5).map((p) => [p[0], p[1]]);
    } else if (rule.op === 'regex') {
      try {
        const re = new RegExp(rule.pattern || '', 'i');
        products.forEach((p) => {
          if (re.test(String(p[rule.field] ?? ''))) {
            matches++;
            if (sampleMatches.length < 5) sampleMatches.push([p.name]);
          }
        });
      } catch (e) {
        return res.status(400).json({ error: `invalid regex: ${e.message}` });
      }
    }

    res.json({
      rule_id: rule.id,
      field: rule.field,
      op: rule.op,
      matches,
      sample: sampleMatches,
      scanned: products.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
