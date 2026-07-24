import pool from './connection.js';
import { createTables } from './schema.js';
import bcrypt from 'bcryptjs';

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12 || password.length > 1024) throw new Error('DEMO_PASSWORD must contain 12-1024 characters');
  return password;
}

async function seed() {
  try {
    console.log('Creating tables...');
    await createTables();

    console.log('Seeding data...');

    // Seed Users
    const hashedPassword = await bcrypt.hash(requireDemoPassword(), 10);
    await pool.query(`
      INSERT INTO users (email, password, name, role) VALUES
      ('admin@catalog.com', $1, 'Admin User', 'admin')
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);

    // Seed Vendors (15+)
    await pool.query(`
      INSERT INTO vendors (name, code, contact_email, phone, address, status, reliability_score, total_products) VALUES
      ('TechFlow Electronics', 'TFE001', 'sales@techflow.com', '+1-555-0101', '123 Tech Blvd, San Jose, CA', 'active', 4.50, 120),
      ('GlobalSource Trading', 'GST002', 'info@globalsource.com', '+1-555-0102', '456 Trade St, New York, NY', 'active', 3.80, 85),
      ('PremiumGoods Inc', 'PGI003', 'contact@premiumgoods.com', '+1-555-0103', '789 Premium Ave, Chicago, IL', 'active', 4.20, 200),
      ('ValueMart Wholesale', 'VMW004', 'orders@valuemart.com', '+1-555-0104', '321 Value Rd, Dallas, TX', 'active', 3.50, 150),
      ('SwiftShip Direct', 'SSD005', 'hello@swiftship.com', '+1-555-0105', '654 Swift Ln, Seattle, WA', 'active', 4.70, 90),
      ('NexGen Supply Co', 'NGS006', 'sales@nexgensupply.com', '+1-555-0106', '987 Next St, Miami, FL', 'active', 3.90, 75),
      ('AllParts Distribution', 'APD007', 'info@allparts.com', '+1-555-0107', '147 Parts Blvd, Denver, CO', 'active', 4.10, 180),
      ('EastWest Imports', 'EWI008', 'trade@eastwest.com', '+1-555-0108', '258 Import Dr, Los Angeles, CA', 'active', 3.60, 95),
      ('QualityFirst Brands', 'QFB009', 'support@qualityfirst.com', '+1-555-0109', '369 Quality Way, Boston, MA', 'active', 4.80, 60),
      ('MegaStock Corp', 'MSC010', 'bulk@megastock.com', '+1-555-0110', '741 Mega Blvd, Houston, TX', 'active', 3.70, 220),
      ('ProVendor Group', 'PVG011', 'contact@provendor.com', '+1-555-0111', '852 Pro St, Phoenix, AZ', 'active', 4.00, 110),
      ('SmartTrade LLC', 'STL012', 'deals@smarttrade.com', '+1-555-0112', '963 Smart Ave, Portland, OR', 'inactive', 2.90, 45),
      ('DirectSource Asia', 'DSA013', 'order@directsource.com', '+1-555-0113', '159 Direct Rd, San Francisco, CA', 'active', 4.30, 170),
      ('BulkBuy Express', 'BBE014', 'sales@bulkbuy.com', '+1-555-0114', '267 Bulk Dr, Atlanta, GA', 'active', 3.40, 130),
      ('TopShelf Distributors', 'TSD015', 'info@topshelf.com', '+1-555-0115', '378 Top Blvd, Nashville, TN', 'active', 4.60, 80),
      ('FairPrice Sourcing', 'FPS016', 'source@fairprice.com', '+1-555-0116', '489 Fair St, Minneapolis, MN', 'active', 3.80, 100)
      ON CONFLICT (code) DO NOTHING
    `);

    // Seed Categories (15+)
    await pool.query(`
      INSERT INTO categories (name, slug, description, product_count, status) VALUES
      ('Electronics', 'electronics', 'Electronic devices and accessories', 45, 'active'),
      ('Laptops', 'laptops', 'Portable computers and notebooks', 20, 'active'),
      ('Smartphones', 'smartphones', 'Mobile phones and accessories', 25, 'active'),
      ('Audio Equipment', 'audio-equipment', 'Speakers, headphones, and audio gear', 18, 'active'),
      ('Home Appliances', 'home-appliances', 'Kitchen and home appliances', 30, 'active'),
      ('Clothing', 'clothing', 'Apparel and fashion items', 50, 'active'),
      ('Sports & Outdoors', 'sports-outdoors', 'Sporting goods and outdoor equipment', 22, 'active'),
      ('Books & Media', 'books-media', 'Books, music, and digital media', 15, 'active'),
      ('Health & Beauty', 'health-beauty', 'Personal care and beauty products', 35, 'active'),
      ('Toys & Games', 'toys-games', 'Toys, games, and entertainment', 28, 'active'),
      ('Office Supplies', 'office-supplies', 'Office and school supplies', 12, 'active'),
      ('Automotive', 'automotive', 'Car parts and accessories', 16, 'active'),
      ('Garden & Patio', 'garden-patio', 'Garden tools and outdoor furniture', 10, 'active'),
      ('Pet Supplies', 'pet-supplies', 'Pet food, toys, and accessories', 14, 'active'),
      ('Jewelry & Watches', 'jewelry-watches', 'Fine jewelry and timepieces', 8, 'active'),
      ('Food & Beverages', 'food-beverages', 'Gourmet food and drinks', 20, 'active')
      ON CONFLICT (slug) DO NOTHING
    `);

    // Seed Products (30+ items with deliberate duplicates for dedup feature)
    await pool.query(`
      INSERT INTO products (sku, name, description, brand, category_id, vendor_id, price, cost, stock_quantity, weight, barcode, status, quality_score) VALUES
      ('SKU-ELEC-001', 'Apple MacBook Pro 14" M3 Pro', 'Latest MacBook Pro with M3 Pro chip, 18GB RAM, 512GB SSD', 'Apple', 2, 1, 1999.99, 1600.00, 45, 1.55, '194253945123', 'active', 4.80),
      ('SKU-ELEC-002', 'MacBook Pro 14 inch M3Pro', 'MacBook Pro M3 Pro processor 18GB memory 512GB storage', 'Apple', 2, 3, 2049.99, 1620.00, 30, 1.55, '194253945124', 'active', 3.20),
      ('SKU-ELEC-003', 'Samsung Galaxy S24 Ultra 256GB', 'Samsung flagship phone with S-Pen, 200MP camera, titanium frame', 'Samsung', 3, 1, 1299.99, 900.00, 80, 0.23, '887276789012', 'active', 4.50),
      ('SKU-ELEC-004', 'Galaxy S24 Ultra 256 GB Titanium', 'Samsung Galaxy S24 Ultra smartphone 256GB titanium design', 'Samsung', 3, 5, 1319.99, 920.00, 55, 0.23, '887276789013', 'active', 3.10),
      ('SKU-ELEC-005', 'Sony WH-1000XM5 Headphones', 'Industry-leading noise canceling wireless headphones', 'Sony', 4, 2, 349.99, 220.00, 120, 0.25, '027242923454', 'active', 4.90),
      ('SKU-ELEC-006', 'Sony WH1000XM5 Wireless NC', 'Sony premium noise-cancelling over-ear headphones', 'Sony', 4, 7, 359.99, 230.00, 95, 0.25, '027242923455', 'active', 3.40),
      ('SKU-ELEC-007', 'Dell XPS 15 i7 32GB', 'Dell XPS 15 laptop with Intel i7, 32GB RAM, 1TB SSD', 'Dell', 2, 4, 1749.99, 1300.00, 35, 1.86, '884116456789', 'active', 4.60),
      ('SKU-ELEC-008', 'iPad Air M2 11-inch 256GB', 'Apple iPad Air with M2 chip, 11-inch Liquid Retina display', 'Apple', 1, 1, 799.99, 600.00, 60, 0.46, '194253678901', 'active', 4.70),
      ('SKU-ELEC-009', 'Apple iPad Air (M2) 11" 256 GB', 'iPad Air featuring M2 processor 256GB WiFi model', 'Apple', 1, 6, 819.99, 615.00, 40, 0.46, '194253678902', 'active', 3.00),
      ('SKU-ELEC-010', 'Dyson V15 Detect Vacuum', 'Cordless vacuum with laser dust detection technology', 'Dyson', 5, 3, 749.99, 500.00, 25, 2.95, '885609034567', 'active', 4.40),
      ('SKU-ELEC-011', 'Dyson V15 Detect Absolute', 'Dyson cordless vacuum cleaner with laser illumination', 'Dyson', 5, 8, 769.99, 510.00, 18, 2.95, '885609034568', 'active', 3.30),
      ('SKU-ELEC-012', 'Nike Air Max 270 Black/White', 'Nike lifestyle sneakers with Max Air unit', 'Nike', 6, 4, 159.99, 80.00, 200, 0.35, '194501234567', 'active', 4.20),
      ('SKU-ELEC-013', 'NIKE Air Max 270 Blk/Wht', 'Air Max 270 sneaker black and white colorway', 'Nike', 6, 10, 164.99, 82.00, 150, 0.35, '194501234568', 'active', 2.80),
      ('SKU-ELEC-014', 'Bose QuietComfort Ultra Earbuds', 'Premium true wireless earbuds with spatial audio', 'Bose', 4, 5, 299.99, 180.00, 75, 0.07, '017817845678', 'active', 4.80),
      ('SKU-ELEC-015', 'Bose QC Ultra Earbuds TWS', 'Bose QuietComfort Ultra true wireless noise cancelling', 'Bose', 4, 9, 309.99, 185.00, 50, 0.07, '017817845679', 'active', 3.50),
      ('SKU-HOME-001', 'KitchenAid Artisan Stand Mixer 5Qt', 'Iconic tilt-head stand mixer with 10 speeds', 'KitchenAid', 5, 3, 449.99, 280.00, 40, 11.79, '883049534567', 'active', 4.70),
      ('SKU-HOME-002', 'Kitchen Aid Artisan Mixer 5 Quart', 'KitchenAid 5-quart artisan series stand mixer', 'KitchenAid', 5, 11, 459.99, 285.00, 28, 11.79, '883049534568', 'active', 3.20),
      ('SKU-SPRT-001', 'Garmin Fenix 7X Solar', 'Multisport GPS watch with solar charging', 'Garmin', 7, 2, 899.99, 600.00, 20, 0.09, '753759345678', 'active', 4.90),
      ('SKU-SPRT-002', 'GARMIN fenix 7X Solar Edition', 'Garmin Fenix 7X GPS smartwatch solar powered', 'Garmin', 7, 14, 919.99, 610.00, 15, 0.09, '753759345679', 'active', 3.10),
      ('SKU-BOOK-001', 'Kindle Paperwhite 11th Gen 16GB', 'Amazon Kindle with 6.8" display and adjustable warm light', 'Amazon', 8, 6, 149.99, 90.00, 100, 0.21, '840080589012', 'active', 4.50),
      ('SKU-HLTH-001', 'Philips Sonicare DiamondClean', 'Premium electric toothbrush with smart sensor', 'Philips', 9, 7, 229.99, 130.00, 65, 0.35, '075020089012', 'active', 4.30),
      ('SKU-HLTH-002', 'Philips Sonicare Diamond Clean Smart', 'Sonicare premium power toothbrush diamond clean', 'Philips', 9, 13, 239.99, 135.00, 48, 0.35, '075020089013', 'active', 3.00),
      ('SKU-TOYS-001', 'LEGO Star Wars Millennium Falcon', 'Ultimate Collector Series Millennium Falcon 7541 pieces', 'LEGO', 10, 8, 849.99, 550.00, 10, 14.99, '673419456789', 'active', 4.90),
      ('SKU-OFFC-001', 'Herman Miller Aeron Chair', 'Ergonomic office chair with PostureFit SL support', 'Herman Miller', 11, 9, 1395.00, 900.00, 15, 19.05, '814698012345', 'active', 4.80),
      ('SKU-OFFC-002', 'HermanMiller Aeron Ergonomic Chair', 'Aeron fully loaded ergonomic desk chair size B', 'Herman Miller', 11, 15, 1425.00, 920.00, 10, 19.05, '814698012346', 'active', 3.40),
      ('SKU-AUTO-001', 'Michelin Pilot Sport 4S 245/40R18', 'Ultra-high performance summer tire', 'Michelin', 12, 10, 289.99, 180.00, 80, 10.20, '086699123456', 'active', 4.60),
      ('SKU-GRDN-001', 'Weber Spirit II E-310 Gas Grill', '3-burner propane gas grill with side tables', 'Weber', 13, 11, 519.99, 350.00, 20, 52.16, '077924123456', 'active', 4.50),
      ('SKU-PET-001', 'Dyson Groom Tool Attachment', 'Pet grooming tool for Dyson vacuums', 'Dyson', 14, 3, 49.99, 25.00, 150, 0.30, '885609078901', 'active', 4.00),
      ('SKU-JWLR-001', 'Citizen Eco-Drive Promaster', 'Solar-powered dive watch 200m water resistant', 'Citizen', 15, 12, 349.99, 200.00, 30, 0.18, '013205145678', 'active', 4.40),
      ('SKU-FOOD-001', 'Nespresso Vertuo Next Bundle', 'Coffee and espresso machine with milk frother', 'Nespresso', 16, 14, 199.99, 120.00, 55, 4.08, '034264678901', 'active', 4.30),
      ('SKU-FOOD-002', 'Nespresso VertuoNext Coffee Machine Bundle', 'Vertuo Next coffee maker with Aeroccino frother', 'Nespresso', 16, 16, 209.99, 125.00, 40, 4.08, '034264678902', 'active', 3.10)
      ON CONFLICT (sku) DO NOTHING
    `);

    // Seed Duplicate Groups
    await pool.query(`
      INSERT INTO duplicate_groups (name, confidence, status, ai_reasoning) VALUES
      ('MacBook Pro 14" M3 Pro Variants', 92.50, 'pending', 'Both products are Apple MacBook Pro 14-inch with M3 Pro chip. SKU-ELEC-001 and SKU-ELEC-002 differ only in naming convention and minor price differences. Same weight and specs confirm duplicate.'),
      ('Samsung Galaxy S24 Ultra 256GB Variants', 95.00, 'pending', 'Identical Samsung Galaxy S24 Ultra 256GB phones from different vendors. Same weight, similar barcodes, price within 2% range.'),
      ('Sony WH-1000XM5 Headphones Variants', 88.50, 'pending', 'Same Sony WH-1000XM5 headphones listed with different naming conventions. Identical weight and similar specifications confirm match.'),
      ('iPad Air M2 Variants', 90.00, 'pending', 'Apple iPad Air M2 11-inch 256GB listed by two vendors with different SKUs but identical specs and weight.'),
      ('Dyson V15 Detect Variants', 87.00, 'pending', 'Dyson V15 Detect vacuum cleaner variants - same product with Detect vs Detect Absolute naming.'),
      ('Nike Air Max 270 Variants', 93.50, 'pending', 'Nike Air Max 270 in black/white colorway from two vendors. Abbreviated naming in one listing.'),
      ('Bose QC Ultra Earbuds Variants', 91.00, 'pending', 'Bose QuietComfort Ultra Earbuds with different naming conventions but identical product.'),
      ('KitchenAid Artisan Mixer Variants', 89.00, 'pending', 'KitchenAid Artisan 5-quart stand mixer listed with spacing differences in brand name.'),
      ('Garmin Fenix 7X Solar Variants', 94.00, 'pending', 'Garmin Fenix 7X Solar watch with capitalization differences between listings.'),
      ('Philips Sonicare DiamondClean Variants', 86.50, 'pending', 'Philips Sonicare DiamondClean toothbrush with minor naming variations.'),
      ('Herman Miller Aeron Chair Variants', 88.00, 'pending', 'Herman Miller Aeron ergonomic chair with spacing difference in brand name.'),
      ('Nespresso Vertuo Next Variants', 90.50, 'pending', 'Nespresso Vertuo Next bundle with different naming formats for same product.'),
      ('MacBook Pro Display Group', 78.00, 'resolved', 'Lower confidence match - same brand but different product generations.'),
      ('Electronics Audio Bundle', 65.00, 'dismissed', 'False positive - different product categories despite brand similarity.'),
      ('Premium Headphones Group', 72.00, 'pending', 'Cross-brand comparison of premium headphone category.')
      ON CONFLICT DO NOTHING
    `);

    // Seed Duplicate Group Items
    await pool.query(`
      INSERT INTO duplicate_group_items (group_id, product_id, is_primary, similarity_score) VALUES
      (1, 1, true, 100.00), (1, 2, false, 92.50),
      (2, 3, true, 100.00), (2, 4, false, 95.00),
      (3, 5, true, 100.00), (3, 6, false, 88.50),
      (4, 8, true, 100.00), (4, 9, false, 90.00),
      (5, 10, true, 100.00), (5, 11, false, 87.00),
      (6, 12, true, 100.00), (6, 13, false, 93.50),
      (7, 14, true, 100.00), (7, 15, false, 91.00),
      (8, 16, true, 100.00), (8, 17, false, 89.00),
      (9, 18, true, 100.00), (9, 19, false, 94.00),
      (10, 21, true, 100.00), (10, 22, false, 86.50),
      (11, 24, true, 100.00), (11, 25, false, 88.00),
      (12, 30, true, 100.00), (12, 31, false, 90.50)
      ON CONFLICT DO NOTHING
    `);

    // Seed Merge History
    await pool.query(`
      INSERT INTO merge_history (source_product_id, target_product_id, duplicate_group_id, merged_by, merge_data) VALUES
      (2, 1, 13, 1, '{"fields_merged": ["price", "stock_quantity"], "source_sku": "SKU-LEGACY-001", "reason": "Confirmed duplicate by admin"}')
      ON CONFLICT DO NOTHING
    `);

    // Seed Bulk Imports
    await pool.query(`
      INSERT INTO bulk_imports (filename, vendor_id, total_rows, processed_rows, duplicates_found, errors, status, created_at) VALUES
      ('techflow_catalog_jan2024.csv', 1, 500, 500, 23, 2, 'completed', NOW() - INTERVAL '30 days'),
      ('globalsource_products.csv', 2, 350, 350, 15, 0, 'completed', NOW() - INTERVAL '25 days'),
      ('premiumgoods_full.csv', 3, 800, 800, 45, 5, 'completed', NOW() - INTERVAL '20 days'),
      ('valuemart_update.csv', 4, 200, 200, 8, 1, 'completed', NOW() - INTERVAL '15 days'),
      ('swiftship_new_items.csv', 5, 150, 150, 12, 0, 'completed', NOW() - INTERVAL '10 days'),
      ('nexgen_q1_catalog.csv', 6, 420, 420, 19, 3, 'completed', NOW() - INTERVAL '8 days'),
      ('allparts_inventory.csv', 7, 600, 600, 31, 4, 'completed', NOW() - INTERVAL '6 days'),
      ('eastwest_imports_feb.csv', 8, 280, 280, 14, 2, 'completed', NOW() - INTERVAL '5 days'),
      ('qualityfirst_premium.csv', 9, 180, 180, 7, 0, 'completed', NOW() - INTERVAL '4 days'),
      ('megastock_bulk.csv', 10, 900, 900, 52, 8, 'completed', NOW() - INTERVAL '3 days'),
      ('provendor_spring.csv', 11, 320, 320, 16, 1, 'completed', NOW() - INTERVAL '2 days'),
      ('directsource_asia.csv', 13, 450, 350, 20, 0, 'processing', NOW() - INTERVAL '1 day'),
      ('bulkbuy_express.csv', 14, 380, 0, 0, 0, 'pending', NOW()),
      ('topshelf_catalog.csv', 15, 250, 0, 0, 0, 'pending', NOW()),
      ('fairprice_q2.csv', 16, 300, 0, 0, 0, 'pending', NOW())
      ON CONFLICT DO NOTHING
    `);

    // Seed Price History
    await pool.query(`
      INSERT INTO price_history (product_id, old_price, new_price, changed_by, created_at) VALUES
      (1, 2199.99, 1999.99, 'TechFlow Electronics', NOW() - INTERVAL '60 days'),
      (1, 2099.99, 2199.99, 'System', NOW() - INTERVAL '90 days'),
      (3, 1399.99, 1299.99, 'TechFlow Electronics', NOW() - INTERVAL '30 days'),
      (5, 399.99, 349.99, 'GlobalSource Trading', NOW() - INTERVAL '45 days'),
      (7, 1849.99, 1749.99, 'ValueMart Wholesale', NOW() - INTERVAL '20 days'),
      (8, 849.99, 799.99, 'TechFlow Electronics', NOW() - INTERVAL '15 days'),
      (10, 799.99, 749.99, 'PremiumGoods Inc', NOW() - INTERVAL '10 days'),
      (12, 149.99, 159.99, 'ValueMart Wholesale', NOW() - INTERVAL '25 days'),
      (14, 329.99, 299.99, 'SwiftShip Direct', NOW() - INTERVAL '35 days'),
      (16, 479.99, 449.99, 'PremiumGoods Inc', NOW() - INTERVAL '50 days'),
      (18, 949.99, 899.99, 'GlobalSource Trading', NOW() - INTERVAL '40 days'),
      (20, 159.99, 149.99, 'NexGen Supply Co', NOW() - INTERVAL '55 days'),
      (24, 1495.00, 1395.00, 'QualityFirst Brands', NOW() - INTERVAL '22 days'),
      (27, 559.99, 519.99, 'ProVendor Group', NOW() - INTERVAL '18 days'),
      (30, 219.99, 199.99, 'BulkBuy Express', NOW() - INTERVAL '12 days')
      ON CONFLICT DO NOTHING
    `);

    // Seed Audit Log
    await pool.query(`
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_data, new_data, ip_address, created_at) VALUES
      (1, 'CREATE', 'product', 1, NULL, '{"name": "Apple MacBook Pro 14 M3 Pro"}', '192.168.1.100', NOW() - INTERVAL '30 days'),
      (1, 'UPDATE', 'product', 1, '{"price": 2199.99}', '{"price": 1999.99}', '192.168.1.100', NOW() - INTERVAL '25 days'),
      (1, 'CREATE', 'vendor', 1, NULL, '{"name": "TechFlow Electronics"}', '192.168.1.100', NOW() - INTERVAL '30 days'),
      (1, 'MERGE', 'duplicate_group', 13, '{"status": "pending"}', '{"status": "resolved"}', '192.168.1.100', NOW() - INTERVAL '20 days'),
      (1, 'DELETE', 'product', 99, '{"name": "Test Product"}', NULL, '192.168.1.100', NOW() - INTERVAL '15 days'),
      (1, 'UPDATE', 'category', 1, '{"name": "Tech"}', '{"name": "Electronics"}', '192.168.1.100', NOW() - INTERVAL '28 days'),
      (1, 'CREATE', 'bulk_import', 1, NULL, '{"filename": "techflow_catalog_jan2024.csv"}', '192.168.1.100', NOW() - INTERVAL '30 days'),
      (1, 'UPDATE', 'product', 3, '{"price": 1399.99}', '{"price": 1299.99}', '192.168.1.100', NOW() - INTERVAL '22 days'),
      (1, 'CREATE', 'duplicate_group', 1, NULL, '{"name": "MacBook Pro Variants"}', '192.168.1.100', NOW() - INTERVAL '18 days'),
      (1, 'DISMISS', 'duplicate_group', 14, '{"status": "pending"}', '{"status": "dismissed"}', '192.168.1.100', NOW() - INTERVAL '12 days'),
      (1, 'UPDATE', 'vendor', 5, '{"reliability_score": 4.50}', '{"reliability_score": 4.70}', '192.168.1.100', NOW() - INTERVAL '10 days'),
      (1, 'IMPORT', 'bulk_import', 5, NULL, '{"rows": 150, "duplicates": 12}', '192.168.1.100', NOW() - INTERVAL '10 days'),
      (1, 'CREATE', 'product', 20, NULL, '{"name": "Kindle Paperwhite"}', '192.168.1.100', NOW() - INTERVAL '8 days'),
      (1, 'UPDATE', 'product', 14, '{"price": 329.99}', '{"price": 299.99}', '192.168.1.100', NOW() - INTERVAL '5 days'),
      (1, 'GENERATE', 'ai_job', 1, NULL, '{"type": "description_generation"}', '192.168.1.100', NOW() - INTERVAL '3 days')
      ON CONFLICT DO NOTHING
    `);

    // Seed Data Quality Reports
    await pool.query(`
      INSERT INTO data_quality_reports (report_type, total_products, issues_found, score, details, created_at) VALUES
      ('completeness', 31, 8, 74.19, '{"missing_description": 2, "missing_barcode": 1, "missing_weight": 0, "missing_brand": 1, "missing_category": 2, "missing_image": 2}', NOW() - INTERVAL '1 day'),
      ('consistency', 31, 12, 61.29, '{"price_outliers": 3, "naming_inconsistencies": 5, "unit_mismatches": 2, "brand_variations": 2}', NOW() - INTERVAL '1 day'),
      ('accuracy', 31, 5, 83.87, '{"suspicious_prices": 2, "invalid_barcodes": 1, "dimension_errors": 1, "weight_anomalies": 1}', NOW() - INTERVAL '1 day'),
      ('duplicates', 31, 12, 61.29, '{"confirmed_duplicates": 8, "suspected_duplicates": 4, "false_positives": 2}', NOW() - INTERVAL '1 day'),
      ('completeness', 28, 10, 64.29, '{"missing_description": 3, "missing_barcode": 2, "missing_weight": 1, "missing_brand": 1, "missing_category": 2, "missing_image": 1}', NOW() - INTERVAL '7 days'),
      ('consistency', 28, 14, 50.00, '{"price_outliers": 4, "naming_inconsistencies": 6, "unit_mismatches": 2, "brand_variations": 2}', NOW() - INTERVAL '7 days'),
      ('accuracy', 28, 6, 78.57, '{"suspicious_prices": 3, "invalid_barcodes": 1, "dimension_errors": 1, "weight_anomalies": 1}', NOW() - INTERVAL '7 days'),
      ('duplicates', 28, 14, 50.00, '{"confirmed_duplicates": 10, "suspected_duplicates": 4, "false_positives": 0}', NOW() - INTERVAL '7 days'),
      ('completeness', 25, 12, 52.00, '{"missing_description": 4, "missing_barcode": 3, "missing_weight": 1, "missing_brand": 2, "missing_category": 1, "missing_image": 1}', NOW() - INTERVAL '14 days'),
      ('consistency', 25, 15, 40.00, '{"price_outliers": 5, "naming_inconsistencies": 7, "unit_mismatches": 1, "brand_variations": 2}', NOW() - INTERVAL '14 days'),
      ('accuracy', 25, 7, 72.00, '{"suspicious_prices": 3, "invalid_barcodes": 2, "dimension_errors": 1, "weight_anomalies": 1}', NOW() - INTERVAL '14 days'),
      ('duplicates', 25, 16, 36.00, '{"confirmed_duplicates": 12, "suspected_duplicates": 4, "false_positives": 0}', NOW() - INTERVAL '14 days'),
      ('completeness', 31, 6, 80.65, '{"missing_description": 1, "missing_barcode": 1, "missing_weight": 0, "missing_brand": 1, "missing_category": 2, "missing_image": 1}', NOW()),
      ('consistency', 31, 10, 67.74, '{"price_outliers": 2, "naming_inconsistencies": 4, "unit_mismatches": 2, "brand_variations": 2}', NOW()),
      ('accuracy', 31, 4, 87.10, '{"suspicious_prices": 1, "invalid_barcodes": 1, "dimension_errors": 1, "weight_anomalies": 1}', NOW())
      ON CONFLICT DO NOTHING
    `);

    // Seed AI Jobs
    await pool.query(`
      INSERT INTO ai_jobs (job_type, status, input_data, output_data, model, tokens_used, created_at, completed_at) VALUES
      ('duplicate_detection', 'completed', '{"product_ids": [1,2]}', '{"confidence": 92.5, "reasoning": "Same MacBook Pro M3 Pro model"}', 'anthropic/claude-haiku-4.5', 450, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
      ('description_generation', 'completed', '{"product_id": 1}', '{"description": "Experience unmatched performance with the Apple MacBook Pro 14-inch featuring the M3 Pro chip."}', 'anthropic/claude-haiku-4.5', 320, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
      ('category_suggestion', 'completed', '{"product_name": "Wireless Bluetooth Speaker"}', '{"suggested_category": "Audio Equipment", "confidence": 0.89}', 'anthropic/claude-haiku-4.5', 280, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
      ('price_optimization', 'completed', '{"product_id": 3}', '{"suggested_price": 1249.99, "reasoning": "Based on market analysis and competitor pricing"}', 'anthropic/claude-haiku-4.5', 510, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
      ('duplicate_detection', 'completed', '{"product_ids": [3,4]}', '{"confidence": 95.0, "reasoning": "Identical Samsung Galaxy S24 Ultra 256GB"}', 'anthropic/claude-haiku-4.5', 420, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
      ('quality_analysis', 'completed', '{"product_id": 13}', '{"quality_score": 2.8, "issues": ["abbreviated brand name", "missing full color description"]}', 'anthropic/claude-haiku-4.5', 350, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
      ('description_generation', 'completed', '{"product_id": 5}', '{"description": "Immerse yourself in pure audio bliss with Sony WH-1000XM5 headphones."}', 'anthropic/claude-haiku-4.5', 310, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
      ('merge_suggestion', 'completed', '{"group_id": 1}', '{"keep_product": 1, "merge_fields": {"stock_quantity": "sum", "price": "min"}}', 'anthropic/claude-haiku-4.5', 480, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
      ('duplicate_detection', 'completed', '{"product_ids": [5,6]}', '{"confidence": 88.5, "reasoning": "Same Sony WH-1000XM5 headphones, different naming"}', 'anthropic/claude-haiku-4.5', 430, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
      ('category_suggestion', 'completed', '{"product_name": "Ergonomic Office Desk Chair"}', '{"suggested_category": "Office Supplies", "confidence": 0.92}', 'anthropic/claude-haiku-4.5', 260, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
      ('description_generation', 'completed', '{"product_id": 10}', '{"description": "Revolutionize your cleaning routine with the Dyson V15 Detect vacuum cleaner."}', 'anthropic/claude-haiku-4.5', 340, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
      ('price_optimization', 'completed', '{"product_id": 12}', '{"suggested_price": 154.99, "reasoning": "Competitive pricing based on seasonal demand analysis"}', 'anthropic/claude-haiku-4.5', 490, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
      ('duplicate_detection', 'pending', '{"product_ids": [14,15]}', NULL, 'anthropic/claude-haiku-4.5', NULL, NOW(), NULL),
      ('description_generation', 'pending', '{"product_id": 23}', NULL, 'anthropic/claude-haiku-4.5', NULL, NOW(), NULL),
      ('quality_analysis', 'failed', '{"product_id": 999}', NULL, 'anthropic/claude-haiku-4.5', NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
      ON CONFLICT DO NOTHING
    `);

    console.log('Seed data inserted successfully!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    await pool.end();
    process.exit(1);
  }
}

seed();
