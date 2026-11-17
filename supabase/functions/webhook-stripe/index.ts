import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const eventType = body?.type;
    const eventData = body?.data?.object;

    console.log(`[Stripe Webhook] Recebido evento: ${eventType}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // =========================================================================
    // 1. EVENTO: checkout.session.completed ou invoice.payment_succeeded
    // =========================================================================
    if (eventType === "checkout.session.completed" || eventType === "invoice.payment_succeeded") {
      const session = eventData;

      const customerEmail = (
        session.customer_details?.email ||
        session.customer_email ||
        (session.customer_details?.name?.includes("@") ? session.customer_details?.name : "") ||
        ""
      ).trim().toLowerCase();

      if (!customerEmail || !customerEmail.includes("@")) {
        console.warn("[Stripe Webhook] Aviso: E-mail do comprador não encontrado na sessão.");
        return new Response(JSON.stringify({ received: true, warning: "E-mail ausente" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const customerName = session.customer_details?.name || customerEmail.split("@")[0] || "Cliente";
      const rawAmount = session.amount_total ?? session.amount_paid ?? 1500;
      const amount = rawAmount / 100;
      const currency = (session.currency || "BRL").toUpperCase();
      const paymentId = session.payment_intent || session.id || session.subscription || `stripe_${Date.now()}`;

      // Determina plano: Anual (>= 100) vs Mensal
      const isAnnual = amount >= 100 || session.subscription_details?.metadata?.plan === "annual";
      const planDays = isAnnual ? 365 : 30;
      const planType = isAnnual ? "annual" : "monthly";

      // Verifica se já processou este payment_id
      const { data: existingPaymentLic } = await supabase
        .from("licenses")
        .select("id, license_key")
        .eq("payment_id", String(paymentId))
        .maybeSingle();

      if (existingPaymentLic) {
        console.log(`[Stripe Webhook] Pagamento ${paymentId} já processado.`);
        return new Response(JSON.stringify({ success: true, message: "Já processado" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Verifica se o usuário já possui licença (RENOVAÇÃO)
      const { data: existingUserLic } = await supabase
        .from("licenses")
        .select("id, license_key, expires_at, status")
        .ilike("customer_email", customerEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let licenseKey: string;
      let newExpiresAt: Date;

      if (existingUserLic) {
        licenseKey = existingUserLic.license_key;
        const currentExpiry = existingUserLic.expires_at ? new Date(existingUserLic.expires_at) : null;
        const now = new Date();

        if (currentExpiry && currentExpiry > now) {
          newExpiresAt = new Date(currentExpiry.getTime() + planDays * 24 * 60 * 60 * 1000);
        } else {
          newExpiresAt = new Date(now.getTime() + planDays * 24 * 60 * 60 * 1000);
        }

        const { error: updateErr } = await supabase
          .from("licenses")
          .update({
            status: "active",
            plan_type: planType,
            expires_at: newExpiresAt.toISOString(),
            payment_id: String(paymentId),
            amount_paid: amount,
            currency: currency,
            provider: "stripe",
            updated_at: new Date().toISOString()
          })
          .eq("id", existingUserLic.id);

        if (updateErr) throw updateErr;
        console.log(`🔄 [Stripe Webhook] Licença RENOVADA (+${planDays} dias) para ${customerEmail}`);
      } else {
        const { data: generatedKey } = await supabase.rpc("generate_deadlock_key");
        licenseKey = generatedKey || `DEAD-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        newExpiresAt = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000);

        const { error: insertLicErr } = await supabase.from("licenses").insert({
          license_key: licenseKey,
          customer_email: customerEmail,
          customer_name: customerName,
          provider: "stripe",
          payment_id: String(paymentId),
          amount_paid: amount,
          currency: currency,
          status: "active",
          plan_type: planType,
          expires_at: newExpiresAt.toISOString()
        });

        if (insertLicErr) throw insertLicErr;
        console.log(`🎉 [Stripe Webhook] Nova licença Pro criada para ${customerEmail} (${currency} ${amount})`);
      }

      await supabase.from("payments").insert({
        provider: "stripe",
        external_id: String(paymentId),
        status: "approved",
        customer_email: customerEmail,
        amount: amount,
        currency: currency,
        raw_payload: session
      });

      try {
        await fetch(`${supabaseUrl}/functions/v1/send-license-email`, {
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
            amount: amount,
            currency: currency,
            planType: planType
          })
        });
      } catch (e) {}

      return new Response(JSON.stringify({ success: true, message: "Licença processada com sucesso" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // =========================================================================
    // 2. EVENTO: customer.subscription.deleted (Cancelamento)
    // =========================================================================
    if (eventType === "customer.subscription.deleted") {
      const sub = eventData;
      const subId = sub.id;

      const { data: licToCancel } = await supabase
        .from("licenses")
        .select("id, customer_email")
        .eq("payment_id", subId)
        .maybeSingle();

      if (licToCancel) {
        await supabase
          .from("licenses")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", licToCancel.id);
        console.log(`🛑 [Stripe Webhook] Assinatura ${subId} marcada como cancelled para ${licToCancel.customer_email}`);
      }

      return new Response(JSON.stringify({ success: true, message: "Cancelamento registrado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("[Stripe Webhook] Erro:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
