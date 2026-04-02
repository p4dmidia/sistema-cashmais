-- ==============================================
-- FIX FOR RPC REGISTRATION & LOGIN ERRORS
-- ==============================================

-- 1. Enable pgcrypto for password validation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. register_affiliate_v2
-- Handles robust registration of affiliates
-- 2. register_affiliate_v2
-- Handles robust registration of affiliates with automatic sponsor resolution and code generation
CREATE OR REPLACE FUNCTION register_affiliate_v2(
    p_full_name TEXT,
    p_cpf TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_password_hash TEXT,
    p_referral_code TEXT DEFAULT NULL, -- Sponsor's code
    p_position_slot SMALLINT DEFAULT NULL
)
RETURNS SETOF affiliates AS $$
DECLARE
    v_sponsor_id INTEGER;
    v_new_aff_id INTEGER;
    v_new_referral_code TEXT;
BEGIN
    -- 1. Encontrar o padrinho pelo código de indicação, se fornecido
    IF p_referral_code IS NOT NULL AND p_referral_code <> '' THEN
        -- Tenta pelo código de indicação primeiro
        SELECT id INTO v_sponsor_id 
        FROM affiliates 
        WHERE referral_code = p_referral_code 
        LIMIT 1;
        
        -- Se não achou e o código parece um ID numérico, tenta pelo ID (fallback)
        IF v_sponsor_id IS NULL AND p_referral_code ~ '^[0-9]+$' THEN
             SELECT id INTO v_sponsor_id FROM affiliates WHERE id = p_referral_code::INTEGER LIMIT 1;
        END IF;
    END IF;

    -- 2. Validar CPF e Email
    IF EXISTS (SELECT 1 FROM affiliates WHERE cpf = p_cpf) THEN
        RAISE EXCEPTION 'CPF já cadastrado';
    END IF;
    
    IF EXISTS (SELECT 1 FROM affiliates WHERE email = p_email) THEN
        RAISE EXCEPTION 'E-mail já cadastrado';
    END IF;

    -- 3. Gerar um novo código de indicação único para o novo afiliado
    LOOP
        -- Gera um código aleatório de 8 caracteres alfanuméricos
        v_new_referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM affiliates WHERE referral_code = v_new_referral_code);
    END LOOP;

    -- 4. Inserir na tabela affiliates
    INSERT INTO affiliates (
        full_name,
        cpf,
        email,
        phone,
        password_hash,
        sponsor_id,
        referral_code,
        position_slot,
        is_active,
        is_verified,
        created_at,
        updated_at
    ) VALUES (
        p_full_name,
        p_cpf,
        p_email,
        p_phone,
        p_password_hash,
        v_sponsor_id,
        v_new_referral_code,
        p_position_slot,
        true,
        false,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_new_aff_id;

    RETURN QUERY SELECT * FROM affiliates WHERE id = v_new_aff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. login_affiliate
-- Validates affiliate login via CPF and plain password
CREATE OR REPLACE FUNCTION login_affiliate(p_cpf TEXT, p_password TEXT)
RETURNS SETOF affiliates AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM affiliates
    WHERE cpf = p_cpf
      AND is_active = true
      AND (
          -- Handles both plain (for migration/testing) and hashed passwords
          password_hash = p_password OR 
          password_hash = crypt(p_password, password_hash)
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. get_network_stats (Usually called for dashboard)
CREATE OR REPLACE FUNCTION get_affiliate_stats(p_affiliate_id INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_referrals', (SELECT count(*) FROM affiliates WHERE sponsor_id = p_affiliate_id),
        'active_referrals', (SELECT count(*) FROM affiliates WHERE sponsor_id = p_affiliate_id AND is_active = true),
        'total_earnings', (SELECT COALESCE(total_earnings, 0) FROM user_settings WHERE user_id = (SELECT id FROM user_profiles WHERE mocha_user_id = 'affiliate_' || p_affiliate_id))
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION register_affiliate_v2 TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION login_affiliate TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_affiliate_stats TO authenticated, service_role;
