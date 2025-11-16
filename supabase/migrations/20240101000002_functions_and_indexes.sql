-- ==============================================
-- FUNÇÕES RPC PARA SUPABASE
-- Migração das funções complexas do Cloudflare D1
-- ==============================================

-- Função para buscar membros da rede recursivamente
CREATE OR REPLACE FUNCTION get_network_members_recursive(p_sponsor_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  full_name TEXT,
  email TEXT,
  cpf TEXT,
  created_at TIMESTAMPTZ,
  is_active BOOLEAN,
  level INTEGER,
  sponsor_path INTEGER[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE network AS (
    -- Base: membros diretos (nível 1)
    SELECT 
      a.id,
      a.full_name,
      a.email,
      a.cpf,
      a.created_at,
      a.is_active,
      1 as level,
      ARRAY[a.sponsor_id] as sponsor_path
    FROM affiliates a
    WHERE a.sponsor_id = p_sponsor_id AND a.is_active = true
    
    UNION ALL
    
    -- Recursivo: membros indiretos (níveis 2-10)
    SELECT 
      a.id,
      a.full_name,
      a.email,
      a.cpf,
      a.created_at,
      a.is_active,
      n.level + 1,
      n.sponsor_path || a.sponsor_id
    FROM affiliates a
    INNER JOIN network n ON a.sponsor_id = n.id
    WHERE a.is_active = true AND n.level < 10
  )
  SELECT * FROM network
  ORDER BY level, created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar dados mensais da empresa
CREATE OR REPLACE FUNCTION get_company_monthly_data(p_company_id INTEGER)
RETURNS TABLE (
  month TEXT,
  sales_count BIGINT,
  sales_value NUMERIC,
  cashback_generated NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(cp.created_at, 'YYYY-MM') as month,
    COUNT(*) as sales_count,
    COALESCE(SUM(cp.purchase_value), 0) as sales_value,
    COALESCE(SUM(cp.cashback_generated), 0) as cashback_generated
  FROM company_purchases cp
  WHERE cp.company_id = p_company_id 
    AND cp.created_at >= NOW() - INTERVAL '6 months'
  GROUP BY TO_CHAR(cp.created_at, 'YYYY-MM')
  ORDER BY month ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar estatísticas mensais do admin
CREATE OR REPLACE FUNCTION get_admin_monthly_stats()
RETURNS TABLE (
  month TEXT,
  purchases BIGINT,
  cashback NUMERIC,
  companies BIGINT,
  affiliates BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(month_series.month_date, 'Mon/YY') as month,
    COALESCE(purchases_data.purchases, 0) as purchases,
    COALESCE(purchases_data.cashback, 0) as cashback,
    COALESCE(companies_data.companies, 0) as companies,
    COALESCE(affiliates_data.affiliates, 0) as affiliates
  FROM (
    SELECT generate_series(
      DATE_TRUNC('month', NOW() - INTERVAL '5 months'),
      DATE_TRUNC('month', NOW()),
      INTERVAL '1 month'
    ) as month_date
  ) month_series
  LEFT JOIN (
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as purchases,
      COALESCE(SUM(cashback_generated), 0) as cashback
    FROM company_purchases
    WHERE created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
  ) purchases_data ON DATE_TRUNC('month', month_series.month_date) = purchases_data.month
  LEFT JOIN (
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as companies
    FROM companies
    WHERE created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
  ) companies_data ON DATE_TRUNC('month', month_series.month_date) = companies_data.month
  LEFT JOIN (
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as affiliates
    FROM affiliates
    WHERE created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
  ) affiliates_data ON DATE_TRUNC('month', month_series.month_date) = affiliates_data.month
  ORDER BY month_series.month_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar crescimento semanal do admin
CREATE OR REPLACE FUNCTION get_admin_weekly_growth()
RETURNS TABLE (
  day TEXT,
  new_affiliates BIGINT,
  new_companies BIGINT,
  total_purchases BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(day_series.day_date, 'Dy') as day,
    COALESCE(affiliates_data.affiliates, 0) as new_affiliates,
    COALESCE(companies_data.companies, 0) as new_companies,
    COALESCE(purchases_data.purchases, 0) as total_purchases
  FROM (
    SELECT generate_series(
      DATE_TRUNC('day', NOW() - INTERVAL '6 days'),
      DATE_TRUNC('day', NOW()),
      INTERVAL '1 day'
    ) as day_date
  ) day_series
  LEFT JOIN (
    SELECT 
      DATE_TRUNC('day', created_at) as day,
      COUNT(*) as affiliates
    FROM affiliates
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('day', created_at)
  ) affiliates_data ON DATE_TRUNC('day', day_series.day_date) = affiliates_data.day
  LEFT JOIN (
    SELECT 
      DATE_TRUNC('day', created_at) as day,
      COUNT(*) as companies
    FROM companies
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('day', created_at)
  ) companies_data ON DATE_TRUNC('day', day_series.day_date) = companies_data.day
  LEFT JOIN (
    SELECT 
      DATE_TRUNC('day', created_at) as day,
      COUNT(*) as purchases
    FROM company_purchases
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('day', created_at)
  ) purchases_data ON DATE_TRUNC('day', day_series.day_date) = purchases_data.day
  ORDER BY day_series.day_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- TRIGGERS PARA MANTER CONSISTÊNCIA DOS DADOS
-- ==============================================

-- Trigger para atualizar saldo disponível quando saque é aprovado/rejeitado
CREATE OR REPLACE FUNCTION update_user_balance_on_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Aprovação: deduz do saldo congelado
    UPDATE user_settings 
    SET frozen_balance = frozen_balance - NEW.net_amount
    WHERE user_id = NEW.user_id;
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- Rejeição: retorna ao saldo disponível
    UPDATE user_settings 
    SET available_balance = available_balance + NEW.net_amount,
        frozen_balance = frozen_balance - NEW.net_amount
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_balance_on_withdrawal
  AFTER UPDATE ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance_on_withdrawal();

-- Trigger para registrar log de auditoria admin
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, new_data)
    VALUES (NEW.admin_user_id, 'CREATE_WITHDRAWAL', 'withdrawal', NEW.id, row_to_json(NEW)::jsonb);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
      COALESCE(NEW.admin_user_id, OLD.admin_user_id), 
      CASE 
        WHEN OLD.status = 'pending' AND NEW.status = 'approved' THEN 'APPROVE_WITHDRAWAL'
        WHEN OLD.status = 'pending' AND NEW.status = 'rejected' THEN 'REJECT_WITHDRAWAL'
        ELSE 'UPDATE_WITHDRAWAL'
      END,
      'withdrawal', 
      NEW.id, 
      row_to_json(OLD)::jsonb, 
      row_to_json(NEW)::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contador de uso de cupons
CREATE OR REPLACE FUNCTION update_coupon_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE customer_coupons 
    SET total_usage_count = total_usage_count + 1,
        last_used_at = NEW.created_at
    WHERE id = NEW.customer_coupon_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coupon_usage
  AFTER INSERT ON company_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_coupon_usage_count();

-- ==============================================
-- ÍNDICES PARA OTIMIZAÇÃO DE PERFORMANCE
-- ==============================================

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_affiliates_cpf ON affiliates(cpf);
CREATE INDEX IF NOT EXISTS idx_affiliates_sponsor_id ON affiliates(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_is_active ON affiliates(is_active);
CREATE INDEX IF NOT EXISTS idx_affiliates_created_at ON affiliates(created_at);

CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

CREATE INDEX IF NOT EXISTS idx_company_purchases_company_id ON company_purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_company_purchases_customer_coupon ON company_purchases(customer_coupon);
CREATE INDEX IF NOT EXISTS idx_company_purchases_created_at ON company_purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_company_purchases_cashier_id ON company_purchases(cashier_id);

CREATE INDEX IF NOT EXISTS idx_company_cashiers_company_id ON company_cashiers(company_id);
CREATE INDEX IF NOT EXISTS idx_company_cashiers_cpf ON company_cashiers(cpf);
CREATE INDEX IF NOT EXISTS idx_company_cashiers_is_active ON company_cashiers(is_active);

CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf ON user_profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_user_profiles_mocha_user_id ON user_profiles(mocha_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);

CREATE INDEX IF NOT EXISTS idx_commission_distributions_purchase_id ON commission_distributions(purchase_id);
CREATE INDEX IF NOT EXISTS idx_commission_distributions_affiliate_id ON commission_distributions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commission_distributions_level ON commission_distributions(level);

CREATE INDEX IF NOT EXISTS idx_customer_coupons_cpf ON customer_coupons(cpf);
CREATE INDEX IF NOT EXISTS idx_customer_coupons_user_id ON customer_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_coupons_affiliate_id ON customer_coupons(affiliate_id);

-- Índices para sessões
CREATE INDEX IF NOT EXISTS idx_admin_sessions_session_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user_id ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_company_sessions_session_token ON company_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_company_sessions_company_id ON company_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_sessions_expires_at ON company_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_cashier_sessions_session_token ON cashier_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_cashier_sessions_cashier_id ON cashier_sessions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cashier_sessions_expires_at ON cashier_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_affiliate_sessions_session_token ON affiliate_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_affiliate_sessions_affiliate_id ON affiliate_sessions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sessions_expires_at ON affiliate_sessions(expires_at);