import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// =============================================================================
// REGRA CRÍTICA DE SEGURANÇA:
// O preço é definido EXCLUSIVAMENTE aqui no backend.
// Qualquer valor enviado pelo frontend é sumariamente descartado.
// =============================================================================
const FIXED_PRICE_BRL = 2.00; // Altere para 40.00 quando quiser mudar para produção
const PRODUCT_TITLE = "Deadlock Match Tracker (Licença Vitalícia)";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  if (!MP_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: "Configuração do gateway ausente no servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // ===========================================================================
  // 1. GET: Consulta de Status do Pix em Tempo Real (Polling do Frontend)
  // ===========================================================================
  if (req.method === "GET") {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get("paymentId");

    if (!paymentId) {
      return new Response(JSON.stringify({ error: "ID de pagamento ausente." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      const checkRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${MP_ACCESS_TOKEN}`
        }
      });

      if (!checkRes.ok) {
        return new Response(JSON.stringify({ status: "pending" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const paymentData = await checkRes.json();
      return new Response(JSON.stringify({
        status: paymentData.status, // "pending", "approved", "rejected", "cancelled"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  // ===========================================================================
  // 2. POST: Geração de Cobrança Pix Transparente
  // ===========================================================================
  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}));
      const rawEmail = (body.email || "").trim().toLowerCase();
      const rawName = (body.name || "Cliente").trim();

      // Validação estrita de e-mail contra injeção e formatos inválidos
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!rawEmail || !emailRegex.test(rawEmail)) {
        return new Response(JSON.stringify({ error: "E-mail inválido para recebimento da licença." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const idempotencyKey = `pix_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Chama Mercado Pago forçando o valor fixado no servidor (FIXED_PRICE_BRL)
      const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          transaction_amount: FIXED_PRICE_BRL,
          description: PRODUCT_TITLE,
          payment_method_id: "pix",
          external_reference: rawEmail,
          metadata: {
            buyer_email: rawEmail,
            customer_name: rawName.substring(0, 30)
          },
          payer: {
            email: rawEmail,
            first_name: rawName.substring(0, 30)
          },
          notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-mercadopago`
        })
      });

      if (!mpResponse.ok) {
        const errText = await mpResponse.text();
        console.error("[create-pix-payment] Erro Mercado Pago:", errText);
        return new Response(JSON.stringify({ error: "Não foi possível gerar a chave Pix junto ao banco." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const payment = await mpResponse.json();

      const qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64;
      const qrCode = payment.point_of_interaction?.transaction_data?.qr_code;

      if (!qrCode || !qrCodeBase64) {
        return new Response(JSON.stringify({ error: "O gateway não retornou os dados visuais do Pix." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        paymentId: payment.id,
        amount: FIXED_PRICE_BRL,
        qrCodeBase64: qrCodeBase64,
        qrCode: qrCode,
        expiresAt: payment.date_of_expiration
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      console.error("[create-pix-payment] Erro inesperado:", err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
