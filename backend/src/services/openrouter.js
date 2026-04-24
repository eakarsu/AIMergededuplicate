import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

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
      temperature: options.temperature || 0.3,
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

export async function detectDuplicates(product1, product2) {
  const messages = [
    {
      role: 'system',
      content: `You are an expert e-commerce product deduplication AI. Analyze two product listings and determine if they are duplicates of the same item. Return a JSON response with: confidence (0-100), is_duplicate (boolean), reasoning (string), matching_fields (array of field names that match), and suggested_primary (1 or 2, which listing has better data quality).`
    },
    {
      role: 'user',
      content: `Compare these two product listings:\n\nProduct 1:\n- Name: ${product1.name}\n- SKU: ${product1.sku}\n- Brand: ${product1.brand}\n- Price: $${product1.price}\n- Description: ${product1.description}\n- Barcode: ${product1.barcode}\n- Weight: ${product1.weight}\n\nProduct 2:\n- Name: ${product2.name}\n- SKU: ${product2.sku}\n- Brand: ${product2.brand}\n- Price: $${product2.price}\n- Description: ${product2.description}\n- Barcode: ${product2.barcode}\n- Weight: ${product2.weight}\n\nReturn ONLY valid JSON.`
    }
  ];
  return callOpenRouter(messages);
}

export async function generateProductDescription(product) {
  const messages = [
    {
      role: 'system',
      content: `You are an expert e-commerce copywriter. Generate a compelling, SEO-optimized product description. Return a JSON response with: title (optimized product title), short_description (50-80 words), long_description (150-200 words), key_features (array of 5 bullet points), seo_keywords (array of 10 keywords), and target_audience (string).`
    },
    {
      role: 'user',
      content: `Generate a product description for:\n- Name: ${product.name}\n- Brand: ${product.brand}\n- Category: ${product.category_name || 'General'}\n- Price: $${product.price}\n- Current Description: ${product.description || 'None'}\n\nReturn ONLY valid JSON.`
    }
  ];
  return callOpenRouter(messages);
}

export async function suggestCategory(productName, productDescription) {
  const messages = [
    {
      role: 'system',
      content: `You are an e-commerce category expert. Suggest the best product category for the given product. Return a JSON response with: primary_category (string), subcategory (string), confidence (0-1), alternative_categories (array of 3 alternatives with name and confidence), and reasoning (string).`
    },
    {
      role: 'user',
      content: `Suggest a category for:\n- Product Name: ${productName}\n- Description: ${productDescription || 'Not provided'}\n\nReturn ONLY valid JSON.`
    }
  ];
  return callOpenRouter(messages);
}

export async function optimizePrice(product, competitorPrices = []) {
  const messages = [
    {
      role: 'system',
      content: `You are a pricing strategy expert for e-commerce. Analyze the product and suggest optimal pricing. Return a JSON response with: suggested_price (number), price_range (object with min and max), pricing_strategy (string), reasoning (string), market_position (string: budget/mid-range/premium/luxury), and seasonal_adjustments (array of objects with month and multiplier).`
    },
    {
      role: 'user',
      content: `Optimize pricing for:\n- Product: ${product.name}\n- Brand: ${product.brand}\n- Current Price: $${product.price}\n- Cost: $${product.cost || 'Unknown'}\n- Category: ${product.category_name || 'General'}\n${competitorPrices.length ? `- Competitor Prices: ${competitorPrices.join(', ')}` : ''}\n\nReturn ONLY valid JSON.`
    }
  ];
  return callOpenRouter(messages);
}

export async function analyzeQuality(product) {
  const messages = [
    {
      role: 'system',
      content: `You are a data quality analyst for e-commerce catalogs. Analyze a product listing for data quality issues. Return a JSON response with: quality_score (0-5), issues (array of objects with field, severity: high/medium/low, and description), suggestions (array of improvement suggestions), completeness_score (0-100), and accuracy_indicators (object with naming_quality, description_quality, pricing_accuracy, each 0-100).`
    },
    {
      role: 'user',
      content: `Analyze data quality for:\n- SKU: ${product.sku}\n- Name: ${product.name}\n- Brand: ${product.brand || 'Missing'}\n- Description: ${product.description || 'Missing'}\n- Price: ${product.price || 'Missing'}\n- Category: ${product.category_name || 'Missing'}\n- Barcode: ${product.barcode || 'Missing'}\n- Weight: ${product.weight || 'Missing'}\n- Dimensions: ${product.dimensions || 'Missing'}\n\nReturn ONLY valid JSON.`
    }
  ];
  return callOpenRouter(messages);
}

export async function suggestMerge(products) {
  const productList = products.map((p, i) => `Product ${i + 1}: Name="${p.name}", SKU="${p.sku}", Price=$${p.price}, Quality=${p.quality_score}, Stock=${p.stock_quantity}, Vendor="${p.vendor_name || 'Unknown'}"`).join('\n');
  const messages = [
    {
      role: 'system',
      content: `You are an expert at merging duplicate product listings in e-commerce. Analyze the duplicate products and suggest how to merge them. Return a JSON response with: recommended_primary (product number to keep), merge_strategy (object mapping each field to a strategy: keep_primary, keep_highest, keep_lowest, combine, sum), reasoning (string), expected_benefits (object with inventory_accuracy, search_improvement, customer_experience, each as a description string), and risk_assessment (string: low/medium/high with explanation).`
    },
    {
      role: 'user',
      content: `Suggest how to merge these duplicate products:\n${productList}\n\nReturn ONLY valid JSON.`
    }
  ];
  return callOpenRouter(messages);
}
