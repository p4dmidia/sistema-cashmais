-- ==============================================
-- FIX FOR RPC REGISTRATION & LOGIN ERRORS
-- ==============================================

-- 1. Enable pgcrypto for password validation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. register_affiliate_v2
-- Handles robust registration of affiliates
CREATE OR REPLACE FUNCTION register_affiliate_v2(
    p_full_name TEXT,
    p_cpf TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_password_hash TEXT,
    p_sponsor_id INTEGER,
    p_referral_code TEXT,
    p_position_slot SMALLINT DEFAULT NULL
)
RETURNS SETOF affiliates AS $$
DECLARE
    new_aff_id INTEGER;
BEGIN
    -- Validation
    IF EXISTS (SELECT 1 FROM affiliates WHERE cpf = p_cpf) THEN
        RAISE EXCEPTION 'CPF já cadastrado';
    END IF;
    
    IF EXISTS (SELECT 1 FROM affiliates WHERE email = p_email) THEN
        RAISE EXCEPTION 'E-mail já cadastrado';
    END IF;

    -- Slot validation
    IF p_sponsor_id IS NOT NULL AND p_position_slot IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM affiliates WHERE sponsor_id = p_sponsor_id AND position_slot = p_position_slot) THEN
            RAISE EXCEPTION 'Posição já ocupada para este patrocinador';
        END IF;
    END IF;

    -- Insert
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
        is_verified
    ) VALUES (
        p_full_name,
        p_cpf,
        p_email,
        p_phone,
        p_password_hash,
        p_sponsor_id,
        p_referral_code,
        p_position_slot,
        true,
        false
    )
    RETURNING id INTO new_aff_id;

    RETURN QUERY SELECT * FROM affiliates WHERE id = new_aff_id;
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
