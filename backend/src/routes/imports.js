import { Router } from 'express';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const countResult = await pool.query('SELECT COUNT(*) FROM bulk_imports');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      `SELECT bi.*, v.name as vendor_name FROM bulk_imports bi LEFT JOIN vendors v ON bi.vendor_id = v.id ORDER BY bi.created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );
    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
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

// Async bulk import: immediately returns 202, then processes in background
router.post('/', authenticate, async (req, res) => {
  try {
    const { filename, vendor_id, total_rows } = req.body;
    const result = await pool.query(
      'INSERT INTO bulk_imports (filename, vendor_id, total_rows, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [filename, vendor_id, total_rows || 0, 'queued']
    );
    const importRecord = result.rows[0];

    // Return 202 immediately
    res.status(202).json({ ...importRecord, message: 'Import queued for async processing' });

    // Process asynchronously
    setImmediate(async () => {
      try {
        await pool.query("UPDATE bulk_imports SET status = 'processing' WHERE id = $1", [importRecord.id]);

        // Simulate processing — in production this would parse actual file data
        const processingTime = 500 + Math.random() * 1000;
        await new Promise(r => setTimeout(r, processingTime));
        const processedRows = Math.floor((total_rows || 0) * (0.9 + Math.random() * 0.1));
        const duplicatesFound = Math.floor(processedRows * 0.05);
        const errors = Math.max(0, (total_rows || 0) - processedRows);

        await pool.query(
          "UPDATE bulk_imports SET status = 'completed', processed_rows = $1, duplicates_found = $2, errors = $3, completed_at = NOW() WHERE id = $4",
          [processedRows, duplicatesFound, errors, importRecord.id]
        );
      } catch (e) {
        await pool.query("UPDATE bulk_imports SET status = 'failed', errors = $1 WHERE id = $2",
          [1, importRecord.id]).catch(() => {});
      }
    });
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
