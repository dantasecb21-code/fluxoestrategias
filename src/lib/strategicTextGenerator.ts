/**
 * Generates professional strategic text based on an item name.
 * Uses contextual analysis to produce coherent, actionable recommendations.
 * Each call produces varied output through randomized templates.
 */

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Action verbs for variety
const actionVerbs = [
  "Implementar", "Executar", "Desenvolver", "Otimizar", "Reestruturar",
  "Revisar", "Aprimorar", "Realizar", "Conduzir", "Aplicar",
];

// Impact phrases
const impactPhrases = [
  "aumentando a conversão e a satisfação do cliente",
  "gerando resultados mensuráveis em curto prazo",
  "fortalecendo o posicionamento competitivo da loja",
  "melhorando a experiência do cliente na plataforma",
  "maximizando o retorno sobre o investimento operacional",
  "elevando o padrão de qualidade percebido pelo consumidor",
  "criando diferencial competitivo frente aos concorrentes da região",
  "impulsionando o volume de pedidos e a recorrência",
];

// Goal phrases
const goalPhrases = [
  "com foco em resultados de alto impacto",
  "priorizando ações que gerem valor imediato",
  "seguindo as melhores práticas do mercado de delivery",
  "alinhando a operação com as expectativas do consumidor",
  "garantindo consistência e profissionalismo na execução",
  "com acompanhamento de métricas de desempenho",
];

const templates: [RegExp, (name: string) => string[]][] = [
  [/foto.*capa|capa.*foto|imagem.*capa/i, (name) => [
    `Alterar a foto de capa para uma imagem de alta qualidade que destaque o produto carro-chefe da loja, ${pickRandom(impactPhrases)}.`,
    `Substituir a imagem de capa atual por uma composição visual profissional que transmita a identidade da marca, ${pickRandom(impactPhrases)}.`,
    `Realizar a troca da foto de capa utilizando uma imagem que represente o melhor da operação, ${pickRandom(goalPhrases)}.`,
  ]],
  [/logo|logotipo|marca visual/i, (name) => [
    `Atualizar o logotipo para uma versão em alta resolução e com boa legibilidade, reforçando a identidade visual da marca e ${pickRandom(impactPhrases)}.`,
    `Substituir a logo por uma versão vetorizada e profissional, garantindo reconhecimento imediato e ${pickRandom(impactPhrases)}.`,
    `Revisar a identidade visual aplicando uma logo nítida e moderna, ${pickRandom(goalPhrases)}.`,
  ]],
  [/descri[çc][ãa]o.*loja|loja.*descri|sobre.*loja/i, (name) => [
    `Reescrever a descrição da loja destacando diferenciais, especialidades e proposta de valor, ${pickRandom(impactPhrases)}.`,
    `Reformular o texto descritivo da loja com técnicas de copywriting, ${pickRandom(goalPhrases)}.`,
    `Criar uma descrição estratégica que comunique claramente os pontos fortes do negócio, ${pickRandom(impactPhrases)}.`,
  ]],
  [/hor[áa]rio|funcionamento|abertura|fechamento/i, (name) => [
    `Ajustar os horários de funcionamento conforme a demanda real da região, evitando perda de pedidos e ${pickRandom(impactPhrases)}.`,
    `Revisar e otimizar as janelas de operação com base nos picos de demanda, ${pickRandom(goalPhrases)}.`,
    `Adequar os horários para cobrir períodos estratégicos de alta demanda, ${pickRandom(impactPhrases)}.`,
  ]],
  [/cupom|desconto|primeira.*compra|voucher/i, (name) => [
    `Criar cupom estratégico para captação de novos clientes, com valor percebido atrativo e prazo limitado, ${pickRandom(impactPhrases)}.`,
    `Implementar campanha de desconto direcionada para converter visitantes em compradores, ${pickRandom(goalPhrases)}.`,
    `Desenvolver oferta de boas-vindas com cupom de primeira compra, ${pickRandom(impactPhrases)}.`,
  ]],
  [/combo|kit|conjunto/i, (name) => [
    `Reestruturar os combos combinando itens de alta margem com produtos populares, ${pickRandom(impactPhrases)}.`,
    `Criar combos estratégicos com precificação psicológica que aumente o ticket médio, ${pickRandom(goalPhrases)}.`,
    `Reformular a oferta de combos ${pickRandom(goalPhrases)}, ${pickRandom(impactPhrases)}.`,
  ]],
  [/promo[çc][ãa]o|oferta|campanha/i, (name) => [
    `Implementar promoções com rotatividade semanal e senso de urgência, ${pickRandom(impactPhrases)}.`,
    `Estruturar calendário promocional com ofertas temáticas e descontos progressivos, ${pickRandom(goalPhrases)}.`,
    `Criar promoções flash em horários estratégicos para gerar picos de demanda, ${pickRandom(impactPhrases)}.`,
  ]],
  [/nota|avalia[çc][ãa]o|estrela|review/i, (name) => [
    `Implementar plano de ação para elevar a nota da loja, priorizando melhorias em embalagem e tempo de preparo, ${pickRandom(impactPhrases)}.`,
    `Desenvolver estratégia de melhoria contínua da avaliação com monitoramento diário de feedbacks, ${pickRandom(goalPhrases)}.`,
    `Criar protocolo de qualidade com checkpoints operacionais para elevar a nota média, ${pickRandom(impactPhrases)}.`,
  ]],
  [/atraso|demora|tempo.*entrega|tempo.*preparo/i, (name) => [
    `Otimizar o fluxo de preparo para reduzir o tempo médio de entrega, ${pickRandom(impactPhrases)}.`,
    `Revisar gargalos operacionais e implementar melhorias no tempo de preparo, ${pickRandom(goalPhrases)}.`,
    `Estabelecer metas de tempo por categoria de produto com monitoramento em tempo real, ${pickRandom(impactPhrases)}.`,
  ]],
  [/resposta|responder|coment[áa]rio|feedback/i, (name) => [
    `Criar rotina de resposta às avaliações demonstrando comprometimento com a experiência do cliente, ${pickRandom(impactPhrases)}.`,
    `Implementar protocolo de resposta empática para avaliações negativas, ${pickRandom(goalPhrases)}.`,
    `Estabelecer SLA de resposta de 24h para todas as avaliações, ${pickRandom(impactPhrases)}.`,
  ]],
  [/categoria|organiza[çc][ãa]o.*card[áa]pio|posicion/i, (name) => [
    `Reorganizar as categorias do cardápio priorizando itens de maior saída e facilitando a navegação, ${pickRandom(impactPhrases)}.`,
    `Reestruturar a hierarquia do cardápio com as categorias mais rentáveis em posições de destaque, ${pickRandom(goalPhrases)}.`,
    `Otimizar o posicionamento das categorias com base em dados de conversão, ${pickRandom(impactPhrases)}.`,
  ]],
  [/foto.*produto|produto.*foto|imagem.*produto|imagem.*item/i, (name) => [
    `Adicionar fotos profissionais em todos os itens do cardápio para aumentar a taxa de conversão, ${pickRandom(impactPhrases)}.`,
    `Realizar sessão fotográfica profissional dos produtos com ângulos que destaquem texturas e cores, ${pickRandom(goalPhrases)}.`,
    `Implementar padrão visual de fotos com identidade consistente em todo o cardápio, ${pickRandom(impactPhrases)}.`,
  ]],
  [/descri[çc][ãa]o.*item|item.*descri|descri[çc][ãa]o.*produto/i, (name) => [
    `Completar as descrições dos itens com ingredientes e diferenciais que auxiliem na decisão de compra, ${pickRandom(impactPhrases)}.`,
    `Reescrever as descrições utilizando técnicas de copywriting gastronômico, ${pickRandom(goalPhrases)}.`,
    `Padronizar descrições com informações completas sobre ingredientes e porções, ${pickRandom(impactPhrases)}.`,
  ]],
  [/pre[çc]o|precifica|valor|custo/i, (name) => [
    `Revisar a precificação comparando com concorrentes da região, garantindo competitividade, ${pickRandom(impactPhrases)}.`,
    `Realizar análise de elasticidade de preço nos itens principais, ${pickRandom(goalPhrases)}.`,
    `Implementar precificação estratégica baseada em demanda e horários, ${pickRandom(impactPhrases)}.`,
  ]],
  [/card[áa]pio|menu/i, (name) => [
    `Revisar e otimizar o cardápio garantindo organização, descrições e imagens alinhadas às melhores práticas, ${pickRandom(impactPhrases)}.`,
    `Reestruturar o cardápio com engenharia de menu, classificando itens por popularidade e margem, ${pickRandom(goalPhrases)}.`,
    `Simplificar o cardápio focando nos produtos mais rentáveis e reduzindo complexidade operacional, ${pickRandom(impactPhrases)}.`,
  ]],
  [/embalagem|pacote|apresenta[çc][ãa]o/i, (name) => [
    `Revisar o padrão de embalagem priorizando proteção e apresentação visual da marca, ${pickRandom(impactPhrases)}.`,
    `Investir em embalagens com selo e branding que garantam integridade do produto, ${pickRandom(goalPhrases)}.`,
    `Testar novos materiais de embalagem que mantenham temperatura e qualidade, ${pickRandom(impactPhrases)}.`,
  ]],
  [/entrega|delivery|log[íi]stica|raio/i, (name) => [
    `Otimizar o processo de entrega revisando raios e tempos estimados, ${pickRandom(impactPhrases)}.`,
    `Reestruturar a logística com zonas de atendimento otimizadas, ${pickRandom(goalPhrases)}.`,
    `Implementar monitoramento de entregas para identificar e corrigir padrões de atraso, ${pickRandom(impactPhrases)}.`,
  ]],
  [/concorr[eê]ncia|concorrente|benchmark/i, (name) => [
    `Realizar análise competitiva dos principais concorrentes, identificando oportunidades de diferenciação, ${pickRandom(impactPhrases)}.`,
    `Mapear pontos fortes e fracos dos concorrentes da região, ${pickRandom(goalPhrases)}.`,
    `Desenvolver benchmarking competitivo mensal para manter vantagem estratégica, ${pickRandom(impactPhrases)}.`,
  ]],
  [/fideliza|recorr[eê]ncia|retorno|reten[çc][ãa]o/i, (name) => [
    `Implementar estratégia de fidelização com benefícios progressivos, ${pickRandom(impactPhrases)}.`,
    `Criar programa de fidelidade com recompensas escalonadas, ${pickRandom(goalPhrases)}.`,
    `Desenvolver campanhas de reativação para clientes inativos, ${pickRandom(impactPhrases)}.`,
  ]],
  [/destaque|visibilidade|impulsion|turbo/i, (name) => [
    `Otimizar o posicionamento na plataforma com recursos de destaque e impulsionamento, ${pickRandom(impactPhrases)}.`,
    `Investir em posicionamento premium nos horários de maior demanda, ${pickRandom(goalPhrases)}.`,
    `Criar estratégia de visibilidade combinando impulsionamento pago com otimização orgânica, ${pickRandom(impactPhrases)}.`,
  ]],
  [/ajust|corrig|correc|melhor|otimiz/i, (name) => [
    `${pickRandom(actionVerbs)} ajustes estratégicos em "${name}" para corrigir pontos de melhoria identificados, ${pickRandom(impactPhrases)}.`,
    `Conduzir processo de otimização de "${name}", aplicando correções baseadas em análise de dados e feedback operacional, ${pickRandom(goalPhrases)}.`,
    `Realizar diagnóstico e aplicar melhorias em "${name}", ${pickRandom(impactPhrases)}.`,
  ]],
];

export function generateStrategicText(itemName: string): string {
  const name = itemName.trim();
  if (!name) return "";

  const lower = name.toLowerCase();

  for (const [regex, generator] of templates) {
    if (regex.test(lower)) {
      const options = generator(name);
      return pickRandom(options);
    }
  }

  // Contextual fallback: analyze the item name to generate a coherent text
  const verb = pickRandom(actionVerbs);
  const impact = pickRandom(impactPhrases);
  const goal = pickRandom(goalPhrases);

  const contextualFallbacks = [
    `${verb} ação estratégica para "${name}", analisando o cenário atual e definindo um plano de execução claro e mensurável, ${impact}.`,
    `${verb} plano de melhoria direcionado a "${name}", com diagnóstico detalhado e metas de acompanhamento, ${goal}.`,
    `${verb} processo de otimização em "${name}", priorizando ações de alto impacto que gerem resultados rápidos e sustentáveis, ${impact}.`,
    `Mapear oportunidades de melhoria em "${name}" e definir prioridades com base no impacto potencial, ${goal}.`,
    `Conduzir análise detalhada de "${name}" e implementar as correções necessárias, ${impact}.`,
    `Elaborar plano de ação para "${name}" com etapas definidas, responsáveis e prazos de entrega, ${goal}.`,
  ];

  return pickRandom(contextualFallbacks);
}

/**
 * Validates if a strategic text is coherent with the item name.
 * Returns a warning message if the text seems disconnected.
 */
export function validateStrategicText(itemName: string, text: string): string | null {
  if (!itemName.trim() || !text.trim()) return null;

  const name = itemName.toLowerCase();
  const lowerText = text.toLowerCase();

  // Check if text is too short
  if (text.length < 50) {
    return "O texto estratégico está muito curto. Adicione mais detalhes sobre a ação e o objetivo esperado.";
  }

  // Check if text is too generic (doesn't reference the item context at all)
  const nameWords = name.split(/\s+/).filter((w) => w.length > 3);
  const hasContext = nameWords.some((w) => lowerText.includes(w));

  if (!hasContext && nameWords.length > 0) {
    return "O texto estratégico parece desconectado do item. Revise para garantir coerência com a ação proposta.";
  }

  return null;
}
