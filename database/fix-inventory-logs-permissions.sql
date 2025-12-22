
-- Ensure table exists
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID,
    item_name TEXT,
    category TEXT,
    transaction_type TEXT, -- 'Restock', 'Used', 'Damaged', 'Correction', 'Return'
    quantity_change DECIMAL(10, 2), -- Positive for add, negative for remove
    balance_after DECIMAL(10, 2),
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    notes TEXT
);

-- Index for faster querying
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item ON inventory_logs(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_date ON inventory_logs(date);

-- PERMISSIONS FIX (In case Row Level Security is blocking access)
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- Remove existing policy if it exists to avoid errors on run
DROP POLICY IF EXISTS "Allow full access to inventory logs" ON inventory_logs;

-- Create a permissive policy (allows select, insert, update, delete for everyone with the API key)
CREATE POLICY "Allow full access to inventory logs"
ON inventory_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Grant privileges to standard Supabase roles
GRANT ALL ON inventory_logs TO anon;
GRANT ALL ON inventory_logs TO authenticated;
GRANT ALL ON inventory_logs TO service_role;
