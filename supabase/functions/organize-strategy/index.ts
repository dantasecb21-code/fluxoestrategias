import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJsonArray(text: string): any[] {
  // Remove markdown code blocks
  let cleaned = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  
  // Try direct parse
  try { return JSON.parse(cleaned); } catch {}
  
  // Try to find JSON array in the text
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch {}
  }
  
  // Try to fix common JSON issues: trailing commas, unescaped quotes
  try {
    cleaned = cleaned
      .replace(/,\s*]/g, "]")
      .replace(/,\s*}/g, "}")
      .replace(/'/g, '"');
    return JSON.parse(cleaned);
  } catch {}
  
  // Last resort: try to extract from array match with fixes
  if (arrayMatch) {
    try {
      const fixed = arrayMatch[0]
        .replace(/,\s*]/g, "]")
        .replace(/,\s*}/g, "}")
        .replace(/\n/g, " ");
      return JSON.parse(fixed);
    } catch {}
  }
  
  throw new Error("Não foi possível interpretar a resposta da IA. Tente novamente.");
}

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

    // Fetch AI context history
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: contextEntries } = await serviceClient
      .from("ai_context_entries")
      .select("content, structured_summary, category")
      .order("created_at", { ascending: false })
      .limit(20);

    let contextBlock = "";
    if (contextEntries && contextEntries.length > 0) {
      contextBlock = "\n\nHISTORICO DE ESTRATEGIAS ANTERIORES (use para manter consistencia):\n" +
        contextEntries.map((e: any, i: number) => `${i + 1}. Loja: ${e.category} | Input: ${e.content.substring(0, 150)}`).join("\n");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch training courses for extra context
    const { data: trainingCourses } = await serviceClient
      .from("training_courses")
      .select("title, content")
      .eq("published", true)
      .order("order_index", { ascending: true });

    let trainingBlock = "";
    if (trainingCourses && trainingCourses.length > 0) {
      trainingBlock = "\n\nBASE DE TREINAMENTOS (use como referencia para acoes):\n" +
        trainingCourses.map((c: any, i: number) => `${i + 1}. ${c.title}: ${c.content}`).join("\n");
    }

    const systemPrompt = `Voce e a IA Lavebo. Seu papel e organizar textos livres e analisar prints/imagens em ESTRATEGIAS DE ACAO para lojas de delivery.

CONTEXTO: O gestor operacional executa as acoes. O gestor estrategico define a direcao. Voce organiza tudo em plano de acao ESTRATEGICO.

REGRA DE TOM E ESTILO — MUITO IMPORTANTE:
- Cada item deve ser uma DIRETRIZ ESTRATEGICA, NAO um tutorial.
- Tom: imperativo, conciso, orientado a resultado.
- O campo "text" deve conter UMA FRASE estrategica que descreva O QUE fazer e POR QUE, sem passo a passo numerado.

EXEMPLOS CORRETOS de "text":
- "Reestruturar os combos oferecidos, combinando itens com boa margem e alta saida para aumentar o ticket medio sem comprometer a rentabilidade."
- "Criar um cupom de primeira compra com desconto atrativo para captar novos clientes e incentivar a experimentacao dos produtos da loja."
- "Verificar e ajustar o horario de funcionamento para garantir cobertura nos horarios de pico da regiao."
- "Revisar foto de capa da loja, garantindo imagem em alta resolucao que represente o produto principal e atraia o cliente no aplicativo."

EXEMPLOS ERRADOS (NAO FACA ISSO):
- "1. Acesse o portal. 2. Selecione a aba Perfil. 3. Clique em Editar..." (isso e tutorial, NAO estrategia)

ANALISE PROATIVA DE IMAGENS/PRINTS:
Quando receber uma imagem, voce DEVE ser PROATIVO:
- Identifique EXATAMENTE qual area da plataforma e mostrada no print
- Gere acoes estrategicas baseadas no que voce observa
- Se vir horario: gere acao sobre otimizar horario
- Se vir cardapio: gere acoes sobre fotos, precos, descricoes, combos
- Se vir avaliacoes: gere acoes sobre reputacao e atendimento
- Se vir promocoes: gere acoes sobre campanhas e cupons
- Se vir detalhes da loja: gere acoes sobre identidade visual e dados
- Se vir entrega: gere acoes sobre raio, taxa, tempo
- Mesmo SEM texto do gestor, a imagem SOZINHA deve gerar acoes completas

REGRAS:
1. NAO DUPLICAR CATEGORIAS
2. RESPEITAR o texto enviado
3. Campo "text" = 1 FRASE ESTRATEGICA (sem passo a passo)
4. SEPARAR ITENS por assunto
5. Nome do item comeca com "-"

CATEGORIAS PADRAO (use quando aplicavel):
1. Detalhes da loja
2. Configuracao de entrega
3. Minhas promocoes
4. Avaliacoes
5. Cardapio
6. Estruturacao de categorias
7. Reorganizacao de categorias
${contextBlock}
${trainingBlock}

FORMATO DE SAIDA - retorne SOMENTE um array JSON valido, sem markdown, sem texto antes ou depois:
[{"name":"Detalhes da loja","items":[{"name":"- Foto de capa","text":"Revisar foto de capa da loja, garantindo imagem em alta resolucao que represente o produto principal e atraia o cliente no aplicativo."}]}]`;

    // Build user message
    let userMessage: any;
    if (imageBase64) {
      const textPart = freeText?.trim()
        ? `Loja: ${storeName || "nao informada"}. Texto do gestor: ${freeText.trim()}`
        : `Loja: ${storeName || "nao informada"}. Analise este print da plataforma e crie acoes estrategicas baseadas no que voce ve. Seja proativo e especifico.`;
      
      userMessage = [
        { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
        { type: "text", text: textPart },
      ];
    } else {
      userMessage = `Loja: ${storeName || "nao informada"}\n\nTexto do gestor:\n${freeText.trim()}`;
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisicoes excedido. Aguarde um momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Creditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || "[]";
    console.log("AI raw response (first 500 chars):", rawContent.substring(0, 500));
    
    const categories = extractJsonArray(rawContent);

    return new Response(JSON.stringify({ categories }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("organize-strategy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
