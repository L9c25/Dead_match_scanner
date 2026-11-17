import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    
    // Mercado Pago envia id de várias formas dependendo do tipo de webhook
    const paymentId = body?.data?.id || body?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
    const topic = body?.type || body?.topic || url.searchParams.get("topic") || "payment";

    console.log(`[MercadoPago Webhook] Recebido evento: topic=${topic}, paymentId=${paymentId}`);

    if (!paymentId) {
      return new Response(JSON.stringify({ message: "ID do pagamento ausente" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) {
      console.error("[MercadoPago Webhook] ERRO: MERCADOPAGO_ACCESS_TOKEN não configurado no Supabase.");
      return new Response(JSON.stringify({ error: "Token não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. Consulta o pagamento na API oficial do Mercado Pago para validação segura
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`
      }
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.warn(`[MercadoPago Webhook] Falha ao consultar pagamento ${paymentId}:`, errText);
      return new Response(JSON.stringify({ message: "Pagamento não encontrado na API do MP" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const payment = await mpResponse.json();
    console.log(`[MercadoPago Webhook] Status do pagamento ${paymentId}: ${payment.status}`);

    // 2. Se o Pix foi APROVADO
    if (payment.status === "approved") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

      const supabase = createClient(supabaseUrl, serviceRoleKey);

      // O Mercado Pago mascara payment.payer.email como "XXXXXXXXXXX" devido à LGPD.
      // O e-mail real do comprador é extraído de metadata.buyer_email ou external_reference.
      const customerEmail = 
        payment.metadata?.buyer_email ||
        payment.external_reference ||
        (payment.payer?.email && !payment.payer.email.includes("XXXX") ? payment.payer.email : "") ||
        "cliente_pix@deadlock.com";

      const customerName = 
        payment.metadata?.customer_name ||
        `${payment.payer?.first_name || ""} ${payment.payer?.last_name || ""}`.trim() ||
        "Cliente";
      const amount = payment.transaction_amount || 0;

      // Validação de Segurança Backend: Garante que o valor real pago é de no mínimo R$ 2,00
      if (amount < 2.00) {
        console.warn(`[MercadoPago Webhook] ALERTA DE SEGURANÇA: Valor pago (R$ ${amount}) é menor que R$ 2,00. Licença não será gerada.`);
        return new Response(JSON.stringify({ error: "Valor pago inferior ao preço oficial" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Verifica se já gerou chave para este pagamento (evita duplicatas)
      const { data: existingLicense } = await supabase
        .from("licenses")
        .select("id, license_key")
        .eq("payment_id", String(payment.id))
        .maybeSingle();

      if (existingLicense) {
        console.log(`[MercadoPago Webhook] Chave já existente para pagamento ${payment.id}.`);
        return new Response(JSON.stringify({ success: true, message: "Pagamento já processado" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // 3. Gera chave única no formato DEAD-XXXX-XXXX-XXXX
      const { data: generatedKey } = await supabase.rpc("generate_deadlock_key");
      const licenseKey = generatedKey || `DEAD-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // 4. Salva a licença no banco de dados (protegido contra requisições simultâneas)
      const { error: insertLicErr } = await supabase.from("licenses").insert({
        license_key: licenseKey,
        customer_email: customerEmail,
        customer_name: customerName,
        provider: "mercadopago",
        payment_id: String(payment.id),
        amount_paid: amount,
        currency: "BRL",
        status: "active"
      });

      if (insertLicErr) {
        // Se ocorreu conflito de duplicidade (unique constraint no payment_id)
        if (insertLicErr.code === "23505" || insertLicErr.message?.includes("duplicate") || insertLicErr.message?.includes("unique")) {
          console.log(`[MercadoPago Webhook] Chave recuperada após conflito de concorrência para pagamento ${payment.id}.`);
          return new Response(JSON.stringify({ success: true, message: "Pagamento já processado" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        console.error("[MercadoPago Webhook] Erro ao salvar licença:", insertLicErr);
        throw insertLicErr;
      }

      // 5. Registra o log do pagamento
      await supabase.from("payments").insert({
        provider: "mercadopago",
        external_id: String(payment.id),
        status: "approved",
        customer_email: customerEmail,
        amount: amount,
        currency: "BRL",
        raw_payload: payment
      });

      console.log(`🎉 [MercadoPago Webhook] Licença criada com SUCESSO para ${customerEmail} (R$ ${amount})`);

      // 6. Dispara a Edge Function send-license-email para enviar o e-mail de compra
      if (customerEmail && customerEmail.includes("@") && !customerEmail.includes("XXXX")) {
        try {
          const emailTriggerRes = await fetch(`${supabaseUrl}/functions/v1/send-license-email`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              type: "purchase",
              email: customerEmail,
              customerName: customerName,
              licenseKey: licenseKey,
              amount: amount
            })
          });

          const emailTriggerData = await emailTriggerRes.json();
          console.log(`[MercadoPago Webhook] Resposta da função send-license-email:`, emailTriggerData);
        } catch (mailErr) {
          console.error("[MercadoPago Webhook] Falha ao acionar send-license-email:", mailErr);
        }
      }

      // NUNCA vaza a chave de licença na resposta HTTP
      return new Response(JSON.stringify({
        success: true,
        message: "Pagamento aprovado e e-mail de acesso enviado com sucesso."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ status: payment.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("[MercadoPago Webhook] Erro:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
