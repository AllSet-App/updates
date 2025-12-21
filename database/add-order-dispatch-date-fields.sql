-- Add order_date and dispatch_date columns to orders table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_date DATE,
ADD COLUMN IF NOT EXISTS dispatch_date DATE;

