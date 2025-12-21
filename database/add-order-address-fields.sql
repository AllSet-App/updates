-- Add address, nearest_city, and district columns to orders table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS nearest_city TEXT,
ADD COLUMN IF NOT EXISTS district TEXT;

