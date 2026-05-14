import { Router } from 'express';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [products, vendors, categories, duplicates, imports, recentAudit] = await Promise.all([
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active, COUNT(*) FILTER (WHERE status='merged') as merged, AVG(quality_score) as avg_quality FROM products"),
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active FROM vendors"),
      pool.query('SELECT COUNT(*) as total FROM categories'),
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='pending') as pending, COUNT(*) FILTER (WHERE status='resolved') as resolved FROM duplicate_groups"),
      pool.query("SELECT COUNT(*) as total, SUM(duplicates_found) as total_duplicates_found FROM bulk_imports"),
      pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10'),
    ]);

    res.json({
      products: products.rows[0],
      vendors: vendors.rows[0],
      categories: categories.rows[0],
      duplicates: duplicates.rows[0],
      imports: imports.rows[0],
      recent_activity: recentAudit.rows,
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/price-history/:productId', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM price_history WHERE product_id = $1 ORDER BY created_at DESC',
      [req.params.productId]
    );
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/quality-reports', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM data_quality_reports ORDER BY created_at DESC LIMIT 20');
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/audit-log', authenticate, async (req, res) => {
  try {
    const { entity_type, action, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let countQ = 'SELECT COUNT(*) FROM audit_log WHERE 1=1';
    let query = `SELECT al.*, u.name as user_name FROM audit_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
    const params = [];
    const countParams = [];
    let idx = 1;
    if (entity_type) {
      query += ` AND al.entity_type = $${idx}`; params.push(entity_type);
      countQ += ` AND entity_type = $${idx}`; countParams.push(entity_type); idx++;
    }
    if (action) {
      query += ` AND al.action = $${idx}`; params.push(action);
      countQ += ` AND action = $${idx}`; countParams.push(action); idx++;
    }
    const countResult = await pool.query(countQ, countParams);
    const total = parseInt(countResult.rows[0].count);
    query += ` ORDER BY al.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), offset);
    const result = await pool.query(query, params);
    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/merge-history', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mh.*, p.name as target_product_name, u.name as merged_by_name, dg.name as group_name
       FROM merge_history mh
       LEFT JOIN products p ON mh.target_product_id = p.id
       LEFT JOIN users u ON mh.merged_by = u.id
       LEFT JOIN duplicate_groups dg ON mh.duplicate_group_id = dg.id
       ORDER BY mh.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
