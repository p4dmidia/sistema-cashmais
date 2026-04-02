-- register_affiliate_v3
-- Versão aprimorada com suporte a posicionamento explícito na árvore ternária (Spillover)
-- Remove versões anteriores para evitar conflitos de assinatura
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT oid::regprocedure as sig FROM pg_proc WHERE proname = 'register_affiliate_v3') LOOP
        EXECUTE 'DROP FUNCTION ' || r.sig;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.register_affiliate_v3(
    p_full_name TEXT,
    p_cpf TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_password_hash TEXT,
    p_sponsor_id INTEGER, -- O PAI DIRETO na árvore calculado pela Edge Function
    p_position_slot SMALLINT, -- O SLOT (0, 1 ou 2) calculado pela Edge Function
    p_referral_code TEXT DEFAULT NULL -- Código do NOVO afiliado (se passar NULL, gera um automático)
)
RETURNS SETOF public.affiliates AS $$
DECLARE
    v_new_aff_id INTEGER;
    v_new_referral_code TEXT;
BEGIN
    -- 1. Validar Duplicidade de CPF/Email
    IF EXISTS (SELECT 1 FROM public.affiliates WHERE cpf = p_cpf) THEN
        RAISE EXCEPTION 'CPF já cadastrado';
    END IF;
    
    IF EXISTS (SELECT 1 FROM public.affiliates WHERE email = p_email) THEN
        RAISE EXCEPTION 'E-mail já cadastrado';
    END IF;

    -- 2. Validar se o SLOT está ocupado
    IF EXISTS (SELECT 1 FROM public.affiliates WHERE sponsor_id = p_sponsor_id AND position_slot = p_position_slot) THEN
        RAISE EXCEPTION 'Este slot ja foi preenchido por outro afiliado. Tente novamente.';
    END IF;

    -- 3. Gerar código de indicação único se não fornecido
    IF p_referral_code IS NULL OR p_referral_code = '' THEN
        LOOP
            v_new_referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
            EXIT WHEN NOT EXISTS (SELECT 1 FROM public.affiliates WHERE referral_code = v_new_referral_code);
        END LOOP;
    ELSE
        v_new_referral_code := p_referral_code;
    END IF;

    -- 4. Inserção final com o Parente Direto e Slot correto
    INSERT INTO public.affiliates (
        full_name,
        cpf,
        email,
        phone,
        password_hash,
        sponsor_id,         -- O Pai Direto na Hierarquia
        referral_code,      -- O código que o novo afiliado usará
        position_slot,      -- O slot exato para o Ternary Tree
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
        v_new_referral_code,
        p_position_slot,
        true,
        false,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_new_aff_id;

    RETURN QUERY SELECT * FROM public.affiliates WHERE id = v_new_aff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.register_affiliate_v3 TO anon, authenticated, service_role;
