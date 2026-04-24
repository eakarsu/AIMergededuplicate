import pool from './connection.js';

export async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      contact_email VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      status VARCHAR(20) DEFAULT 'active',
      reliability_score DECIMAL(3,2) DEFAULT 0.00,
      total_products INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT,
      product_count INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(500) NOT NULL,
      description TEXT,
      brand VARCHAR(255),
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
      price DECIMAL(10,2),
      cost DECIMAL(10,2),
      stock_quantity INTEGER DEFAULT 0,
      weight DECIMAL(8,2),
      dimensions VARCHAR(100),
      image_url VARCHAR(500),
      barcode VARCHAR(100),
      status VARCHAR(20) DEFAULT 'active',
      quality_score DECIMAL(3,2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS duplicate_groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      confidence DECIMAL(5,2),
      status VARCHAR(20) DEFAULT 'pending',
      ai_reasoning TEXT,
      merged_into_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      resolved_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS duplicate_group_items (
      id SERIAL PRIMARY KEY,
      group_id INTEGER REFERENCES duplicate_groups(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      is_primary BOOLEAN DEFAULT false,
      similarity_score DECIMAL(5,2),
      UNIQUE(group_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS merge_history (
      id SERIAL PRIMARY KEY,
      source_product_id INTEGER,
      target_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      duplicate_group_id INTEGER REFERENCES duplicate_groups(id) ON DELETE SET NULL,
      merged_by INTEGER REFERENCES users(id),
      merge_data JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bulk_imports (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      vendor_id INTEGER REFERENCES vendors(id),
      total_rows INTEGER DEFAULT 0,
      processed_rows INTEGER DEFAULT 0,
      duplicates_found INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      error_log JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      old_price DECIMAL(10,2),
      new_price DECIMAL(10,2),
      changed_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER,
      old_data JSONB,
      new_data JSONB,
      ip_address VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS data_quality_reports (
      id SERIAL PRIMARY KEY,
      report_type VARCHAR(50) NOT NULL,
      total_products INTEGER,
      issues_found INTEGER,
      score DECIMAL(5,2),
      details JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_jobs (
      id SERIAL PRIMARY KEY,
      job_type VARCHAR(50) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      input_data JSONB,
      output_data JSONB,
      model VARCHAR(100),
      tokens_used INTEGER,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    );
  `);
  console.log('All tables created successfully');
}
