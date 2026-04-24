import { Router } from 'express';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bi.*, v.name as vendor_name FROM bulk_imports bi LEFT JOIN vendors v ON bi.vendor_id = v.id ORDER BY bi.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bi.*, v.name as vendor_name FROM bulk_imports bi LEFT JOIN vendors v ON bi.vendor_id = v.id WHERE bi.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Import not found' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { filename, vendor_id, total_rows } = req.body;
    const result = await pool.query(
      'INSERT INTO bulk_imports (filename, vendor_id, total_rows, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [filename, vendor_id, total_rows || 0, 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { status, processed_rows, duplicates_found, errors } = req.body;
    const completedAt = status === 'completed' ? 'NOW()' : 'NULL';
    const result = await pool.query(
      `UPDATE bulk_imports SET status=$1, processed_rows=$2, duplicates_found=$3, errors=$4, completed_at=${completedAt} WHERE id=$5 RETURNING *`,
      [status, processed_rows, duplicates_found, errors, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Import not found' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM bulk_imports WHERE id = $1', [req.params.id]);
    res.json({ message: 'Import deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
