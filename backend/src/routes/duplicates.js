import { Router } from 'express';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { detectDuplicates, suggestMerge } from '../services/openrouter.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let countQ = 'SELECT COUNT(*) FROM duplicate_groups WHERE 1=1';
    let query = `SELECT dg.*,
                 (SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'sku', p.sku, 'price', p.price, 'brand', p.brand, 'vendor_name', v.name, 'is_primary', dgi.is_primary, 'similarity_score', dgi.similarity_score))
                  FROM duplicate_group_items dgi
                  JOIN products p ON dgi.product_id = p.id
                  LEFT JOIN vendors v ON p.vendor_id = v.id
                  WHERE dgi.group_id = dg.id) as products
                 FROM duplicate_groups dg WHERE 1=1`;
    const params = [];
    const countParams = [];
    if (status) {
      query += ' AND dg.status = $1'; params.push(status);
      countQ += ' AND status = $1'; countParams.push(status);
    }
    const countResult = await pool.query(countQ, countParams);
    const total = parseInt(countResult.rows[0].count);
    query += ` ORDER BY dg.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);
    const result = await pool.query(query, params);
    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM duplicate_groups WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    const items = await pool.query(
      `SELECT dgi.*, p.*, v.name as vendor_name, c.name as category_name
       FROM duplicate_group_items dgi
       JOIN products p ON dgi.product_id = p.id
       LEFT JOIN vendors v ON p.vendor_id = v.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE dgi.group_id = $1`, [req.params.id]
    );
    res.json({ ...result.rows[0], items: items.rows });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/detect', authenticate, async (req, res) => {
  try {
    const { product_id_1, product_id_2 } = req.body;
    const p1 = await pool.query('SELECT * FROM products WHERE id = $1', [product_id_1]);
    const p2 = await pool.query('SELECT * FROM products WHERE id = $1', [product_id_2]);
    if (p1.rows.length === 0 || p2.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const aiResult = await detectDuplicates(p1.rows[0], p2.rows[0]);
    const content = aiResult.choices[0].message.content;
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { raw_response: content }; }

    await pool.query(
      `INSERT INTO ai_jobs (job_type, status, input_data, output_data, model, tokens_used, completed_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      ['duplicate_detection', 'completed', JSON.stringify({ product_id_1, product_id_2 }),
       JSON.stringify(parsed), aiResult.model, aiResult.usage?.total_tokens]
    );

    // Auto-create duplicate group if AI says it's a duplicate with high confidence
    if (parsed.is_duplicate && parsed.confidence >= 70) {
      const existing = await pool.query(
        `SELECT dg.id FROM duplicate_groups dg
         JOIN duplicate_group_items dgi1 ON dg.id = dgi1.group_id AND dgi1.product_id = $1
         JOIN duplicate_group_items dgi2 ON dg.id = dgi2.group_id AND dgi2.product_id = $2
         WHERE dg.status = 'pending' LIMIT 1`,
        [product_id_1, product_id_2]
      );
      if (existing.rows.length === 0) {
        const newGroup = await pool.query(
          `INSERT INTO duplicate_groups (name, confidence, status, ai_reasoning) VALUES ($1,$2,'pending',$3) RETURNING id`,
          [`${p1.rows[0].name} vs ${p2.rows[0].name}`, parsed.confidence, parsed.reasoning || '']
        );
        const groupId = newGroup.rows[0].id;
        const primaryId = parsed.suggested_primary_id === 2 ? product_id_2 : product_id_1;
        const secondaryId = primaryId === product_id_1 ? product_id_2 : product_id_1;
        await pool.query('INSERT INTO duplicate_group_items (group_id, product_id, is_primary, similarity_score) VALUES ($1,$2,true,$3)', [groupId, primaryId, parsed.confidence]);
        await pool.query('INSERT INTO duplicate_group_items (group_id, product_id, is_primary, similarity_score) VALUES ($1,$2,false,$3)', [groupId, secondaryId, parsed.confidence]);
        parsed._created_group_id = groupId;
      }
    }

    res.json({ ai_analysis: parsed, model: aiResult.model, usage: aiResult.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/auto-detect', authenticate, async (req, res) => {
  try {
    const products = await pool.query(
      `SELECT p.*, v.name as vendor_name FROM products p LEFT JOIN vendors v ON p.vendor_id = v.id WHERE p.status = 'active' ORDER BY p.brand, p.name`
    );
    const found = [];
    const rows = products.rows;
    const groupsCreated = [];

    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        if (rows[i].brand && rows[j].brand && rows[i].brand.toLowerCase() === rows[j].brand.toLowerCase()) {
          const nameSim = calculateSimilarity(rows[i].name.toLowerCase(), rows[j].name.toLowerCase());
          if (nameSim > 0.7) {
            found.push({ product1: rows[i], product2: rows[j], similarity: nameSim });

            // Auto-create duplicate_group if not already exists
            const existing = await pool.query(
              `SELECT dg.id FROM duplicate_groups dg
               JOIN duplicate_group_items dgi1 ON dg.id = dgi1.group_id AND dgi1.product_id = $1
               JOIN duplicate_group_items dgi2 ON dg.id = dgi2.group_id AND dgi2.product_id = $2
               WHERE dg.status = 'pending' LIMIT 1`,
              [rows[i].id, rows[j].id]
            );
            if (existing.rows.length === 0) {
              const newGroup = await pool.query(
                `INSERT INTO duplicate_groups (name, confidence, status, ai_reasoning) VALUES ($1,$2,'pending',$3) RETURNING id`,
                [`${rows[i].name} vs ${rows[j].name}`, Math.round(nameSim * 100), 'Auto-detected via Jaccard similarity']
              );
              const groupId = newGroup.rows[0].id;
              await pool.query('INSERT INTO duplicate_group_items (group_id, product_id, is_primary, similarity_score) VALUES ($1,$2,true,$3)', [groupId, rows[i].id, Math.round(nameSim * 100)]);
              await pool.query('INSERT INTO duplicate_group_items (group_id, product_id, is_primary, similarity_score) VALUES ($1,$2,false,$3)', [groupId, rows[j].id, Math.round(nameSim * 100)]);
              groupsCreated.push(groupId);
            }
          }
        }
      }
    }
    res.json({ potential_duplicates: found, count: found.length, groups_created: groupsCreated.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Merge — wrapped in transaction, requires admin or manager role
router.post('/:id/merge', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { primary_product_id } = req.body;
    await client.query('BEGIN');

    const group = await client.query('SELECT * FROM duplicate_groups WHERE id = $1', [req.params.id]);
    if (group.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Group not found' }); }

    const items = await client.query(
      'SELECT dgi.*, p.* FROM duplicate_group_items dgi JOIN products p ON dgi.product_id = p.id WHERE dgi.group_id = $1',
      [req.params.id]
    );

    const primary = items.rows.find(i => i.product_id === parseInt(primary_product_id));
    if (!primary) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Primary product not in group' }); }
    const others = items.rows.filter(i => i.product_id !== parseInt(primary_product_id));

    let totalStock = parseInt(primary.stock_quantity) || 0;
    for (const other of others) {
      totalStock += parseInt(other.stock_quantity) || 0;
      await client.query(
        `INSERT INTO merge_history (source_product_id, target_product_id, duplicate_group_id, merged_by, merge_data)
         VALUES ($1,$2,$3,$4,$5)`,
        [other.product_id, primary_product_id, req.params.id, req.user.id,
         JSON.stringify({ source: { id: other.product_id, name: other.name }, merged_stock: other.stock_quantity })]
      );
      await client.query("UPDATE products SET status = 'merged' WHERE id = $1", [other.product_id]);
    }

    await client.query('UPDATE products SET stock_quantity = $1 WHERE id = $2', [totalStock, primary_product_id]);
    await client.query("UPDATE duplicate_groups SET status = 'resolved', merged_into_id = $1, resolved_at = NOW() WHERE id = $2",
      [primary_product_id, req.params.id]);

    // Write explicit audit entry for merge
    await client.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_data) VALUES ($1, 'MERGE', 'duplicate_group', $2, $3)`,
      [req.user.id, req.params.id, JSON.stringify({ primary_product_id, merged_count: others.length })]
    );

    await client.query('COMMIT');
    res.json({ message: 'Products merged successfully', primary_product_id, total_stock: totalStock });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Dismiss — requires admin or manager role
router.post('/:id/dismiss', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    await pool.query("UPDATE duplicate_groups SET status = 'dismissed' WHERE id = $1", [req.params.id]);
    res.json({ message: 'Group dismissed' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/:id/ai-merge-suggestion', authenticate, async (req, res) => {
  try {
    const items = await pool.query(
      `SELECT p.*, v.name as vendor_name FROM duplicate_group_items dgi JOIN products p ON dgi.product_id = p.id LEFT JOIN vendors v ON p.vendor_id = v.id WHERE dgi.group_id = $1`,
      [req.params.id]
    );
    const aiResult = await suggestMerge(items.rows);
    const content = aiResult.choices[0].message.content;
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { raw_response: content }; }
    res.json({ ai_suggestion: parsed, model: aiResult.model, usage: aiResult.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Delete group — requires admin
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM duplicate_group_items WHERE group_id = $1', [req.params.id]);
    await pool.query('DELETE FROM duplicate_groups WHERE id = $1', [req.params.id]);
    res.json({ message: 'Group deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

function calculateSimilarity(s1, s2) {
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

export default router;
