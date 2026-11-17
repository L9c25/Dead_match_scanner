# 🚀 Guia Completo de Pagamentos & Licenças (Supabase + Stripe + Mercado Pago)

Este documento contém o **passo a passo de ponta a ponta** para você configurar seu backend no **Supabase**, receber pagamentos internacionais no **Stripe** (Cartão/Apple Pay) e pagamentos nacionais no **Mercado Pago** (Pix), gerando **chaves de licença com trava de 1 PC por usuário**.

---

## 🏛️ 1. Arquitetura do Sistema

```
                         ┌─────────────────────────────────┐
                         │       Comprador no Checkout     │
                         └───────────────┬─────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     [ Stripe (Cartão Global) ]                     [ Mercado Pago (Pix BR) ]
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         │ Webhooks
                                         ▼
            ┌─────────────────────────────────────────────────────────┐
            │             Supabase Edge Functions                     │
            │  • /webhook-stripe        • /webhook-mercadopago        │
            │  • /activate-license      • /verify-license             │
            └────────────────────────────┬────────────────────────────┘
                                         │
                                         ▼
            ┌─────────────────────────────────────────────────────────┐
            │               Supabase Database (PostgreSQL)            │
            │  • Tabela: licenses (Chaves, status, email, HWID)       │
            │  • Tabela: payments (Histórico de transações)           │
            └────────────────────────────┬────────────────────────────┘
                                         │
                                         ▼
            ┌─────────────────────────────────────────────────────────┐
            │               Plugin no Premiere Pro (CEP)              │
            │  • Lê o MachineGuid único do Windows (HWID)             │
            │  • Valida licença e trava em 1 único computador         │
            └─────────────────────────────────────────────────────────┘
```

---

## 🗄️ 2. Configurando o Banco de Dados no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e crie um novo projeto (ex: `deadlock-match-scanner`).
2. Acesse a aba **SQL Editor** no painel do Supabase.
3. Cole e execute o script SQL abaixo para criar as tabelas de licenças e pagamentos com índices e segurança:

```sql
-- 1. Habilitar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Licenças (Chaves com trava de 1 computador)
CREATE TABLE public.licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_key VARCHAR(64) UNIQUE NOT NULL, -- Ex: DEAD-XXXX-XXXX-XXXX
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    provider VARCHAR(32) NOT NULL, -- 'stripe' ou 'mercadopago'
    payment_id VARCHAR(128),
    amount_paid NUMERIC(10, 2),
    currency VARCHAR(8) DEFAULT 'BRL',
    
    -- Status da Licença
    status VARCHAR(32) DEFAULT 'active', -- 'active', 'revoked', 'expired'
    
    -- Trava de Hardware (1 PC por licença)
    hwid VARCHAR(128) DEFAULT NULL, -- Preenchido na 1ª ativação
    machine_name VARCHAR(128) DEFAULT NULL,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    max_activations INT DEFAULT 1, -- Limite rígido de 1 PC
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Log de Pagamentos / Webhooks
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(32) NOT NULL, -- 'stripe' | 'mercadopago'
    external_id VARCHAR(128) NOT NULL,
    status VARCHAR(64) NOT NULL,
    customer_email VARCHAR(255),
    amount NUMERIC(10, 2),
    currency VARCHAR(8),
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Índices para buscas instantâneas
CREATE INDEX idx_licenses_key ON public.licenses(license_key);
CREATE INDEX idx_licenses_hwid ON public.licenses(hwid);
CREATE INDEX idx_licenses_email ON public.licenses(customer_email);
CREATE INDEX idx_payments_external_id ON public.payments(external_id);

-- 5. Função para gerar Chaves Únicas no formato DEAD-XXXX-XXXX-XXXX
CREATE OR REPLACE FUNCTION generate_deadlock_key()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sem O, 0, I, 1 para evitar confusão
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
```

---

## ⚡ 3. Supabase Edge Functions (A Lógica do Servidor)

As Edge Functions do Supabase rodam em Deno/TypeScript de forma ultra-rápida e gratuita.

### Instalação da CLI do Supabase na sua máquina:
```bash
npm install -g supabase
supabase login
supabase link --project-ref <SEU_PROJECT_REF_DO_SUPABASE>
```

---

### 🔹 Edge Function 1: `activate-license`
Crie a pasta `supabase/functions/activate-license/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { licenseKey, hwid, machineName } = await req.json();

    if (!licenseKey || !hwid) {
      return new Response(JSON.stringify({ error: "Chave de licença e HWID são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Busca a chave no banco
    const { data: license, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("license_key", licenseKey.trim().toUpperCase())
      .single();

    if (error || !license) {
      return new Response(JSON.stringify({ error: "Chave de licença inválida ou inexistente." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verifica se a licença está ativa
    if (license.status !== "active") {
      return new Response(JSON.stringify({ error: `Licença com status '${license.status}'. Entre em contato com o suporte.` }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Regra de Hardware (1 PC por licença)
    if (license.hwid && license.hwid !== hwid) {
      return new Response(JSON.stringify({
        error: "Esta licença já está ativada em outro computador. Para transferir de PC, desative no PC anterior.",
        code: "HWID_MISMATCH"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Se for a 1ª ativação, grava o HWID
    if (!license.hwid) {
      await supabase
        .from("licenses")
        .update({
          hwid: hwid,
          machine_name: machineName || "Windows PC",
          activated_at: new Date().toISOString(),
          last_verified_at: new Date().toISOString(),
        })
        .eq("id", license.id);
    } else {
      // Atualiza apenas o último check
      await supabase
        .from("licenses")
        .update({ last_verified_at: new Date().toISOString() })
        .eq("id", license.id);
    }

    return new Response(JSON.stringify({
      success: true,
      licenseKey: license.license_key,
      customerEmail: license.customer_email,
      activatedAt: license.activated_at || new Date().toISOString(),
      message: "Licença ativada com sucesso!"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

### 🔹 Edge Function 2: `webhook-stripe`
Crie a pasta `supabase/functions/webhook-stripe/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Quando o pagamento com Cartão/Apple Pay é concluído com sucesso
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;
    const name = session.customer_details?.name || "Cliente";
    const amount = (session.amount_total || 0) / 100;
    const currency = session.currency?.toUpperCase() || "USD";

    // 1. Gera chave única no banco
    const { data: keyRes } = await supabase.rpc("generate_deadlock_key");
    const licenseKey = keyRes || `DEAD-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 2. Insere na tabela licenses
    await supabase.from("licenses").insert({
      license_key: licenseKey,
      customer_email: email,
      customer_name: name,
      provider: "stripe",
      payment_id: session.id,
      amount_paid: amount,
      currency: currency,
      status: "active"
    });

    // 3. Registra pagamento
    await supabase.from("payments").insert({
      provider: "stripe",
      external_id: session.id,
      status: "paid",
      customer_email: email,
      amount: amount,
      currency: currency,
      raw_payload: session
    });

    console.log(`✅ [Stripe] Licença criada com sucesso: ${licenseKey} para ${email}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

---

### 🔹 Edge Function 3: `webhook-mercadopago`
Crie a pasta `supabase/functions/webhook-mercadopago/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const mpPaymentId = body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");

    if (!mpPaymentId) {
      return new Response("ID de pagamento ausente", { status: 200 });
    }

    const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    // Consulta a API do Mercado Pago para checar o status real do pagamento
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
    });

    if (!mpRes.ok) return new Response("Falha ao consultar MP", { status: 200 });
    const payment = await mpRes.json();

    // Se o Pix foi APROVADO
    if (payment.status === "approved") {
      const email = payment.payer?.email || "pix_cliente@email.com";
      const name = `${payment.payer?.first_name || ""} ${payment.payer?.last_name || ""}`.trim() || "Cliente Pix";
      const amount = payment.transaction_amount || 0;

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Checa se já gerou chave para este pagamento
      const { data: existing } = await supabase
        .from("licenses")
        .select("id")
        .eq("payment_id", String(payment.id))
        .single();

      if (!existing) {
        // Gera chave
        const { data: keyRes } = await supabase.rpc("generate_deadlock_key");
        const licenseKey = keyRes || `DEAD-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        await supabase.from("licenses").insert({
          license_key: licenseKey,
          customer_email: email,
          customer_name: name,
          provider: "mercadopago",
          payment_id: String(payment.id),
          amount_paid: amount,
          currency: "BRL",
          status: "active"
        });

        await supabase.from("payments").insert({
          provider: "mercadopago",
          external_id: String(payment.id),
          status: "approved",
          customer_email: email,
          amount: amount,
          currency: "BRL",
          raw_payload: payment
        });

        console.log(`✅ [Mercado Pago Pix] Licença criada: ${licenseKey} para ${email}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 200 });
  }
});
```

---

## 💳 4. Configurando o Stripe (Cartão Global)

1. Entre no seu [Dashboard do Stripe](https://dashboard.stripe.com/).
2. Vá em **Product catalog > Add product**:
   * **Name**: `Deadlock Match Scanner - Lifetime License`
   * **Price**: `$14.99 USD` (ou o valor desejado) — *One-time payment*.
3. Clique em **Create Payment Link** no produto criado para obter o link direto de compra.
4. Vá em **Developers > Webhooks > Add destination**:
   * **Endpoint URL**: `https://<SEU_PROJECT_REF>.supabase.co/functions/v1/webhook-stripe`
   * **Select events to listen to**: Selecione `checkout.session.completed`.
   * Copie o **Signing secret** (`whsec_...`) e adicione nas variáveis de ambiente do Supabase (`STRIPE_WEBHOOK_SECRET`).

---

## 🇧🇷 5. Configurando o Mercado Pago (Pix BR)

1. Acesse o [Painel do Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel).
2. Crie uma aplicação (ex: `Deadlock Scanner`).
3. Obtenha o seu **Access Token** de Produção.
4. Em **Notificações Webhooks**:
   * **URL de Produção**: `https://<SEU_PROJECT_REF>.supabase.co/functions/v1/webhook-mercadopago`
   * **Eventos**: Marque **Pagamentos (payment)**.
5. Crie um Link de Pagamento (Checkout) com a opção **Pix** habilitada para os brasileiros.

---

## 🔒 6. Como o Plugin Lê o Hardware ID no Windows

No lado do plugin Premiere Pro (CEP), nós lemos o identificador exclusivo da placa-mãe/Windows via registro do sistema com Node.js:

```javascript
// js/licenseManager.js
const LicenseManager = {
    getMachineHardwareId() {
        let fs = null;
        let child_process = null;
        let crypto = null;
        try {
            if (typeof window !== 'undefined' && window.require) {
                child_process = window.require('child_process');
                crypto = window.require('crypto');
            }
        } catch(e) {}

        if (!child_process || !crypto) return 'standalone-browser-demo-id';

        try {
            // Lê o MachineGuid único do Windows
            const output = child_process.execSync(
                'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
                { encoding: 'utf8' }
            );
            const match = output.match(/MachineGuid\s+REG_SZ\s+(.*)/i);
            const rawGuid = match ? match[1].trim() : 'DEFAULT-WIN-HWID';
            return crypto.createHash('sha256').update(rawGuid).digest('hex').substring(0, 32);
        } catch (err) {
            return 'fallback-win-hwid';
        }
    },

    async activate(licenseKey) {
        const hwid = this.getMachineHardwareId();
        const endpoint = 'https://<SEU_PROJECT_REF>.supabase.co/functions/v1/activate-license';

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                licenseKey: licenseKey.trim().toUpperCase(),
                hwid: hwid,
                machineName: (typeof process !== 'undefined' && process.env) ? (process.env.COMPUTERNAME || 'Windows PC') : 'PC'
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao ativar licença.');
        }

        // Salva token de licença local criptografado
        this.saveLocalLicense(data);
        return data;
    }
};
```

---

## 📋 Resumo dos Links para o Comprador

Na interface do plugin, o usuário bloqueado verá:
* 🇧🇷 Botão **"Comprar Licença com Pix (R$)"** ➔ Link do Mercado Pago.
* 🌐 Botão **"Buy License with Card / Apple Pay ($)"** ➔ Link do Stripe Checkout.
* Campo para colar a **Chave Recebida** (ex: `DEAD-A8B9-CD21-EF43`).
* Ao clicar em **"Ativar"**, o plugin se conecta ao Supabase, amarra o PC dele e desbloqueia tudo para sempre!
