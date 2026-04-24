import { Router } from 'express';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    const products = await pool.query(
      `SELECT p.*, v.name as vendor_name FROM products p LEFT JOIN vendors v ON p.vendor_id = v.id WHERE p.category_id = $1 ORDER BY p.name`, [req.params.id]
    );
    res.json({ ...result.rows[0], products: products.rows });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, slug, parent_id, description, status } = req.body;
    const result = await pool.query(
      'INSERT INTO categories (name, slug, parent_id, description, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, slug, parent_id, description, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, slug, parent_id, description, status } = req.body;
    const result = await pool.query(
      'UPDATE categories SET name=$1, slug=$2, parent_id=$3, description=$4, status=$5 WHERE id=$6 RETURNING *',
      [name, slug, parent_id, description, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
