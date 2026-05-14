import { Router } from 'express';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const countResult = await pool.query('SELECT COUNT(*) FROM vendors');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(`
      SELECT v.*, COUNT(p.id) as total_products
      FROM vendors v LEFT JOIN products p ON v.id = p.vendor_id AND p.status = 'active'
      GROUP BY v.id ORDER BY v.name
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), offset]);
    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });
    const products = await pool.query('SELECT * FROM products WHERE vendor_id = $1 ORDER BY name', [req.params.id]);
    res.json({ ...result.rows[0], products: products.rows });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, code, contact_email, phone, address, status } = req.body;
    const result = await pool.query(
      'INSERT INTO vendors (name, code, contact_email, phone, address, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, code, contact_email, phone, address, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, code, contact_email, phone, address, status, reliability_score } = req.body;
    const result = await pool.query(
      `UPDATE vendors SET name=$1, code=$2, contact_email=$3, phone=$4, address=$5, status=$6, reliability_score=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [name, code, contact_email, phone, address, status, reliability_score, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    await pool.query('DELETE FROM vendors WHERE id = $1', [req.params.id]);
    res.json({ message: 'Vendor deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Vendor reliability score — computed from avg quality_score of products
router.post('/:id/update-reliability', authenticate, async (req, res) => {
  try {
    const vendorResult = await pool.query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);
    if (vendorResult.rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });

    const scoreResult = await pool.query(
      `SELECT AVG(quality_score) as avg_quality FROM products WHERE vendor_id = $1 AND status = 'active' AND quality_score IS NOT NULL`,
      [req.params.id]
    );
    const avgQuality = parseFloat(scoreResult.rows[0].avg_quality) || 0;

    await pool.query(
      'UPDATE vendors SET reliability_score = $1, updated_at = NOW() WHERE id = $2',
      [avgQuality.toFixed(2), req.params.id]
    );

    res.json({ vendor_id: parseInt(req.params.id), new_reliability_score: avgQuality, message: `Reliability score updated to ${avgQuality.toFixed(2)}` });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
