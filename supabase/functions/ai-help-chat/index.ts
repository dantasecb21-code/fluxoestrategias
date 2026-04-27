import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_MODE_MONTHLY_LIMIT = 1000;
const FREE_MODE_BLOCK_PCT = 90;

const SYSTEM_PROMPT = `Você é o Assistente MiBusca — um especialista em plataformas de delivery.

Seu papel:
- Responder dúvidas sobre gestão de lojas em plataformas de delivery
- Ajudar com cardápio, promoções, configurações, avaliações, finanças, entrega
- Dar dicas práticas para melhorar a performance das lojas
- Explicar como funciona o painel de gestão das plataformas

Regras:
- Seja direto e objetivo, sem enrolação
- Use linguagem informal e amigável (pt-BR)
- Quando não souber algo específico, diga que não tem certeza e sugira onde buscar
- Nunca invente dados financeiros ou taxas específicas — elas mudam com frequência
- Formate respostas com markdown quando útil (listas, negrito, etc.)
- Respostas curtas: máximo 3 parágrafos, a menos que o usuário peça mais detalhes`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check + increment monthly quota (atomic)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: quota, error: quotaError } = await admin.rpc("check_and_increment_ai_usage");
    if (quotaError) {
      console.error("Quota check failed:", quotaError);
    } else if (quota && (quota as any).blocked) {
      const q = quota as any;
      return new Response(
        JSON.stringify({
          error: `Modo gratuito protegido: a IA pausou em ${q.current}/${q.limit} chamadas para evitar cobrança.`,
          code: "QUOTA_EXCEEDED",
          quota: q,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((msg: { role: string; content: string }) => ({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content,
          })),
        ],
        stream: true,
        max_tokens: 700,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Lovable AI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({
          error: "Muitas mensagens em pouco tempo. Aguarde um minuto e tente novamente.",
          code: "AI_RATE_LIMIT"
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({
          error: "Modo gratuito protegido: a IA foi pausada para evitar cobrança.",
          code: "AI_FREE_MODE_BLOCKED"
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao conectar com a IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-help-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
