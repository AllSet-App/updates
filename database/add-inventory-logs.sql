
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

-- Index for faster querying by item or date
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item ON inventory_logs(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_date ON inventory_logs(date);
