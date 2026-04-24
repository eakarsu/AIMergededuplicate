import { Router } from 'express';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { generateProductDescription, suggestCategory, optimizePrice, analyzeQuality } from '../services/openrouter.js';

const router = Router();

router.post('/generate-description', authenticate, async (req, res) => {
  try {
    const { product_id } = req.body;
    const result = await pool.query(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1`,
      [product_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const aiResult = await generateProductDescription(result.rows[0]);
    const content = aiResult.choices[0].message.content;
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { raw_response: content }; }

    await pool.query(
      `INSERT INTO ai_jobs (job_type, status, input_data, output_data, model, tokens_used, completed_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      ['description_generation', 'completed', JSON.stringify({ product_id }), JSON.stringify(parsed), aiResult.model, aiResult.usage?.total_tokens]
    );

    res.json({ ai_result: parsed, product: result.rows[0], model: aiResult.model, usage: aiResult.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/suggest-category', authenticate, async (req, res) => {
  try {
    const { product_name, description } = req.body;
    const aiResult = await suggestCategory(product_name, description);
    const content = aiResult.choices[0].message.content;
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { raw_response: content }; }

    await pool.query(
      `INSERT INTO ai_jobs (job_type, status, input_data, output_data, model, tokens_used, completed_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      ['category_suggestion', 'completed', JSON.stringify({ product_name, description }), JSON.stringify(parsed), aiResult.model, aiResult.usage?.total_tokens]
    );

    res.json({ ai_result: parsed, model: aiResult.model, usage: aiResult.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/optimize-price', authenticate, async (req, res) => {
  try {
    const { product_id } = req.body;
    const result = await pool.query(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1`,
      [product_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const priceHistory = await pool.query('SELECT * FROM price_history WHERE product_id = $1 ORDER BY created_at DESC LIMIT 10', [product_id]);
    const aiResult = await optimizePrice(result.rows[0], priceHistory.rows.map(r => r.new_price));
    const content = aiResult.choices[0].message.content;
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { raw_response: content }; }

    await pool.query(
      `INSERT INTO ai_jobs (job_type, status, input_data, output_data, model, tokens_used, completed_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      ['price_optimization', 'completed', JSON.stringify({ product_id }), JSON.stringify(parsed), aiResult.model, aiResult.usage?.total_tokens]
    );

    res.json({ ai_result: parsed, product: result.rows[0], price_history: priceHistory.rows, model: aiResult.model, usage: aiResult.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/analyze-quality', authenticate, async (req, res) => {
  try {
    const { product_id } = req.body;
    const result = await pool.query(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1`,
      [product_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const aiResult = await analyzeQuality(result.rows[0]);
    const content = aiResult.choices[0].message.content;
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { raw_response: content }; }

    await pool.query(
      `INSERT INTO ai_jobs (job_type, status, input_data, output_data, model, tokens_used, completed_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      ['quality_analysis', 'completed', JSON.stringify({ product_id }), JSON.stringify(parsed), aiResult.model, aiResult.usage?.total_tokens]
    );

    if (parsed.quality_score) {
      await pool.query('UPDATE products SET quality_score = $1 WHERE id = $2', [parsed.quality_score, product_id]);
    }

    res.json({ ai_result: parsed, product: result.rows[0], model: aiResult.model, usage: aiResult.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/jobs', authenticate, async (req, res) => {
  try {
    const { type, status } = req.query;
    let query = 'SELECT * FROM ai_jobs WHERE 1=1';
    const params = [];
    let idx = 1;
    if (type) { query += ` AND job_type = $${idx}`; params.push(type); idx++; }
    if (status) { query += ` AND status = $${idx}`; params.push(status); idx++; }
    query += ' ORDER BY created_at DESC LIMIT 50';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
