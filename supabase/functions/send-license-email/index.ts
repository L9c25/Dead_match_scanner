import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Envio direto via Gmail SMTP usando TLS nativo do Deno (Porta 465)
 * Remetente: lucentryshop@gmail.com
 */
async function sendGmailSmtp({
  user,
  pass,
  to,
  subject,
  html,
}: {
  user: string;
  pass: string;
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const conn = await Deno.connectTls({
    hostname: "smtp.gmail.com",
    port: 465,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readReply(): Promise<string> {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    if (!n) return "";
    return decoder.decode(buf.subarray(0, n));
  }

  async function sendCmd(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readReply();
  }

  // 1. Saudação do servidor (220)
  const greeting = await readReply();
  if (!greeting.startsWith("220")) {
    conn.close();
    throw new Error("SMTP Greeting failed: " + greeting);
  }

  // 2. EHLO
  await sendCmd("EHLO localhost");

  // 3. AUTH LOGIN
  await sendCmd("AUTH LOGIN");
  await sendCmd(btoa(user));
  const authRes = await sendCmd(btoa(pass));
  if (!authRes.startsWith("235")) {
    conn.close();
    throw new Error("SMTP Auth failed: " + authRes);
  }

  // 4. MAIL FROM & RCPT TO
  await sendCmd(`MAIL FROM:<${user}>`);
  await sendCmd(`RCPT TO:<${to}>`);

  // 5. DATA
  await sendCmd("DATA");

  // 6. Cabeçalhos e Corpo UTF-8
  const base64Subject = btoa(unescape(encodeURIComponent(subject)));
  const emailPayload = [
    `From: Lucentry Shop <${user}>`,
    `To: <${to}>`,
    `Subject: =?UTF-8?B?${base64Subject}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
    "."
  ].join("\r\n");

  const dataRes = await sendCmd(emailPayload);
  await sendCmd("QUIT");
  conn.close();

  return dataRes.includes("250");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const type = body.type || "recovery"; // "purchase" ou "recovery"
    const cleanEmail = (body.email || "").trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return new Response(JSON.stringify({ error: "E-mail inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const GMAIL_USER = Deno.env.get("GMAIL_USER") || "lucentryshop@gmail.com";
    const GMAIL_PASS = Deno.env.get("GMAIL_PASS") || "iswcpxetufnbaaxu";

    // =========================================================================
    // CASO 1: E-MAIL DE COMPRA (Disparado pelo webhook após pagamento aprovado)
    // =========================================================================
    if (type === "purchase") {
      const licenseKey = body.licenseKey;
      const amount = body.amount || 2.00;
      const customerName = body.customerName || "Cliente";

      if (!licenseKey) {
        return new Response(JSON.stringify({ error: "Chave não fornecida." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const purchaseEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;padding:36px;text-align:left;">
                  <tr>
                    <td>
                      <h1 style="margin:0 0 8px 0;color:#111827;font-size:24px;font-weight:800;">Lucentry Shop</h1>
                      <p style="margin:0 0 24px 0;color:#6b7280;font-size:14px;">Confirmação de Pedido & Chave de Acesso</p>
                      
                      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;">
                        <p style="margin:0;color:#166534;font-size:15px;font-weight:600;">🎉 Pagamento Aprovado com Sucesso!</p>
                        <p style="margin:6px 0 0 0;color:#15803d;font-size:13px;">Olá, ${customerName}! Sua compra na Lucentry Shop foi confirmada. A sua chave de licença vitalícia já foi gerada e está liberada.</p>
                      </div>

                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-bottom:1px solid #e5e7eb;padding-bottom:16px;">
                        <tr>
                          <td style="color:#6b7280;font-size:14px;">Produto:</td>
                          <td align="right" style="color:#111827;font-size:14px;font-weight:700;">Deadlock Match Tracker</td>
                        </tr>
                        <tr>
                          <td style="color:#6b7280;font-size:14px;padding-top:8px;">Valor:</td>
                          <td align="right" style="color:#111827;font-size:14px;font-weight:700;padding-top:8px;">R$ ${Number(amount).toFixed(2).replace('.', ',')} (Vitalício)</td>
                        </tr>
                      </table>

                      <p style="margin:0 0 8px 0;color:#374151;font-size:14px;font-weight:700;">Sua Chave de Licença:</p>
                      <div style="background:#f3f4f6;border:2px dashed #9ca3af;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px;">
                        <span style="font-family:monospace;font-size:22px;font-weight:800;color:#111827;letter-spacing:2px;">${licenseKey}</span>
                      </div>

                      <div style="text-align:center;margin-bottom:24px;">
                        <a href="https://pub-3d2e50a01e2e4fd5af92763dd84d26a6.r2.dev/Deadlock_Toolkit_v1.0.0.zip" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;box-shadow:0 4px 10px rgba(22,163,74,0.3);">
                          ⬇️ Baixar Instalador do Plugin (.ZIP)
                        </a>
                      </div>

                      <div style="background:#f8fafc;border-left:4px solid #0f172a;padding:14px;margin-bottom:24px;border-radius:4px;">
                        <p style="margin:0 0 6px 0;color:#0f172a;font-size:13px;font-weight:700;">⚡ Como Instalar e Ativar no Adobe Premiere Pro:</p>
                        <ol style="margin:0;padding-left:20px;color:#475569;font-size:13px;line-height:1.6;">
                          <li>Baixe e extraia o arquivo <strong>Deadlock_Toolkit_v1.0.0.zip</strong> no botão acima.</li>
                          <li>Execute o instalador <strong>Instalar_Deadlock_Scanner.bat</strong> (leva 2 segundos).</li>
                          <li>Abra o Premiere Pro (versões 2025 ou 2026).</li>
                          <li>No menu superior, vá em: <strong>Janela &gt; Extensões &gt; Deadlock Toolkit</strong>.</li>
                          <li>Cole a sua chave de licença e clique em <strong>Ativar Licença</strong>.</li>
                        </ol>
                      </div>

                      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;border-top:1px solid #f3f4f6;padding-top:20px;">
                        Dúvidas ou suporte? Responda diretamente a este e-mail ou acesse a Lucentry Shop.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        await sendGmailSmtp({
          user: GMAIL_USER,
          pass: GMAIL_PASS,
          to: cleanEmail,
          subject: "🎉 Sua Licença do Deadlock Match Tracker — Lucentry Shop",
          html: purchaseEmailHtml,
        });
        console.log(`[send-license-email] E-mail de COMPRA enviado com sucesso para ${cleanEmail}`);
      } catch (err) {
        console.error("[send-license-email] Erro ao enviar e-mail de compra:", err);
      }

      // Jamais vaza a chave na resposta
      return new Response(JSON.stringify({
        success: true,
        message: "E-mail de confirmação de compra enviado com sucesso."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // =========================================================================
    // CASO 2: RECUPERAÇÃO / CONSULTA DE CHAVE (Disparado pelo frontend)
    // =========================================================================
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Busca no banco via service_role (o frontend não tem acesso direto)
    const { data: licenses, error: dbErr } = await supabase
      .from("licenses")
      .select("license_key, status, hwid, activated_at, created_at")
      .ilike("customer_email", cleanEmail);

    if (dbErr) {
      console.error("[send-license-email] Erro no banco de dados:", dbErr);
      throw dbErr;
    }

    if (licenses && licenses.length > 0) {
      const keysListHtml = licenses.map((lic, idx) => `
        <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:12px;">
          <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">Licença #${idx + 1} (${lic.status === 'active' ? '✅ Ativa' : '⚠️ ' + lic.status})</div>
          <div style="font-family:monospace;font-size:18px;font-weight:bold;color:#111827;letter-spacing:1px;">${lic.license_key}</div>
          <div style="font-size:11px;color:#64748b;margin-top:6px;">
            ${lic.hwid ? `Vinculada ao PC em ${new Date(lic.activated_at || lic.created_at).toLocaleDateString('pt-BR')}` : 'Chave virgem — pronta para ser ativada no seu computador.'}
          </div>
        </div>
      `).join("");

      const recoveryEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;padding:36px;text-align:left;">
                  <tr>
                    <td>
                      <h1 style="margin:0 0 8px 0;color:#111827;font-size:24px;font-weight:800;">Lucentry Shop</h1>
                      <p style="margin:0 0 24px 0;color:#6b7280;font-size:14px;">Consulta & Recuperação de Chave de Licença</p>

                      <p style="margin:0 0 16px 0;color:#374151;font-size:14px;line-height:1.5;">
                        Olá! Conforme solicitado no site da <strong>Lucentry Shop</strong>, aqui estão os dados da sua licença:
                      </p>

                      ${keysListHtml}

                      <div style="background:#f8fafc;border-left:4px solid #0f172a;padding:14px;margin:24px 0;border-radius:4px;">
                        <p style="margin:0 0 6px 0;color:#0f172a;font-size:13px;font-weight:700;">⚡ Como Ativar no Adobe Premiere Pro:</p>
                        <ol style="margin:0;padding-left:20px;color:#475569;font-size:13px;line-height:1.6;">
                          <li>Abra o Premiere Pro (versões 2025 ou 2026).</li>
                          <li>Vá em <strong>Janela &gt; Extensões &gt; Deadlock Toolkit</strong>.</li>
                          <li>Cole a sua chave de licença e clique em <strong>Ativar Licença</strong>.</li>
                        </ol>
                      </div>

                      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;border-top:1px solid #f3f4f6;padding-top:20px;">
                        Se você não solicitou este e-mail, pode desconsiderá-lo com segurança.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        await sendGmailSmtp({
          user: GMAIL_USER,
          pass: GMAIL_PASS,
          to: cleanEmail,
          subject: "🔑 Sua Chave de Licença — Lucentry Shop",
          html: recoveryEmailHtml,
        });
        console.log(`[send-license-email] E-mail de RECUPERAÇÃO enviado para ${cleanEmail}`);
      } catch (err) {
        console.error("[send-license-email] Erro ao enviar e-mail de recuperação:", err);
      }
    } else {
      console.log(`[send-license-email] Nenhuma licença encontrada para ${cleanEmail}`);
    }

    // Retorna mensagem padronizada SEM NENHUMA CHAVE no JSON (segurança absoluta)
    return new Response(JSON.stringify({
      success: true,
      message: "Se houver licenças ativas associadas a este e-mail, elas foram enviadas para a sua caixa de entrada."
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("[send-license-email] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
