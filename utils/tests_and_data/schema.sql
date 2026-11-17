-- ==============================================================================
-- DEADLOCK MATCH SCANNER - DATABASE SCHEMA FOR SUPABASE
-- Execute este script no SQL Editor do seu painel Supabase (supabase.com/dashboard)
-- ==============================================================================

-- 1. Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Licenças (com Trava Rígida de 1 Computador por Chave)
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_key VARCHAR(64) UNIQUE NOT NULL, -- Ex: DEAD-7F9A-B234-K8L9
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) DEFAULT 'Cliente',
    provider VARCHAR(32) DEFAULT 'manual', -- 'stripe' | 'mercadopago' | 'manual'
    payment_id VARCHAR(128) DEFAULT NULL,
    amount_paid NUMERIC(10, 2) DEFAULT 0.00,
    currency VARCHAR(8) DEFAULT 'BRL',
    
    -- Status da Licença: 'active', 'revoked', 'expired'
    status VARCHAR(32) DEFAULT 'active',
    
    -- Assinatura Mensal (R$ 15/mês)
    plan_type VARCHAR(32) DEFAULT 'monthly', -- 'monthly' | 'lifetime'
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- NULL = vitalícia, Data = assinatura com renovação mensal
    
    -- Trava de Hardware (Hardware ID único do computador)
    hwid VARCHAR(128) DEFAULT NULL,
    machine_name VARCHAR(128) DEFAULT NULL,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    max_activations INT DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Log de Transações e Webhooks
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(32) NOT NULL, -- 'stripe' | 'mercadopago'
    external_id VARCHAR(128) NOT NULL,
    status VARCHAR(64) NOT NULL,
    customer_email VARCHAR(255),
    amount NUMERIC(10, 2),
    currency VARCHAR(8) DEFAULT 'BRL',
    raw_payload JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Índices para consultas ultra-rápidas
CREATE INDEX IF NOT EXISTS idx_licenses_key ON public.licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_hwid ON public.licenses(hwid);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON public.licenses(customer_email);
CREATE INDEX IF NOT EXISTS idx_payments_ext_id ON public.payments(external_id);

-- 5. Função SQL para Gerar Chaves Únicas no formato DEAD-XXXX-XXXX-XXXX
CREATE OR REPLACE FUNCTION generate_deadlock_key()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sem O, 0, I, 1
    result TEXT := 'DEAD-';
    i INT;
BEGIN
    FOR i IN 1..4 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    result := result || '-';
    FOR i IN 1..4 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    result := result || '-';
    FOR i IN 1..4 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Função RPC para Ativar Licença com Trava de Hardware (1 PC) e Checagem Mensal
CREATE OR REPLACE FUNCTION public.activate_license(p_license_key TEXT, p_hwid TEXT, p_machine_name TEXT DEFAULT 'Windows PC')
RETURNS JSONB AS $$
DECLARE
    v_lic RECORD;
BEGIN
    -- Busca a chave
    SELECT * INTO v_lic FROM public.licenses WHERE UPPER(license_key) = UPPER(TRIM(p_license_key));
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Chave de licença inválida ou inexistente.', 'code', 'NOT_FOUND');
    END IF;
    
    -- Verifica se a assinatura mensal expirou
    IF v_lic.expires_at IS NOT NULL AND v_lic.expires_at < NOW() THEN
        UPDATE public.licenses SET status = 'expired', updated_at = NOW() WHERE id = v_lic.id;
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Sua assinatura mensal expirou. Renove por R$ 15/mês para manter a sincronização de nuvem ativa.', 
            'code', 'EXPIRED'
        );
    END IF;

    IF v_lic.status <> 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Licença inativa ou revogada.', 'code', 'INACTIVE');
    END IF;
    
    -- Verifica se já está vinculada a outro computador
    IF v_lic.hwid IS NOT NULL AND v_lic.hwid <> p_hwid THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Esta chave já está ativada em outro computador. Para transferir, desative no computador anterior.', 
            'code', 'HWID_MISMATCH'
        );
    END IF;
    
    -- Se for a primeira ativação ou o mesmo computador, atualiza
    UPDATE public.licenses 
    SET hwid = p_hwid, 
        machine_name = COALESCE(p_machine_name, v_lic.machine_name, 'Windows PC'),
        activated_at = COALESCE(activated_at, NOW()),
        last_verified_at = NOW(),
        updated_at = NOW()
    WHERE id = v_lic.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'licenseKey', v_lic.license_key,
        'customerEmail', v_lic.customer_email,
        'customerName', v_lic.customer_name,
        'planType', COALESCE(v_lic.plan_type, 'monthly'),
        'expiresAt', v_lic.expires_at,
        'isPro', true,
        'activatedAt', COALESCE(v_lic.activated_at, NOW()),
        'message', 'Licença Pro ativada com sucesso!'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.1 RPC Rápida para Verificação de Licença Pro (Gatekeeper para sincronização R2)
CREATE OR REPLACE FUNCTION public.verify_pro_license(p_license_key TEXT, p_hwid TEXT)
RETURNS JSONB AS $$
DECLARE
    v_lic RECORD;
    v_days_left INT := NULL;
BEGIN
    SELECT * INTO v_lic FROM public.licenses 
    WHERE UPPER(license_key) = UPPER(TRIM(p_license_key)) AND hwid = p_hwid;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('isPro', false, 'reason', 'Licença ou HWID não encontrados.');
    END IF;

    IF v_lic.expires_at IS NOT NULL THEN
        IF v_lic.expires_at < NOW() THEN
            UPDATE public.licenses SET status = 'expired', updated_at = NOW() WHERE id = v_lic.id;
            RETURN jsonb_build_object('isPro', false, 'reason', 'Assinatura mensal expirada.', 'code', 'EXPIRED');
        END IF;
        v_days_left := EXTRACT(DAY FROM (v_lic.expires_at - NOW()))::int;
    END IF;

    IF v_lic.status <> 'active' THEN
        RETURN jsonb_build_object('isPro', false, 'reason', 'Licença não está ativa.');
    END IF;

    UPDATE public.licenses SET last_verified_at = NOW() WHERE id = v_lic.id;

    RETURN jsonb_build_object(
        'isPro', true,
        'planType', COALESCE(v_lic.plan_type, 'monthly'),
        'expiresAt', v_lic.expires_at,
        'daysLeft', v_days_left,
        'customerEmail', v_lic.customer_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Função RPC para Desativar Licença (Transferir para outro computador)
CREATE OR REPLACE FUNCTION public.deactivate_license(p_license_key TEXT, p_hwid TEXT)
RETURNS JSONB AS $$
DECLARE
    v_lic RECORD;
BEGIN
    SELECT * INTO v_lic FROM public.licenses WHERE UPPER(license_key) = UPPER(TRIM(p_license_key));
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Chave não encontrada.');
    END IF;
    
    IF v_lic.hwid <> p_hwid THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este computador não possui esta chave ativa.');
    END IF;
    
    UPDATE public.licenses 
    SET hwid = NULL, 
        machine_name = NULL,
        updated_at = NOW()
    WHERE id = v_lic.id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Licença desativada deste computador. Agora pode ser ativada em outro.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.1 Função RPC para Renovar (+30 dias) ou Criar Nova Licença Mensal
CREATE OR REPLACE FUNCTION public.renew_or_create_license(
    p_email TEXT,
    p_payment_id TEXT,
    p_amount NUMERIC DEFAULT 15.00,
    p_provider TEXT DEFAULT 'mercadopago'
)
RETURNS JSONB AS $$
DECLARE
    v_lic RECORD;
    v_new_key TEXT;
    v_new_expires TIMESTAMP WITH TIME ZONE;
    v_is_renewal BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_lic FROM public.licenses
    WHERE LOWER(customer_email) = LOWER(TRIM(p_email))
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        v_is_renewal := TRUE;
        IF v_lic.expires_at IS NOT NULL AND v_lic.expires_at > NOW() THEN
            v_new_expires := v_lic.expires_at + INTERVAL '30 days';
        ELSE
            v_new_expires := NOW() + INTERVAL '30 days';
        END IF;

        UPDATE public.licenses
        SET status = 'active',
            plan_type = 'monthly',
            expires_at = v_new_expires,
            payment_id = p_payment_id,
            amount_paid = p_amount,
            provider = p_provider,
            updated_at = NOW()
        WHERE id = v_lic.id;

        RETURN jsonb_build_object(
            'success', true,
            'isRenewal', true,
            'licenseKey', v_lic.license_key,
            'expiresAt', v_new_expires,
            'message', '+30 dias adicionados com sucesso à sua chave existente!'
        );
    ELSE
        v_new_key := public.generate_deadlock_key();
        v_new_expires := NOW() + INTERVAL '30 days';

        INSERT INTO public.licenses (
            license_key, customer_email, provider, payment_id,
            amount_paid, status, plan_type, expires_at
        ) VALUES (
            v_new_key, LOWER(TRIM(p_email)), p_provider, p_payment_id,
            p_amount, 'active', 'monthly', v_new_expires
        );

        RETURN jsonb_build_object(
            'success', true,
            'isRenewal', false,
            'licenseKey', v_new_key,
            'expiresAt', v_new_expires,
            'message', 'Nova licença Pro de 30 dias criada com sucesso!'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 Função RPC para Cancelar Assinatura (Interrompe renovação automática)
CREATE OR REPLACE FUNCTION public.cancel_subscription(p_customer_email TEXT, p_license_key TEXT)
RETURNS JSONB AS $$
DECLARE
    v_lic RECORD;
BEGIN
    SELECT * INTO v_lic FROM public.licenses 
    WHERE LOWER(customer_email) = LOWER(TRIM(p_customer_email))
      AND UPPER(license_key) = UPPER(TRIM(p_license_key));
      
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Licença não encontrada.');
    END IF;
    
    UPDATE public.licenses 
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = v_lic.id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Assinatura cancelada com sucesso. O seu acesso continuará ativo até o fim do período já pago.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Inserir uma licença VIP / Demonstração inicial para você testar agora mesmo!
INSERT INTO public.licenses (license_key, customer_email, customer_name, provider, amount_paid, status)
VALUES ('DEAD-VIP1-TEST-2026', 'admin@deadlock.com', 'Admin Master', 'manual', 0.00, 'active')
ON CONFLICT (license_key) DO NOTHING;

-- Habilitar Row Level Security e permitir chamadas das funções RPC públicas
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Política de leitura/execução das RPCs
CREATE POLICY "Allow public read for verification" ON public.licenses FOR SELECT USING (true);
CREATE POLICY "Allow authenticated update own license" ON public.licenses FOR UPDATE USING (auth.jwt() ->> 'email' = customer_email);
