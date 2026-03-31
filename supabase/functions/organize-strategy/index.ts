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
✅ Correto: "Ajuste os títulos dos itens com palavras-chave"
❌ Errado: "É importante verificar…" / "Seria interessante ajustar…"

SOBRE CONTATO COM O CLIENTE:
Sempre que envolver validação de informação, deixe claro que o gestor deve falar com o cliente no grupo (canal oficial de comunicação).

REGRAS OBRIGATÓRIAS:

1. NÃO DUPLICAR CATEGORIAS. Se já existir uma categoria, adicione novas informações dentro dela. NUNCA criar categoria repetida.

2. RESPEITAR EXATAMENTE o texto enviado. Manter fielmente, sem alterações de sentido — apenas organizando.

3. TEXTOS CURTOS E DIRETOS. Cada item deve ter NO MÁXIMO 1 frase curta e direta, em tom imperativo. Sem explicações longas.

4. SEPARAR ITENS CORRETAMENTE. Se o texto mencionar mais de um assunto (ex: "categoria principal e nome"), crie um card/item SEPARADO para cada um. NUNCA junte dois temas diferentes em um único item.

5. Cada item deve começar com "-" no nome (para formatação WhatsApp).

SOBRE CATEGORIA DA LOJA (Detalhes da loja):
Sempre que houver Categoria Principal, Subcategoria1, Subcategoria2 — agrupar em "Detalhes da loja" com a explicação:
"Essas categorias funcionam como nichos dentro da plataforma e impactam diretamente na visibilidade da loja. Quando configuradas corretamente, aumentam a exposição para o público certo; quando configuradas incorretamente, reduzem o alcance da loja."

ESTRUTURA PADRÃO DE CATEGORIAS (use EXATAMENTE estas quando aplicável, nesta ordem):
1. Detalhes da loja
2. Configuração de entrega
3. Minhas promoções
4. Avaliações
5. Cardápio
6. Estruturação de categorias
7. Reorganização de categorias

NUNCA repetir ou recriar essas categorias. Só crie novas se o conteúdo não se encaixar.

BASE DE CONHECIMENTO DA PLATAFORMA (conteúdo real dos guias oficiais — use como referência estratégica):

COBERTURA DE IMAGEM:
- A cobertura de imagem mede quantos itens do cardápio possuem fotos vs total de itens.
- Meta de Ouro: pelo menos 99% a 100% dos pratos devem ter fotos para pontuação máxima (2 pontos no indicador).
- Cardápio com fotos completas e atraentes aumenta confiança do cliente e conversão de vendas.
- Dicas de foto: usar iluminação natural (perto de janela), ângulos clássicos (de cima ou levemente inclinado), fotos reais dos pratos (nunca fotos de internet).
- Manter fundos limpos e parecidos para todas as fotos dá ar profissional.
- Restaurantes com Score de Qualidade acima de 7 ganham créditos de publicidade grátis.

AVALIAÇÕES (5 ESTRELAS):
- A Avaliação do Comerciante é a média das notas dos consumidores após receberem o pedido.
- Compõe a Nota de Qualidade geral (vale 2 pontos de 10).
- Nota baixa (abaixo de 4.0) faz cliente desistir e comprar no concorrente.
- Meta: manter avaliação média acima de 4.5 estrelas.
- Ações: responder avaliações, agradecer elogios, gerenciar críticas com educação.
- Incentivos: bilhetinho na sacola pedindo avaliação, mimos surpresa (bala, recado à mão).
- Cozinha: caprichar em sabor, temperatura e embalagem térmica.

PRIMEIROS PEDIDOS E VISIBILIDADE:
- Loja deve estar aberta no horário correto, itens ativos, preços/descrições/fotos corretos, área de entrega configurada.
- Loja incompleta ou com informações inconsistentes aparece menos para clientes.
- Cardápio atrativo: focar em itens simples e populares, combos com bom custo-benefício, descrições claras.
- Campanhas promocionais são a forma mais rápida de gerar primeiros pedidos.
- Participar de campanhas ajuda a aparecer para mais clientes e competir com estabelecimentos consolidados.
- No início: selecionar poucos itens estratégicos, priorizar pratos fáceis de preparar, evitar cardápio muito amplo.

GESTÃO DE CARDÁPIO:
- Manter cardápio sempre atualizado é essencial para boa experiência.
- Item indisponível visível gera cancelamentos, frustração e perda de confiança.
- Construção: fotos aceitas devem ser reais, bem iluminadas, sem flash artificial.
- Preços na plataforma não podem ser mais caros que no estabelecimento físico.
- Organizar categorias pensando na jornada do cliente (o que ele procura primeiro).
- Priorizar itens mais vendidos no topo das categorias.
- Reduzir excesso de opções para evitar poluição visual.
- Títulos devem conter palavras-chave para facilitar busca na plataforma.
- Descrições devem gerar desejo e destacar qualidade dos ingredientes (sem exagero).
- Combos aumentam ticket médio.
- Promoções aumentam visibilidade dentro da plataforma.

OBJETIVO DA ESTRATÉGIA:
- Aumentar visibilidade na plataforma
- Melhorar conversão dos produtos
- Facilitar execução do gestor
- Organizar cardápio estrategicamente
- Reduzir esforço manual

FORMATO DE SAÍDA — retorne APENAS um JSON válido, sem markdown, sem explicação:
[
  {
    "name": "Detalhes da loja",
    "items": [
      { "name": "- Fotos dos produtos", "text": "Adicione foto em todos os itens do cardápio para aumentar a conversão." }
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
