import { Router } from 'express';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { generateProductDescription, suggestCategory, optimizePrice, analyzeQuality, detectDuplicates, suggestMerge, parseAIJson, callOpenRouter } from '../services/openrouter.js';

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

// POST /api/ai/detect-duplicates — find candidate duplicates for a product
router.post('/detect-duplicates', authenticate, async (req, res) => {
  try {
    const { product_id, candidate_ids } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });

    const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
    if (productResult.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const product = productResult.rows[0];

    let candidates = [];
    if (Array.isArray(candidate_ids) && candidate_ids.length) {
      const r = await pool.query('SELECT * FROM products WHERE id = ANY($1::int[])', [candidate_ids]);
      candidates = r.rows;
    } else {
      const r = await pool.query(
        `SELECT * FROM products WHERE id <> $1 AND (LOWER(name) LIKE LOWER($2) OR sku = $3) LIMIT 10`,
        [product_id, `%${(product.name || '').slice(0, 20)}%`, product.sku || null]
      );
      candidates = r.rows;
    }

    const matches = [];
    for (const cand of candidates.slice(0, 5)) {
      const aiResult = await detectDuplicates(product, cand);
      const content = aiResult.choices[0].message.content;
      const parsed = parseAIJson(content) || { raw_response: content };
      matches.push({ candidate_id: cand.id, candidate_name: cand.name, ai_result: parsed });
    }

    await pool.query(
      `INSERT INTO ai_jobs (job_type, status, input_data, output_data, completed_at) VALUES ($1,$2,$3,$4,NOW())`,
      ['duplicate_detection', 'completed', JSON.stringify({ product_id, candidate_ids: candidates.map(c => c.id) }), JSON.stringify(matches)]
    );

    res.json({ product, matches });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/ai/merge-rules-suggest — suggest merge criteria across a set of products
router.post('/merge-rules-suggest', authenticate, async (req, res) => {
  try {
    const { product_ids } = req.body;
    if (!Array.isArray(product_ids) || product_ids.length < 2) {
      return res.status(400).json({ error: 'product_ids array (>= 2) is required' });
    }
    const r = await pool.query('SELECT * FROM products WHERE id = ANY($1::int[])', [product_ids]);
    if (r.rows.length < 2) return res.status(404).json({ error: 'Not enough products found' });

    const aiResult = await suggestMerge(r.rows);
    const content = aiResult.choices[0].message.content;
    const parsed = parseAIJson(content) || { raw_response: content };

    await pool.query(
      `INSERT INTO ai_jobs (job_type, status, input_data, output_data, model, tokens_used, completed_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      ['merge_rules_suggest', 'completed', JSON.stringify({ product_ids }), JSON.stringify(parsed), aiResult.model, aiResult.usage?.total_tokens]
    );

    res.json({ ai_result: parsed, products: r.rows, model: aiResult.model, usage: aiResult.usage });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/ai/pricing-trend-analyzer
router.post('/pricing-trend-analyzer', authenticate, async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || /^your[_-]?openrouter[_-]?api[_-]?key/i.test(apiKey)) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }

    const { product_id, days } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });
    const lookback = parseInt(days) || 90;

    const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
    if (productResult.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const product = productResult.rows[0];

    const history = await pool.query(
      `SELECT old_price, new_price, changed_by, created_at FROM price_history
       WHERE product_id = $1 AND created_at >= NOW() - INTERVAL '${lookback} days'
       ORDER BY created_at ASC`,
      [product_id]
    );

    if (history.rows.length === 0) {
      return res.status(404).json({ error: `No price history found for product ${product_id} in the last ${lookback} days` });
    }

    const messages = [
      { role: 'system', content: 'You are a pricing analyst. Reply ONLY with valid JSON.' },
      { role: 'user', content: `Analyze the pricing history for the product and produce trend analysis.

Product: ${JSON.stringify({ id: product.id, name: product.name, sku: product.sku, current_price: product.price })}

Price history (last ${lookback} days, ascending):
${JSON.stringify(history.rows)}

Return JSON:
{
  "trend": "rising|falling|stable|volatile",
  "average_price": <number>,
  "price_change_pct": <number>,
  "volatility_score": <0-1>,
  "anomalies": [ { "date": "...", "price": <number>, "reason": "string" } ],
  "forecast_next_30_days": { "expected_price": <number>, "low": <number>, "high": <number> },
  "recommended_actions": ["string"],
  "confidence": "low|medium|high"
}` }
    ];

    const aiResult = await callOpenRouter(messages, { max_tokens: 1500 });
    const content = aiResult.choices[0].message.content;
    const parsed = parseAIJson(content) || { raw_response: content };

    await pool.query(
      `INSERT INTO ai_jobs (job_type, status, input_data, output_data, model, tokens_used, completed_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      ['pricing_trend_analyzer', 'completed', JSON.stringify({ product_id, days: lookback }), JSON.stringify(parsed), aiResult.model, aiResult.usage?.total_tokens]
    );

    res.json({ product, history_count: history.rows.length, days: lookback, analysis: parsed, model: aiResult.model, usage: aiResult.usage });
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
