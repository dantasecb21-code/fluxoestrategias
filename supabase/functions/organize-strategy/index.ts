import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { freeText, storeName, imageBase64 } = await req.json();
    if (!freeText?.trim() && !imageBase64) {
      return new Response(JSON.stringify({ error: "Texto ou imagem é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch AI context history using service role for reading
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: contextEntries } = await serviceClient
      .from("ai_context_entries")
      .select("content, structured_summary, category")
      .order("created_at", { ascending: false })
      .limit(20);

    let contextBlock = "";
    if (contextEntries && contextEntries.length > 0) {
      contextBlock = "\n\nHISTÓRICO DE ESTRATÉGIAS ANTERIORES (use para manter consistência e evitar repetição):\n" +
        contextEntries.map((e: any, i: number) => `${i + 1}. Loja: ${e.category} | Input: ${e.content.substring(0, 200)} | Categorias geradas: ${e.structured_summary}`).join("\n");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build messages with optional image
    const userContent: any[] = [];
    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${imageBase64}` },
      });
      userContent.push({
        type: "text",
        text: `Analise esta imagem/print da loja "${storeName || "não informada"}". Identifique problemas, oportunidades de melhoria e crie ações estratégicas baseadas no que você vê.${freeText?.trim() ? `\n\nTexto adicional do gestor:\n${freeText.trim()}` : ""}`,
      });
    } else {
      userContent.push({
        type: "text",
        text: `Loja: ${storeName || "não informada"}\n\nTexto do gestor:\n${freeText.trim()}`,
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: imageBase64 ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é a IA Lavebo. Seu papel é organizar textos livres em estratégias estruturadas, claras e operacionais para lojas de delivery.

CONTEXTO DO PROCESSO:
- O cliente é o dono do restaurante.
- O gestor operacional executa as ações.
- O gestor estratégico define a direção.
- Você (Lavebo) organiza e transforma as informações em plano de ação.

⚠️ REGRA MAIS IMPORTANTE – TOM DE COMUNICAÇÃO:
Sempre escrever no formato de AÇÃO DIRETA ao gestor, tom imperativo e operacional.
✅ Correto: "Verifique o telefone da loja junto ao cliente no grupo"
✅ Correto: "Inclua uma nova categoria no cardápio"
❌ Errado: "É importante verificar…" / "Seria interessante ajustar…"

📋 DETALHAMENTO OBRIGATÓRIO – PASSO A PASSO:
Cada item DEVE conter um passo a passo detalhado para o gestor executar. O campo "text" deve ter uma sequência lógica de ações.
Exemplo:
- name: "- Foto de capa"
- text: "1. Peça ao cliente uma foto profissional da fachada ou prato principal. 2. Acesse Detalhes da Loja > Foto de capa. 3. Faça o upload da imagem com resolução mínima 1200x400px. 4. Valide se a imagem está carregando corretamente no app."

SOBRE CONTATO COM O CLIENTE:
Sempre que envolver validação de informação, deixe claro que o gestor deve falar com o cliente no grupo.

REGRAS OBRIGATÓRIAS:

1. NÃO DUPLICAR CATEGORIAS. Se já existir uma categoria, adicione novas informações dentro dela.

2. RESPEITAR EXATAMENTE o texto enviado. Manter fielmente, sem alterações de sentido.

3. TEXTOS COM PASSO A PASSO. Cada item deve ter passos numerados e claros no campo "text".

4. SEPARAR ITENS CORRETAMENTE. Se o texto mencionar mais de um assunto, crie um item SEPARADO para cada um.

5. Cada item deve começar com "-" no nome (para formatação WhatsApp).

SOBRE ANÁLISE DE IMAGENS/PRINTS:
Se receber uma imagem, analise visualmente:
- Identifique problemas (fotos ruins, preços incorretos, categorias erradas, falta de informação)
- Sugira melhorias específicas baseadas no que vê
- Cruze com o contexto e conhecimento da plataforma
- Crie ações práticas com passo a passo

SOBRE CATEGORIA DA LOJA (Detalhes da loja):
Sempre que houver Categoria Principal, Subcategoria1, Subcategoria2 — agrupar em "Detalhes da loja" com a explicação:
"Essas categorias funcionam como nichos dentro da plataforma e impactam diretamente na visibilidade da loja."

ESTRUTURA PADRÃO DE CATEGORIAS (use EXATAMENTE estas quando aplicável, nesta ordem):
1. Detalhes da loja
2. Configuração de entrega
3. Minhas promoções
4. Avaliações
5. Cardápio
6. Estruturação de categorias
7. Reorganização de categorias

BASE DE CONHECIMENTO DA PLATAFORMA:

COBERTURA DE IMAGEM:
- Meta: 99-100% dos pratos com fotos. Fotos reais, iluminação natural, ângulos clássicos.
- Score de Qualidade acima de 7 = créditos de publicidade grátis.

AVALIAÇÕES (5 ESTRELAS):
- Meta: acima de 4.5 estrelas. Responder avaliações, agradecer elogios, gerenciar críticas.
- Incentivos: bilhetinho pedindo avaliação, mimos surpresa.

GESTÃO DE CARDÁPIO:
- Manter atualizado, fotos reais, preços corretos.
- Títulos com palavras-chave. Combos aumentam ticket médio.
${contextBlock}

FORMATO DE SAÍDA — retorne APENAS um JSON válido, sem markdown, sem explicação:
[
  {
    "name": "Detalhes da loja",
    "items": [
      { "name": "- Fotos dos produtos", "text": "1. Acesse o cardápio no painel. 2. Identifique itens sem foto. 3. Peça ao cliente fotos reais dos pratos. 4. Faça upload de cada foto. 5. Confirme que todas aparecem corretamente." }
    ]
  }
]`
          },
          {
            role: "user",
            content: imageBase64 ? userContent : userContent[0].text,
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
