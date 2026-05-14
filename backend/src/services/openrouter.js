import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

export async function callOpenRouter(messages, options = {}) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'E-Commerce Catalog Manager',
    },
    body: JSON.stringify({
      model: options.model || OPENROUTER_MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens || 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data;
}

// Helper: parse AI response, extract first JSON object
export function parseAIJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    return null;
  }
}

export async function detectDuplicates(product1, product2) {
  const messages = [
    {
      role: 'system',
      content: `You are an expert e-commerce product deduplication AI. Analyze two product listings and determine if they are duplicates. Return ONLY valid JSON — no markdown.`
    },
    {
      role: 'user',
      content: `Compare these two product listings:\n\nProduct 1:\n- Name: ${product1.name}\n- SKU: ${product1.sku}\n- Brand: ${product1.brand}\n- Price: $${product1.price}\n- Description: ${product1.description}\n- Barcode: ${product1.barcode}\n- Weight: ${product1.weight}\n\nProduct 2:\n- Name: ${product2.name}\n- SKU: ${product2.sku}\n- Brand: ${product2.brand}\n- Price: $${product2.price}\n- Description: ${product2.description}\n- Barcode: ${product2.barcode}\n- Weight: ${product2.weight}\n\nReturn JSON: { "is_duplicate": <bool>, "confidence": <0-100>, "matching_fields": ["<field>"], "suggested_primary_id": <1 or 2>, "merge_recommendation": "<brief advice>", "reasoning": "<explanation>" }`
    }
  ];
  return callOpenRouter(messages);
}

export async function generateProductDescription(product) {
  const messages = [
    {
      role: 'system',
      content: `You are an expert e-commerce copywriter. Generate a compelling, SEO-optimized product description. Return ONLY valid JSON — no markdown.`
    },
    {
      role: 'user',
      content: `Generate a product description for:\n- Name: ${product.name}\n- Brand: ${product.brand}\n- Category: ${product.category_name || 'General'}\n- Price: $${product.price}\n- Current Description: ${product.description || 'None'}\n\nReturn JSON: { "title": "", "short_description": "", "long_description": "", "key_features": [], "seo_keywords": [], "target_audience": "" }`
    }
  ];
  return callOpenRouter(messages);
}

export async function suggestCategory(productName, productDescription) {
  const messages = [
    {
      role: 'system',
      content: `You are an e-commerce category expert. Return ONLY valid JSON — no markdown.`
    },
    {
      role: 'user',
      content: `Suggest a category for:\n- Product Name: ${productName}\n- Description: ${productDescription || 'Not provided'}\n\nReturn JSON: { "primary_category": "", "subcategory": "", "confidence": <0-1>, "alternative_categories": [], "reasoning": "" }`
    }
  ];
  return callOpenRouter(messages);
}

export async function optimizePrice(product, competitorPrices = []) {
  const messages = [
    {
      role: 'system',
      content: `You are a pricing strategy expert for e-commerce. Return ONLY valid JSON — no markdown.`
    },
    {
      role: 'user',
      content: `Optimize pricing for:\n- Product: ${product.name}\n- Brand: ${product.brand}\n- Current Price: $${product.price}\n- Cost: $${product.cost || 'Unknown'}\n- Category: ${product.category_name || 'General'}\n${competitorPrices.length ? `- Competitor Prices: ${competitorPrices.join(', ')}` : ''}\n\nReturn JSON: { "suggested_price": <number>, "price_range": { "min": <number>, "max": <number> }, "pricing_strategy": "", "reasoning": "", "market_position": "budget|mid-range|premium|luxury", "seasonal_adjustments": [] }`
    }
  ];
  return callOpenRouter(messages);
}

export async function analyzeQuality(product) {
  const messages = [
    {
      role: 'system',
      content: `You are a data quality analyst for e-commerce catalogs. Return ONLY valid JSON — no markdown.`
    },
    {
      role: 'user',
      content: `Analyze data quality for:\n- SKU: ${product.sku}\n- Name: ${product.name}\n- Brand: ${product.brand || 'Missing'}\n- Description: ${product.description || 'Missing'}\n- Price: ${product.price || 'Missing'}\n- Category: ${product.category_name || 'Missing'}\n- Barcode: ${product.barcode || 'Missing'}\n- Weight: ${product.weight || 'Missing'}\n- Dimensions: ${product.dimensions || 'Missing'}\n\nReturn JSON: { "quality_score": <0-5>, "issues": [{ "field": "", "severity": "high|medium|low", "description": "" }], "suggestions": [], "completeness_score": <0-100>, "accuracy_indicators": { "naming_quality": <0-100>, "description_quality": <0-100>, "pricing_accuracy": <0-100> } }`
    }
  ];
  return callOpenRouter(messages);
}

export async function suggestMerge(products) {
  const productList = products.map((p, i) => `Product ${i + 1}: Name="${p.name}", SKU="${p.sku}", Price=$${p.price}, Quality=${p.quality_score}, Stock=${p.stock_quantity}, Vendor="${p.vendor_name || 'Unknown'}"`).join('\n');
  const messages = [
    {
      role: 'system',
      content: `You are an expert at merging duplicate product listings in e-commerce. Return ONLY valid JSON — no markdown.`
    },
    {
      role: 'user',
      content: `Suggest how to merge these duplicate products:\n${productList}\n\nReturn JSON: { "merged_fields": [{ "field": "", "strategy": "keep_primary|keep_secondary|combine|highest|lowest", "value": "", "reason": "" }], "recommended_primary": <product number>, "data_quality_notes": "", "risk_assessment": "low|medium|high", "expected_benefits": { "inventory_accuracy": "", "search_improvement": "", "customer_experience": "" } }`
    }
  ];
  return callOpenRouter(messages);
}
