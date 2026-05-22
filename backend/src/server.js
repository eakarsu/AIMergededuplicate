import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import pool from './db/connection.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import vendorRoutes from './routes/vendors.js';
import categoryRoutes from './routes/categories.js';
import duplicateRoutes from './routes/duplicates.js';
import aiRoutes from './routes/ai.js';
import aiBacklogRoutes from './routes/aiBacklog.js';
import importRoutes from './routes/imports.js';
import analyticsRoutes from './routes/analytics.js';
import customViewsRoutes from './routes/customViews.js';
import goldenRecordConfidenceRoutes from './routes/goldenRecordConfidence.js';

// === BATCH 05 AUTO-MOUNT imports ===
import dedupeMergeAgentRouter from './routes/dedupe-merge-agent.js';
import visionProductEnrichRouter from './routes/vision-product-enrich.js';
import qualityAnomalyStreamRouter from './routes/quality-anomaly-stream.js';
import channelSyncRouter from './routes/channel-sync.js';
import verticalTemplatesRouter from './routes/vertical-templates.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// AI-specific rate limiter (stricter)
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait before retrying.' },
});

app.use(generalLimiter);

// Audit log middleware — writes to audit_log table on all mutations
async function auditLog(req, res, next) {
  res.on('finish', async () => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && res.statusCode < 400) {
      const pathParts = req.path.split('/').filter(Boolean);
      const entityType = pathParts[0] || 'unknown';
      const entityId = req.params?.id || null;
      try {
        await pool.query(
          `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_data, ip_address) VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
          [
            req.user?.id || null,
            req.method === 'POST' ? 'CREATE' : req.method === 'PUT' ? 'UPDATE' : 'DELETE',
            entityType,
            entityId,
            JSON.stringify(req.body).slice(0, 1000),
            req.ip,
          ]
        );
      } catch (e) { /* silent */ }
    }
  });
  next();
}
app.use(auditLog);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/duplicates', duplicateRoutes);
app.use('/api/ai', aiRateLimiter, aiRoutes);
app.use('/api/ai-backlog', aiBacklogRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/custom-views', customViewsRoutes);
app.use('/api/golden-record-confidence', goldenRecordConfidenceRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});


// === BATCH 05 AUTO-MOUNT (custom feature suggestions) ===
app.use('/api/dedupe-merge-agent', dedupeMergeAgentRouter);
app.use('/api/vision-product-enrich', visionProductEnrichRouter);
app.use('/api/quality-anomaly-stream', qualityAnomalyStreamRouter);
app.use('/api/channel-sync', channelSyncRouter);
app.use('/api/vertical-templates', verticalTemplatesRouter);

// === Batch 05 Gaps & Frontend Mounts ===
try { const _gap_detect_duplicates_realtime = require('./routes/gap-detect-duplicates-realtime'); app.use('/api/gap-detect-duplicates-realtime', _gap_detect_duplicates_realtime); } catch(e) { console.error('gap mount fail detect-duplicates-realtime:', e.message); }
try { const _gap_merge_rules_suggest = require('./routes/gap-merge-rules-suggest'); app.use('/api/gap-merge-rules-suggest', _gap_merge_rules_suggest); } catch(e) { console.error('gap mount fail merge-rules-suggest:', e.message); }
try { const _gap_image_similarity = require('./routes/gap-image-similarity'); app.use('/api/gap-image-similarity', _gap_image_similarity); } catch(e) { console.error('gap mount fail image-similarity:', e.message); }
try { const _gap_pricing_trend_analyzer = require('./routes/gap-pricing-trend-analyzer'); app.use('/api/gap-pricing-trend-analyzer', _gap_pricing_trend_analyzer); } catch(e) { console.error('gap mount fail pricing-trend-analyzer:', e.message); }
try { const _gap_image = require('./routes/gap-image'); app.use('/api/gap-image', _gap_image); } catch(e) { console.error('gap mount fail image:', e.message); }
try { const _gap_bulk = require('./routes/gap-bulk'); app.use('/api/gap-bulk', _gap_bulk); } catch(e) { console.error('gap mount fail bulk:', e.message); }
try { const _gap_merge = require('./routes/gap-merge'); app.use('/api/gap-merge', _gap_merge); } catch(e) { console.error('gap mount fail merge:', e.message); }
try { const _gap_ecommerce = require('./routes/gap-ecommerce'); app.use('/api/gap-ecommerce', _gap_ecommerce); } catch(e) { console.error('gap mount fail ecommerce:', e.message); }
try { const _gap_inventory = require('./routes/gap-inventory'); app.use('/api/gap-inventory', _gap_inventory); } catch(e) { console.error('gap mount fail inventory:', e.message); }
try { const _gap_supplier = require('./routes/gap-supplier'); app.use('/api/gap-supplier', _gap_supplier); } catch(e) { console.error('gap mount fail supplier:', e.message); }
try { const _gap_notifications = require('./routes/gap-notifications'); app.use('/api/gap-notifications', _gap_notifications); } catch(e) { console.error('gap mount fail notifications:', e.message); }
// === End Batch 05 Mounts ===
