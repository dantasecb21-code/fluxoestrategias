import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJsonObject(text: string): any {
  let cleaned = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  
  try { return JSON.parse(cleaned); } catch {}
  
  // Try to find JSON object or array
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch {}
  }
  
  // Fix common issues
  try {
    cleaned = cleaned.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}").replace(/'/g, '"');
    return JSON.parse(cleaned);
  } catch {}
  
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

    const { freeText, storeName, imageBase64, mode, followUpAnswers } = await req.json();
    
    if (mode !== "generate" && !freeText?.trim() && !imageBase64) {
      return new Response(JSON.stringify({ error: "Texto ou imagem é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // MODE: "analyze" (default) - detect print type and ask questions if needed
    // MODE: "generate" - generate final strategy with follow-up answers
    const isGenerateMode = mode === "generate";

    if (isGenerateMode) {
      // Generate final categories from follow-up answers
      return await handleGenerate(serviceClient, LOVABLE_API_KEY, storeName, followUpAnswers, corsHeaders);
    }

    // Default: analyze image/text
    if (imageBase64) {
      // Detect print type and ask follow-up questions
      return await handleImageAnalysis(serviceClient, LOVABLE_API_KEY, storeName, freeText, imageBase64, corsHeaders);
    } else {
      // Text-only: direct generation (original behavior)
      return await handleTextOnly(serviceClient, LOVABLE_API_KEY, storeName, freeText, corsHeaders);
    }
  } catch (e) {
    console.error("organize-strategy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callAI(apiKey: string, model: string, systemPrompt: string, userMessage: any) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw { status: 429, message: "Limite de requisicoes excedido. Aguarde um momento." };
    if (response.status === 402) throw { status: 402, message: "Creditos insuficientes." };
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    throw new Error("AI gateway error");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function getContextBlocks(serviceClient: any) {
  const { data: contextEntries } = await serviceClient
    .from("ai_context_entries")
    .select("content, structured_summary, category")
    .order("created_at", { ascending: false })
    .limit(20);

  let contextBlock = "";
  if (contextEntries && contextEntries.length > 0) {
    contextBlock = "\n\nHISTORICO DE ESTRATEGIAS ANTERIORES:\n" +
      contextEntries.map((e: any, i: number) => `${i + 1}. Loja: ${e.category} | Input: ${e.content.substring(0, 150)}`).join("\n");
  }

  const { data: trainingCourses } = await serviceClient
    .from("training_courses")
    .select("title, content")
    .eq("published", true)
    .order("order_index", { ascending: true });

  let trainingBlock = "";
  if (trainingCourses && trainingCourses.length > 0) {
    trainingBlock = "\n\nBASE DE TREINAMENTOS:\n" +
      trainingCourses.map((c: any, i: number) => `${i + 1}. ${c.title}: ${c.content}`).join("\n");
  }

  return { contextBlock, trainingBlock };
}

async function handleImageAnalysis(
  serviceClient: any, apiKey: string, storeName: string, 
  freeText: string | undefined, imageBase64: string, corsHeaders: Record<string, string>
) {
  const detectPrompt = `Voce e a IA Lavebo. Analise esta imagem/print de uma plataforma de delivery e identifique EXATAMENTE o que esta sendo mostrado.

TIPOS DE PRINT E ACOES OBRIGATORIAS:

1. NOME DA LOJA: Se o print mostra o nome/titulo da loja
   → Retorne: {"type":"store_name","detected":"[nome atual visivel]","questions":[{"id":"new_name","label":"Qual será o novo nome da loja?","type":"text"}]}

2. AREA DE ENTREGA: Se mostra mapa, raio, configuracao de entrega
   → Retorne: {"type":"delivery_area","detected":"[detalhes visiveis da area]","questions":[],"directAction":"Confirmar area de entrega com o cliente no grupo: km, minutos e tempo de entrega."}

3. CATEGORIA DA LOJA: Se mostra categoria principal, subcategorias da loja
   → Retorne: {"type":"store_category","detected":"[categorias atuais visiveis]","questions":[{"id":"action","label":"O que precisa ser feito?","type":"select","options":["Alterar categoria existente","Inserir nova categoria"]},{"id":"which","label":"Qual categoria alterar?","type":"select","options":["Categoria principal","Subcategoria 1","Subcategoria 2"]},{"id":"new_value","label":"Qual a nova categoria?","type":"text"}]}

4. LOGO DA LOJA: Se mostra a logo/avatar da loja
   → Analise se ha problema visivel (baixa qualidade, cortada, etc)
   → Retorne: {"type":"store_logo","detected":"[problema se houver]","questions":[],"directAction":"[acao baseada no que viu]"}

5. FOTO DE CAPA: Se mostra a foto de capa/banner da loja
   → Mesma logica da logo
   → Retorne: {"type":"cover_photo","detected":"[problema se houver]","questions":[],"directAction":"[acao baseada no que viu]"}

6. TITULO DE CATEGORIA DO CARDAPIO: Se mostra o nome/titulo de uma categoria do cardapio
   → Retorne: {"type":"category_title","detected":"[nome atual visivel]","questions":[{"id":"new_name","label":"Qual deve ser o novo nome da categoria?","type":"text"}]}

7. TITULO DE ITEM: Se mostra o nome de um item/produto do cardapio
   → Retorne: {"type":"item_title","detected":"[nome atual visivel]","questions":[],"directAction":"Otimizar o titulo do item com palavras-chave relevantes para melhorar a busca e atratividade."}

8. DESCRICAO DE ITEM: Se mostra a descricao de um item/produto
   → Retorne: {"type":"item_description","detected":"[descricao atual visivel]","questions":[],"directAction":"Otimizar a descricao reforçando qualidade do produto, palavras-chave para buscas e adjetivos que gerem desejo no cliente."}

9. PRECO DE ITEM: Se mostra o preco de um item
   → Retorne: {"type":"item_price","detected":"[preco atual visivel]","questions":[{"id":"price_action","label":"O que fazer com o preço?","type":"select","options":["Pegar cardápio do cliente no grupo para precificar","Finalizar preço atual com x,99"]}]}

10. CATEGORIA DO ITEM (mover item): Se mostra um item dentro de uma categoria e precisa mover
    → Retorne: {"type":"move_item","detected":"[item e categoria atual]","questions":[{"id":"item_name","label":"Qual o nome do item?","type":"text"},{"id":"from_category","label":"De qual categoria?","type":"text"},{"id":"to_category","label":"Para qual categoria mover?","type":"text"}]}

11. GRUPOS DE ADICIONAIS: Se mostra grupos de adicionais/complementos de um item
    → Retorne: {"type":"addons_group","detected":"[o que esta visivel]","questions":[{"id":"item_name","label":"Qual o nome do item?","type":"text"},{"id":"addon_action","label":"O que deve ser feito no grupo de adicional?","type":"text"}]}

12. TEMPO DE PREPARO: Se mostra o tempo de preparo
    → Retorne: {"type":"prep_time","detected":"[tempo atual visivel]","questions":[],"directAction":"Perguntar ao cliente se o tempo de preparo atual esta correto."}

13. METODO DE ENTREGA: Se mostra configuracao de metodo de entrega
    → Retorne: {"type":"delivery_method","detected":"[metodo atual visivel]","questions":[{"id":"current_method","label":"Qual a entrega atual?","type":"select","options":["Entrega da plataforma","Entrega feita pela loja"]},{"id":"new_method","label":"Para qual deve mudar?","type":"select","options":["Entrega da plataforma","Entrega feita pela loja"]}]}

14. FORMAS DE PAGAMENTO: Se mostra formas de pagamento aceitas
    → Retorne: {"type":"payment_methods","detected":"[formas atuais visiveis]","questions":[],"directAction":"Compartilhar print no grupo e confirmar com o cliente quais formas de pagamento a loja aceita."}

15. HORARIO DE FUNCIONAMENTO: Se mostra horarios de abertura/fechamento da loja
    → Retorne: {"type":"business_hours","detected":"[horarios visiveis]","questions":[],"directAction":"Confirmar com o cliente no grupo se os horarios de funcionamento estao corretos e realizar a alteracao caso necessario."}

16. FOTO DE ITEM/PRODUTO: Se mostra a foto de um item do cardapio (sem foto, foto ruim, etc)
    → Retorne: {"type":"item_photo","detected":"[problema visivel]","questions":[],"directAction":"Solicitar ao cliente uma foto de qualidade do produto para melhorar a atratividade no cardapio."}

17. DESCONTO/CUPOM/PROMOCAO: Se mostra configuracao de desconto, cupom ou promocao
    → Retorne: {"type":"promotion","detected":"[detalhes da promocao visivel]","questions":[],"directAction":"Confirmar com o cliente no grupo se a promocao/desconto esta configurada corretamente e ajustar se necessario."}

18. AVALIACAO/NOTA DA LOJA: Se mostra avaliacoes, nota, comentarios de clientes
    → Retorne: {"type":"store_rating","detected":"[nota e detalhes visiveis]","questions":[],"directAction":"Verificar avaliacoes negativas e orientar o gestor a responder os comentarios e trabalhar melhorias nos pontos criticados."}

19. PEDIDO/HISTORICO DE PEDIDOS: Se mostra pedidos, historico, status de pedidos
    → Retorne: {"type":"orders","detected":"[detalhes visiveis]","questions":[],"directAction":"Verificar o status dos pedidos e confirmar com o cliente se ha alguma pendencia ou problema a resolver."}

20. TAXA DE ENTREGA: Se mostra configuracao de taxa de entrega, frete
    → Retorne: {"type":"delivery_fee","detected":"[taxas visiveis]","questions":[],"directAction":"Confirmar com o cliente no grupo se as taxas de entrega estao corretas e competitivas para a regiao."}

21. PEDIDO MINIMO: Se mostra valor de pedido minimo
    → Retorne: {"type":"minimum_order","detected":"[valor visivel]","questions":[],"directAction":"Confirmar com o cliente se o valor minimo do pedido esta adequado para a operacao da loja."}

22. STATUS DA LOJA: Se mostra loja aberta/fechada, pausada, indisponivel
    → Retorne: {"type":"store_status","detected":"[status visivel]","questions":[],"directAction":"Verificar por que a loja esta com esse status e orientar o gestor a resolver para manter a loja ativa."}

23. DESTAQUE/ITEM EM DESTAQUE: Se mostra itens em destaque ou vitrine da loja
    → Retorne: {"type":"featured_items","detected":"[itens em destaque visiveis]","questions":[],"directAction":"Verificar se os itens em destaque sao os mais estrategicos e sugerir alteracoes para maximizar vendas."}

24. INFORMACOES DA LOJA: Se mostra informacoes gerais (CNPJ, endereco, telefone, etc)
    → Retorne: {"type":"store_info","detected":"[informacoes visiveis]","questions":[],"directAction":"Confirmar com o cliente no grupo se as informacoes cadastrais da loja estao corretas e atualizadas."}

25. TAG "ITEM MAIS CARO": Se o print mostra um item com a tag/etiqueta "Item mais caro" (tag vermelha indicando que o preco esta acima da concorrencia)
    → Retorne: {"type":"expensive_item_tag","detected":"[nome do item e preco visivel]","questions":[],"directAction":"Corrigir o preco do item para garantir que a tag 'Item mais caro' nao apareca mais."}

26. OUTRO (nao listado acima): Qualquer print nao identificado nos tipos acima
    → Use sua inteligencia para ENTENDER o contexto do print e SUGERIR uma acao proativa
    → Retorne: {"type":"other","detected":"[descricao detalhada do que esta visivel]","questions":[],"directAction":"[acao proativa baseada no que voce identificou no print - seja especifico e util]"}

REGRAS:
- Retorne SOMENTE o JSON, sem markdown, sem texto antes ou depois
- Identifique com precisao o tipo do print
- Se o gestor escreveu algo junto com o print, considere o texto tambem
- O campo "detected" deve descrever o que voce ve no print
- PRIORIZE tipos especificos (1-24) antes de usar "other"
- Mesmo para "other", SEMPRE sugira uma acao proativa em directAction baseada no que viu`;

  const textPart = freeText?.trim()
    ? `Loja: ${storeName || "nao informada"}. Texto do gestor: ${freeText.trim()}`
    : `Loja: ${storeName || "nao informada"}. Analise este print.`;

  const userMessage = [
    { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
    { type: "text", text: textPart },
  ];

  try {
    const rawContent = await callAI(apiKey, "google/gemini-2.5-flash", detectPrompt, userMessage);
    console.log("AI detection response:", rawContent.substring(0, 500));
    
    const detection = extractJsonObject(rawContent);
    
    // If there are questions, return them for the frontend to show
    if (detection.questions && detection.questions.length > 0) {
      return new Response(JSON.stringify({ 
        needsInput: true, 
        detection,
        imageBase64: undefined // don't send image back
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // If directAction, generate categories immediately
    if (detection.directAction) {
      const { contextBlock, trainingBlock } = await getContextBlocks(serviceClient);
      const categories = await generateCategories(apiKey, storeName, detection, null, contextBlock, trainingBlock);
      return new Response(JSON.stringify({ categories }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: return detection with empty questions for other type
    return new Response(JSON.stringify({ 
      needsInput: true, 
      detection: { ...detection, questions: [{ id: "custom_action", label: "O que precisa ser feito?", type: "text" }] }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (e.status) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    throw e;
  }
}

async function handleGenerate(
  serviceClient: any, apiKey: string, storeName: string,
  followUpAnswers: any, corsHeaders: Record<string, string>
) {
  const { contextBlock, trainingBlock } = await getContextBlocks(serviceClient);
  const categories = await generateCategories(apiKey, storeName, followUpAnswers.detection, followUpAnswers.answers, contextBlock, trainingBlock);
  
  return new Response(JSON.stringify({ categories }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function generateCategories(
  apiKey: string, storeName: string, detection: any, 
  answers: Record<string, string> | null, contextBlock: string, trainingBlock: string
) {
  // Build context based on print type and answers
  let actionContext = "";
  const type = detection.type;
  const detected = detection.detected || "";

  if (type === "store_name" && answers) {
    actionContext = `O admin definiu que o nome da loja deve ser alterado para "${answers.new_name}". Solicite ao gestor que altere o nome da loja de "${detected}" para "${answers.new_name}".`;
  } else if (type === "delivery_area") {
    actionContext = detection.directAction;
  } else if (type === "store_category" && answers) {
    const action = answers.action || "";
    const which = answers.which || "";
    const newVal = answers.new_value || "";
    if (action.includes("Alterar")) {
      actionContext = `O admin precisa alterar a ${which} da loja. Categoria atual: "${detected}". Solicite ao gestor que altere a ${which} de "${detected}" para "${newVal}".`;
    } else {
      actionContext = `O admin precisa inserir uma nova ${which} na loja. Solicite ao gestor que insira "${newVal}" como ${which}.`;
    }
  } else if (type === "store_logo") {
    actionContext = detection.directAction || "Solicitar ao gestor que peça a logo da loja ao cliente e atualize na plataforma.";
  } else if (type === "cover_photo") {
    actionContext = detection.directAction || "Solicitar ao gestor que peça a foto de capa ao cliente e atualize na plataforma.";
  } else if (type === "category_title" && answers) {
    actionContext = `O admin definiu que o nome da categoria deve ser alterado. Solicite ao gestor que altere o nome da categoria de "${detected}" para "${answers.new_name}" para melhorar a exibição do cardápio.`;
  } else if (type === "item_title") {
    actionContext = detection.directAction;
  } else if (type === "item_description") {
    actionContext = detection.directAction;
  } else if (type === "item_price" && answers) {
    const priceAction = answers.price_action || "";
    if (priceAction.includes("cardápio")) {
      actionContext = `Solicitar ao gestor que pegue o cardápio do cliente no grupo para precificar os itens corretamente.`;
    } else {
      actionContext = `Solicitar ao gestor que finalize o preço atual do item (${detected}) com terminação x,99.`;
    }
  } else if (type === "move_item" && answers) {
    actionContext = `Solicitar ao gestor que mova o item "${answers.item_name}" da categoria "${answers.from_category}" para a categoria "${answers.to_category}".`;
  } else if (type === "addons_group" && answers) {
    actionContext = `No item "${answers.item_name}": ${answers.addon_action}. Solicitar ao gestor que realize a alteração nos grupos de adicionais.`;
  } else if (type === "prep_time") {
    actionContext = detection.directAction;
  } else if (type === "delivery_method" && answers) {
    const current = answers.current_method || "";
    const newMethod = answers.new_method || "";
    actionContext = `Solicitar ao gestor que altere o método de entrega de "${current}" para "${newMethod}".`;
    if (current.includes("plataforma") && newMethod.includes("loja")) {
      actionContext += " IMPORTANTE: O gestor DEVE também configurar a área de entrega da loja E configurar as formas de pagamento aceitas pela loja (ambos obrigatórios).";
    }
  } else if (type === "payment_methods") {
    actionContext = detection.directAction;
  } else if (type === "other" && answers) {
    actionContext = answers.custom_action || "Ação personalizada definida pelo admin.";
  } else {
    actionContext = detection.directAction || "Ação não especificada.";
  }

  const systemPrompt = `Voce e a IA Lavebo. Gere uma ESTRATEGIA DE ACAO para loja de delivery.

CONTEXTO DA ACAO:
${actionContext}

REGRA DE TOM E ESTILO:
- Cada item deve ser uma DIRETRIZ ESTRATEGICA, NAO um tutorial.
- Tom: imperativo, conciso, orientado a resultado.
- O campo "text" deve conter UMA FRASE estrategica que descreva O QUE fazer e POR QUE.
- Seja CLARO e ESPECIFICO: se for para alterar algo, diga exatamente DE "tal" PARA "tal".

REGRAS:
1. NAO DUPLICAR CATEGORIAS
2. Campo "text" = 1 FRASE ESTRATEGICA (sem passo a passo)
3. SEPARAR ITENS por assunto
4. Nome do item comeca com "-"

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

FORMATO DE SAIDA - retorne SOMENTE um array JSON valido:
[{"name":"Categoria","items":[{"name":"- Nome do item","text":"Frase estrategica clara e especifica."}]}]`;

  const userMsg = `Loja: ${storeName || "nao informada"}\n\nAcao necessaria:\n${actionContext}`;
  
  const rawContent = await callAI(
    apiKey, "google/gemini-3-flash-preview", systemPrompt, userMsg
  );
  console.log("AI generate response:", rawContent.substring(0, 500));

  const result = extractJsonObject(rawContent);
  return Array.isArray(result) ? result : [result];
}

async function handleTextOnly(
  serviceClient: any, apiKey: string, storeName: string,
  freeText: string, corsHeaders: Record<string, string>
) {
  const { contextBlock, trainingBlock } = await getContextBlocks(serviceClient);

  const systemPrompt = `Voce e a IA Lavebo. Seu papel e organizar textos livres em ESTRATEGIAS DE ACAO para lojas de delivery.

REGRA DE TOM E ESTILO:
- Cada item deve ser uma DIRETRIZ ESTRATEGICA, NAO um tutorial.
- Tom: imperativo, conciso, orientado a resultado.
- O campo "text" deve conter UMA FRASE estrategica que descreva O QUE fazer e POR QUE, sem passo a passo numerado.

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

FORMATO DE SAIDA - retorne SOMENTE um array JSON valido:
[{"name":"Detalhes da loja","items":[{"name":"- Foto de capa","text":"Revisar foto de capa da loja..."}]}]`;

  const userMsg = `Loja: ${storeName || "nao informada"}\n\nTexto do gestor:\n${freeText.trim()}`;

  try {
    const rawContent = await callAI(apiKey, "google/gemini-3-flash-preview", systemPrompt, userMsg);
    console.log("AI text response:", rawContent.substring(0, 500));
    const categories = extractJsonObject(rawContent);
    
    return new Response(JSON.stringify({ categories: Array.isArray(categories) ? categories : [categories] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (e.status) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    throw e;
  }
}
