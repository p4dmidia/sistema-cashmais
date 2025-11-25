-- Create commission_distributions table if missing
CREATE TABLE IF NOT EXISTS public.commission_distributions (
  id BIGSERIAL PRIMARY KEY,
  purchase_id BIGINT NOT NULL,
  affiliate_id BIGINT NOT NULL,
  level INTEGER NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL,
  commission_percentage INTEGER NOT NULL,
  base_cashback NUMERIC(12,2) NOT NULL,
  is_blocked BOOLEAN DEFAULT FALSE,
  released_at TIMESTAMP NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commission_distributions_purchase_id ON public.commission_distributions(purchase_id);
CREATE INDEX IF NOT EXISTS idx_commission_distributions_affiliate_id ON public.commission_distributions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commission_distributions_level ON public.commission_distributions(level);
CREATE INDEX IF NOT EXISTS idx_commission_distributions_is_blocked ON public.commission_distributions(is_blocked);

-- Optional: foreign keys (commented if referenced tables may vary)
-- ALTER TABLE public.commission_distributions
--   ADD CONSTRAINT fk_commission_purchase FOREIGN KEY (purchase_id) REFERENCES public.company_purchases(id) ON DELETE CASCADE;
-- ALTER TABLE public.commission_distributions
--   ADD CONSTRAINT fk_commission_affiliate FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE SET NULL;

