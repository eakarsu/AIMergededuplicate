import { Router } from 'express';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vendors ORDER BY name');
    res.json(result.rows);
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

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM vendors WHERE id = $1', [req.params.id]);
    res.json({ message: 'Vendor deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
