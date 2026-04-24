import { Router } from 'express';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { detectDuplicates, suggestMerge } from '../services/openrouter.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT dg.*,
                 (SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'sku', p.sku, 'price', p.price, 'brand', p.brand, 'vendor_name', v.name, 'is_primary', dgi.is_primary, 'similarity_score', dgi.similarity_score))
                  FROM duplicate_group_items dgi
                  JOIN products p ON dgi.product_id = p.id
                  LEFT JOIN vendors v ON p.vendor_id = v.id
                  WHERE dgi.group_id = dg.id) as products
                 FROM duplicate_groups dg WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND dg.status = $1'; params.push(status); }
    query += ' ORDER BY dg.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
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
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        if (rows[i].brand && rows[j].brand && rows[i].brand.toLowerCase() === rows[j].brand.toLowerCase()) {
          const nameSim = calculateSimilarity(rows[i].name.toLowerCase(), rows[j].name.toLowerCase());
          if (nameSim > 0.5) {
            found.push({ product1: rows[i], product2: rows[j], similarity: nameSim });
          }
        }
      }
    }
    res.json({ potential_duplicates: found, count: found.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/:id/merge', authenticate, async (req, res) => {
  try {
    const { primary_product_id } = req.body;
    const group = await pool.query('SELECT * FROM duplicate_groups WHERE id = $1', [req.params.id]);
    if (group.rows.length === 0) return res.status(404).json({ error: 'Group not found' });

    const items = await pool.query(
      'SELECT dgi.*, p.* FROM duplicate_group_items dgi JOIN products p ON dgi.product_id = p.id WHERE dgi.group_id = $1',
      [req.params.id]
    );

    const primary = items.rows.find(i => i.product_id === parseInt(primary_product_id));
    const others = items.rows.filter(i => i.product_id !== parseInt(primary_product_id));

    let totalStock = parseInt(primary.stock_quantity);
    for (const other of others) {
      totalStock += parseInt(other.stock_quantity);
      await pool.query(
        `INSERT INTO merge_history (source_product_id, target_product_id, duplicate_group_id, merged_by, merge_data)
         VALUES ($1,$2,$3,$4,$5)`,
        [other.product_id, primary_product_id, req.params.id, req.user.id,
         JSON.stringify({ source: other, merged_stock: other.stock_quantity })]
      );
      await pool.query("UPDATE products SET status = 'merged' WHERE id = $1", [other.product_id]);
    }

    await pool.query('UPDATE products SET stock_quantity = $1 WHERE id = $2', [totalStock, primary_product_id]);
    await pool.query("UPDATE duplicate_groups SET status = 'resolved', merged_into_id = $1, resolved_at = NOW() WHERE id = $2",
      [primary_product_id, req.params.id]);

    res.json({ message: 'Products merged successfully', primary_product_id, total_stock: totalStock });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/:id/dismiss', authenticate, async (req, res) => {
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

function calculateSimilarity(s1, s2) {
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

export default router;
