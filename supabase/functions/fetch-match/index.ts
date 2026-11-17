import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { matchId, licenseKey, hwid } = await req.json().catch(() => ({}));

    if (!matchId) {
      return new Response(JSON.stringify({ error: "ID da partida não informado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!licenseKey || !hwid) {
      return new Response(JSON.stringify({ 
        error: "Acesso negado: Chave de licença ou HWID ausentes. Assine o plano Pro para utilizar o scanner.",
        code: "UNAUTHORIZED"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Validação estrita de licença Pro no banco de dados
    const cleanKey = String(licenseKey).trim().toUpperCase();
    const cleanHwid = String(hwid).trim();

    const { data: lic, error: licError } = await supabase
      .from("licenses")
      .select("id, status, expires_at, hwid")
      .eq("license_key", cleanKey)
      .maybeSingle();

    if (licError || !lic) {
      return new Response(JSON.stringify({ 
        error: "Chave de licença inválida ou inexistente.",
        code: "INVALID_KEY"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Valida Hardware ID (Trava anti-compartilhamento)
    if (lic.hwid && lic.hwid !== cleanHwid) {
      return new Response(JSON.stringify({ 
        error: "Esta licença está vinculada a outro computador. Desative no computador anterior para usar aqui.",
        code: "HWID_MISMATCH"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Valida Expiração
    if (lic.expires_at) {
      const exp = new Date(lic.expires_at);
      if (exp.getTime() < Date.now()) {
        await supabase.from("licenses").update({ status: "expired" }).eq("id", lic.id);
        return new Response(JSON.stringify({ 
          error: "Sua assinatura Pro expirou. Renove no site para continuar usando o scanner.",
          code: "EXPIRED"
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (lic.status !== "active") {
      return new Response(JSON.stringify({ 
        error: "Esta licença está inativa ou cancelada.",
        code: "INACTIVE"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Se tudo estiver válido, busca a partida na API do Deadlock (SEM CACHE)
    const cleanId = String(matchId).replace(/[^0-9]/g, "");
    const apiUrl = `https://api.deadlock-api.com/v1/matches/${cleanId}/metadata`;

    const apiRes = await fetch(apiUrl, {
      headers: { "Accept": "application/json" }
    });

    if (!apiRes.ok) {
      return new Response(JSON.stringify({ 
        error: `Erro ao buscar partida na Valve/Deadlock API (${apiRes.status})` 
      }), {
        status: apiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const matchData = await apiRes.json();

    // Retorna direto para o Premiere Pro
    return new Response(JSON.stringify(matchData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
