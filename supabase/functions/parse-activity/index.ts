import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, image } = await req.json();
    if (!text?.trim() && !image) {
      return new Response(JSON.stringify({ error: "Texto ou imagem é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um assistente que extrai dados de atividades/solicitações de clientes a partir de texto livre ou imagens (prints de conversas).
Extraia os seguintes campos:
- client_name: nome do cliente
- store_name: nome da loja/estabelecimento
- description: o que precisa ser feito (ação/atividade solicitada)
- deadline: prazo/data limite (formato YYYY-MM-DD se encontrada, string vazia se não)
- priority: prioridade (high, medium ou low) - se o texto indicar urgência use "high", se normal use "medium"

Responda APENAS com JSON válido, sem markdown. Exemplo:
{"client_name":"João Silva","store_name":"Pizzaria do João","description":"Atualizar cardápio e fotos do perfil","deadline":"2026-04-15","priority":"medium"}

Se não conseguir identificar um campo, use string vazia "".`;

    // Build user message content (text and/or image)
    const userContent: any[] = [];
    if (text?.trim()) {
      userContent.push({ type: "text", text: text.trim() });
    }
    if (image) {
      userContent.push({
        type: "image_url",
        image_url: { url: image },
      });
    }
    if (userContent.length === 0) {
      userContent.push({ type: "text", text: "" });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Erro ao processar com IA");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content?.trim() || "{}";
    
    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      parsed = { client_name: "", store_name: "", description: "", deadline: "", priority: "medium" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
