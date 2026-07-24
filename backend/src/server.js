import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import pool from './db/connection.js';
import { createTables } from './db/schema.js';
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
import knowledgeWorkflowRoutes from './routes/knowledgeWorkflow.js';

// === BATCH 05 AUTO-MOUNT imports ===
import dedupeMergeAgentRouter from './routes/dedupe-merge-agent.js';
import visionProductEnrichRouter from './routes/vision-product-enrich.js';
import qualityAnomalyStreamRouter from './routes/quality-anomaly-stream.js';
import channelSyncRouter from './routes/channel-sync.js';
import verticalTemplatesRouter from './routes/vertical-templates.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

async function initializeRuntime() {
  if (process.env.MIGRATE_ON_START !== 'true') return;
  const email = process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Runtime admin credentials are required');
  await createTables();
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (email, password, name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name, role = EXCLUDED.role`,
    [email, passwordHash, process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator']
  );
}

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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
app.use('/api/knowledge-workflow', knowledgeWorkflowRoutes);

app.use(/^\/api\/(?:gap-|dedupe-merge-agent|vision-product-enrich|quality-anomaly-stream|channel-sync|vertical-templates)/, (req,res,next) => {
  if (process.env.ENABLE_EXPERIMENTAL_ROUTES === 'true') return next();
  return res.status(501).json({error:'Generated/provider-backed surface is quarantined',required:'ENABLE_EXPERIMENTAL_ROUTES=true plus documented provider configuration'});
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

initializeRuntime()
  .then(() => app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`)))
  .catch((error) => {
    console.error('Runtime initialization failed:', error.message);
    process.exit(1);
  });


// === BATCH 05 AUTO-MOUNT (custom feature suggestions) ===
app.use('/api/dedupe-merge-agent', dedupeMergeAgentRouter);
app.use('/api/vision-product-enrich', visionProductEnrichRouter);
app.use('/api/quality-anomaly-stream', qualityAnomalyStreamRouter);
app.use('/api/channel-sync', channelSyncRouter);
app.use('/api/vertical-templates', verticalTemplatesRouter);

// Generated gap routes remain quarantined until their ESM/auth/provider contracts are complete.
