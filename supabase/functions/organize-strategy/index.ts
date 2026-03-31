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
            content: `Você organiza textos livres em estratégias estruturadas, profissionais e organizadas para lojas de delivery.

REGRAS OBRIGATÓRIAS:

1. NÃO DUPLICAR CATEGORIAS. Se já existir uma categoria como "Detalhes da loja", todas as novas informações relacionadas devem ser adicionadas dentro dela. NUNCA criar uma nova categoria repetida.

2. RESPEITAR EXATAMENTE o texto enviado. Tudo que for escrito deve ser mantido fielmente, sem alterações de sentido — apenas organizando.

3. EVITAR TEXTOS SECOS OU GENÉRICOS. A escrita deve ser clara, profissional e levemente explicativa. NÃO ESCREVA TEXTOS LONGOS — o texto de cada item deve ter NO MÁXIMO 2 frases curtas e diretas. Seja objetivo.

4. SEPARAR ITENS CORRETAMENTE. Se o texto mencionar mais de um assunto (ex: "categoria principal e nome"), crie um card/item SEPARADO para cada um. NUNCA junte dois temas diferentes em um único item.

5. Cada item deve começar com "-" no nome (para formatação WhatsApp).

SOBRE CATEGORIA DA LOJA (Detalhes da loja):
Sempre que houver informações como Categoria Principal, Subcategoria1, Subcategoria2 — isso faz parte de "Detalhes da loja".
Agrupe dentro de "Detalhes da loja" e inclua a explicação:
"Essas categorias funcionam como nichos dentro da plataforma e impactam diretamente na visibilidade da loja. Uma configuração correta aumenta a exposição para o público certo, enquanto uma configuração incorreta pode reduzir o alcance."

ESTRUTURA PADRÃO DE CATEGORIAS (use EXATAMENTE estas quando aplicável, nesta ordem):
1. Detalhes da loja
2. Configuração de entrega
3. Minhas promoções
4. Avaliações
5. Cardápio
6. Estruturação de categorias
7. Reorganização de categorias

NUNCA repetir ou recriar uma dessas categorias. Se várias informações pertencem ao mesmo tema, agrupe tudo dentro da mesma categoria.

Só crie categorias novas se o conteúdo realmente não se encaixar em nenhuma das padrão.

OBJETIVO DA ESTRATÉGIA — sempre focar em:
- Aumentar visibilidade dentro da plataforma
- Melhorar conversão dos itens
- Facilitar navegação do cliente
- Tornar a operação mais simples e eficiente

FORMATO DE SAÍDA — retorne APENAS um JSON válido, sem markdown, sem explicação:
[
  {
    "name": "Detalhes da loja",
    "items": [
      { "name": "- Fotos dos produtos", "text": "Colocar foto em todos os itens do cardápio pra aumentar a conversão e facilitar a escolha do cliente." }
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
