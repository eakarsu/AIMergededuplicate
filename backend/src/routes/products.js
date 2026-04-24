import { Router } from 'express';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { search, category_id, vendor_id, status, sort, order, page = 1, limit = 50 } = req.query;
    let query = `SELECT p.*, c.name as category_name, v.name as vendor_name
                 FROM products p
                 LEFT JOIN categories c ON p.category_id = c.id
                 LEFT JOIN vendors v ON p.vendor_id = v.id WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (search) { query += ` AND (p.name ILIKE $${idx} OR p.sku ILIKE $${idx} OR p.brand ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    if (category_id) { query += ` AND p.category_id = $${idx}`; params.push(category_id); idx++; }
    if (vendor_id) { query += ` AND p.vendor_id = $${idx}`; params.push(vendor_id); idx++; }
    if (status) { query += ` AND p.status = $${idx}`; params.push(status); idx++; }

    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) sub`, params);
    const total = parseInt(countResult.rows[0].count);

    const sortField = sort || 'p.created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortField} ${sortOrder} LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await pool.query(query, params);
    res.json({ products: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, v.name as vendor_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN vendors v ON p.vendor_id = v.id
       WHERE p.id = $1`, [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { sku, name, description, brand, category_id, vendor_id, price, cost, stock_quantity, weight, dimensions, barcode, status } = req.body;
    const result = await pool.query(
      `INSERT INTO products (sku, name, description, brand, category_id, vendor_id, price, cost, stock_quantity, weight, dimensions, barcode, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [sku, name, description, brand, category_id, vendor_id, price, cost, stock_quantity, weight, dimensions, barcode, status || 'active']
    );
    await pool.query(`INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_data) VALUES ($1, 'CREATE', 'product', $2, $3)`,
      [req.user.id, result.rows[0].id, JSON.stringify({ name, sku })]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, brand, category_id, vendor_id, price, cost, stock_quantity, weight, dimensions, barcode, status } = req.body;
    const old = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    if (price && parseFloat(price) !== parseFloat(old.rows[0].price)) {
      await pool.query('INSERT INTO price_history (product_id, old_price, new_price, changed_by) VALUES ($1,$2,$3,$4)',
        [req.params.id, old.rows[0].price, price, req.user.name]);
    }

    const result = await pool.query(
      `UPDATE products SET name=$1, description=$2, brand=$3, category_id=$4, vendor_id=$5, price=$6, cost=$7,
       stock_quantity=$8, weight=$9, dimensions=$10, barcode=$11, status=$12, updated_at=NOW() WHERE id=$13 RETURNING *`,
      [name, description, brand, category_id, vendor_id, price, cost, stock_quantity, weight, dimensions, barcode, status, req.params.id]
    );
    await pool.query(`INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_data, new_data) VALUES ($1, 'UPDATE', 'product', $2, $3, $4)`,
      [req.user.id, req.params.id, JSON.stringify(old.rows[0]), JSON.stringify(result.rows[0])]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    await pool.query(`INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_data) VALUES ($1, 'DELETE', 'product', $2, $3)`,
      [req.user.id, req.params.id, JSON.stringify(old.rows[0])]);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
