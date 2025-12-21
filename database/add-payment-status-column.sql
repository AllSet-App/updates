-- Add payment_status column to existing orders table
-- Run this SQL in your Supabase SQL Editor if you already have the orders table

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Pending';

-- Update existing orders to have 'Pending' as default payment status if null
UPDATE orders SET payment_status = 'Pending' WHERE payment_status IS NULL;

