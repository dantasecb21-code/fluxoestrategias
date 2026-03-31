import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { freeText, storeName } = await req.json();
    if (!freeText?.trim()) {
      return new Response(JSON.stringify({ error: "Texto é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você organiza textos livres em estratégias para lojas de delivery.

O usuário vai escrever de qualquer jeito, misturado, com erros, etc. Seu trabalho é organizar em categorias e itens.

REGRAS:
- Retorne APENAS um JSON válido, sem markdown, sem explicação
- Cada categoria tem "name" (nome curto) e "items" (array)
- Cada item tem "name" (começa com letra maiúscula, curto) e "text" (1 frase direta e casual explicando o que fazer)
- O texto deve ser prático, como se tivesse falando com o dono da loja
- NÃO use linguagem formal. Seja direto e simples
- Agrupe por temas como: Cardápio, Promoções, Avaliações, Detalhes da Loja, Operação, etc.
- Se algo não fizer sentido, ignore

FORMATO:
[
  {
    "name": "Cardápio",
    "items": [
      { "name": "Fotos dos produtos", "text": "Colocar foto em todos os itens do cardápio pra vender mais." }
    ]
  }
]`
          },
          {
            role: "user",
            content: `Loja: ${storeName || "não informada"}\n\nTexto do gestor:\n${freeText.trim()}`
          }
        ],
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || "[]";
    
    // Clean markdown code blocks if present
    content = content.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();

    const categories = JSON.parse(content);

    return new Response(JSON.stringify({ categories }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("organize-strategy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
