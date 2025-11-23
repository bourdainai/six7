-- Phase 3: Advanced Trading Features (Final)

-- Add escrow fields to trade_offers
ALTER TABLE trade_offers 
  ADD COLUMN IF NOT EXISTS escrow_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escrow_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS escrow_released BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMP;

-- Trade Templates
CREATE TABLE IF NOT EXISTS trade_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE trade_templates ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_templates' AND policyname = 'trade_templates_select') THEN
    CREATE POLICY "trade_templates_select" ON trade_templates FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_templates' AND policyname = 'trade_templates_insert') THEN
    CREATE POLICY "trade_templates_insert" ON trade_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_templates' AND policyname = 'trade_templates_update') THEN
    CREATE POLICY "trade_templates_update" ON trade_templates FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_templates' AND policyname = 'trade_templates_delete') THEN
    CREATE POLICY "trade_templates_delete" ON trade_templates FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trade Packages
CREATE TABLE IF NOT EXISTS trade_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  listing_ids UUID[] NOT NULL,
  total_value DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE trade_packages ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_packages' AND policyname = 'trade_packages_select') THEN
    CREATE POLICY "trade_packages_select" ON trade_packages FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_packages' AND policyname = 'trade_packages_insert') THEN
    CREATE POLICY "trade_packages_insert" ON trade_packages FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_packages' AND policyname = 'trade_packages_update') THEN
    CREATE POLICY "trade_packages_update" ON trade_packages FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_packages' AND policyname = 'trade_packages_delete') THEN
    CREATE POLICY "trade_packages_delete" ON trade_packages FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trade Stats (if not exists)
CREATE TABLE IF NOT EXISTS trade_stats (
  user_id UUID PRIMARY KEY,
  total_trades_completed INTEGER DEFAULT 0,
  avg_fairness_accepted DECIMAL(5,2) DEFAULT 0,
  trade_completion_rate DECIMAL(5,2) DEFAULT 0,
  last_calculated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE trade_stats ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_stats' AND policyname = 'trade_stats_select') THEN
    CREATE POLICY "trade_stats_select" ON trade_stats FOR SELECT USING (true);
  END IF;
END $$;