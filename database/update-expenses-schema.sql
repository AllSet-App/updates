-- Update Expenses Table to include new fields
-- Run this SQL in your Supabase SQL Editor

-- Add new columns to expenses table if they don't exist
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS item TEXT,
ADD COLUMN IF NOT EXISTS quantity DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS inventory_item_id TEXT;

-- Make category nullable (it was NOT NULL before)
ALTER TABLE expenses 
ALTER COLUMN category DROP NOT NULL;

