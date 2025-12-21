-- Art Of Frames Management System - Migration: Add Separate WhatsApp Column
-- Run this in your Supabase SQL Editor to allow saving Phone and WhatsApp separately

-- 1. Add the customer_whatsapp column to the orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_whatsapp TEXT;

-- 2. Populate existing records (Optional: copies phone to whatsapp for legacy data)
-- UPDATE orders SET customer_whatsapp = customer_phone WHERE customer_whatsapp IS NULL;

-- 3. Update the schema cache (standard procedure for Supabase to detect new columns)
NOTIFY pgrst, 'reload schema';
