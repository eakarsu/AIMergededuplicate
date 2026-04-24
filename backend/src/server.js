import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import vendorRoutes from './routes/vendors.js';
import categoryRoutes from './routes/categories.js';
import duplicateRoutes from './routes/duplicates.js';
import aiRoutes from './routes/ai.js';
import importRoutes from './routes/imports.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/duplicates', duplicateRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
