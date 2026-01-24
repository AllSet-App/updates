-- Enable Supabase Realtime for All Sync Tables
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- This is REQUIRED for real-time sync between devices

-- Using SET TABLE instead of ADD TABLE to make this idempotent (safe to re-run)
-- This replaces all tables in the publication with exactly these tables
ALTER PUBLICATION supabase_realtime SET TABLE 
    orders,
    expenses,
    inventory,
    settings,
    products,
    quotations,
    tracking_numbers,
    order_sources,
    order_counter,
    inventory_logs;

-- Verify realtime is enabled (run this to check):
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
