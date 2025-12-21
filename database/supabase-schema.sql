-- Art Of Frames Management System - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create all tables

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  address TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  nearest_city TEXT,
  district TEXT,
  -- Single-item legacy fields (kept for backward compatibility)
  category_id TEXT,
  item_id TEXT,
  custom_item_name TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_type TEXT,
  discount_value DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  cod_amount DECIMAL(10, 2) DEFAULT 0,
  delivery_charge DECIMAL(10, 2) DEFAULT 400,
  -- Multi-item support
  order_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_date DATE,
  status TEXT DEFAULT 'Pending',
  payment_status TEXT DEFAULT 'Pending',
  tracking_number TEXT,
  notes TEXT,
  created_date DATE NOT NULL,
  order_date DATE,
  dispatch_date DATE,
  order_source TEXT DEFAULT 'Ad',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT,
  current_stock DECIMAL(10, 2) DEFAULT 0,
  reorder_level DECIMAL(10, 2) DEFAULT 0,
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  supplier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  item TEXT,
  category TEXT,
  quantity DECIMAL(10, 2) DEFAULT 0,
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  amount DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2),
  date DATE NOT NULL,
  payment_method TEXT,
  notes TEXT,
  inventory_item_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table (stored as JSON)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT 'products',
  data JSONB NOT NULL DEFAULT '{"categories": []}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'settings',
  data JSONB NOT NULL DEFAULT '{"orderNumberConfig": {"enabled": false, "startingNumber": 1000, "configured": false}}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tracking Numbers Table
CREATE TABLE IF NOT EXISTS tracking_numbers (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'available',
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Counter Table
CREATE TABLE IF NOT EXISTS order_counter (
  id TEXT PRIMARY KEY DEFAULT 'counter',
  value INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Sources Table (managed from Settings)
CREATE TABLE IF NOT EXISTS order_sources (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_date ON orders(created_date);
CREATE INDEX IF NOT EXISTS idx_tracking_numbers_status ON tracking_numbers(status);
CREATE INDEX IF NOT EXISTS idx_tracking_numbers_number ON tracking_numbers(number);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_order_sources_name ON order_sources(name);

-- Enable Row Level Security (RLS) - Allow all operations for now
-- You can restrict this later if you add authentication
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_sources ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (public access)
-- Note: In production, you should restrict these based on authentication
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on settings" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tracking_numbers" ON tracking_numbers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on order_counter" ON order_counter FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on order_sources" ON order_sources FOR ALL USING (true) WITH CHECK (true);

