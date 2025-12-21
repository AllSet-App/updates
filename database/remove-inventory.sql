-- Remove Inventory Table and Related Columns
-- Run this SQL in your Supabase SQL Editor to remove all inventory-related database objects

-- Drop the inventory table
DROP TABLE IF EXISTS inventory;

-- Remove inventory_item_id column from expenses table (if it exists)
ALTER TABLE expenses DROP COLUMN IF EXISTS inventory_item_id;

-- Remove inventory_categories from products table
DELETE FROM products WHERE id = 'inventory_categories';

-- Drop inventory-related indexes (if they exist)
DROP INDEX IF EXISTS idx_inventory_category;

-- Drop inventory-related RLS policies (if they exist)
DROP POLICY IF EXISTS "Allow all operations on inventory" ON inventory;
