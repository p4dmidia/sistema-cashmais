-- ==============================================
-- MISSING RPCS FOR CASHMAIS MIGRATION
-- ==============================================

-- Enable pgcrypto for password hashing if not already available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. login_affiliate
-- Checks CPF and Password Hash
CREATE OR REPLACE FUNCTION login_affiliate(p_cpf TEXT, p_password TEXT)
RETURNS SETOF affiliates AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM affiliates
    WHERE cpf = p_cpf
      AND is_active = true
      AND password_hash = crypt(p_password, password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. register_affiliate_v2
-- Robust registration with sponsor and slot handling
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
RETURNS affiliates AS $$
DECLARE
    new_affiliate affiliates;
BEGIN
    -- 1. Basic validation
    IF EXISTS (SELECT 1 FROM affiliates WHERE cpf = p_cpf) THEN
        RAISE EXCEPTION 'CPF já cadastrado';
    END IF;
    
    IF EXISTS (SELECT 1 FROM affiliates WHERE email = p_email) THEN
        RAISE EXCEPTION 'E-mail já cadastrado';
    END IF;

    -- 2. Slot validation if provided
    IF p_sponsor_id IS NOT NULL AND p_position_slot IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM affiliates WHERE sponsor_id = p_sponsor_id AND position_slot = p_position_slot) THEN
            RAISE EXCEPTION 'Posição já ocupada para este patrocinador';
        END IF;
    END IF;

    -- 3. Insert into affiliates
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
        p_sponsor_id,
        p_referral_code,
        p_position_slot,
        true,
        false, -- Needs verification possibly
        NOW(),
        NOW()
    )
    RETURNING * INTO new_affiliate;

    RETURN new_affiliate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION login_affiliate(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION register_affiliate_v2(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, SMALLINT) TO anon, authenticated, service_role;
