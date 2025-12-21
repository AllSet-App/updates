-- Update Inventory Table to support decimal values for stock
-- Run this SQL in your Supabase SQL Editor

-- Change current_stock from INTEGER to DECIMAL
ALTER TABLE inventory 
ALTER COLUMN current_stock TYPE DECIMAL(10, 2) USING current_stock::DECIMAL(10, 2);

-- Change reorder_level from INTEGER to DECIMAL
ALTER TABLE inventory 
ALTER COLUMN reorder_level TYPE DECIMAL(10, 2) USING reorder_level::DECIMAL(10, 2);

