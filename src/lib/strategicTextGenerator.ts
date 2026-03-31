/**
 * Generates professional strategic text based on an item name.
 * Maps common keywords to professional consulting-style recommendations.
 * Each keyword has multiple variants for variety.
 */

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateStrategicText(itemName: string): string {
  const name = itemName.toLowerCase().trim();

  const templates: [RegExp, string[]][] = [
    [/foto.*capa|capa.*foto|imagem.*capa/i, [
      `Alterar a foto de capa para uma imagem mais atrativa, priorizando um produto carro-chefe da loja para aumentar a conversão e despertar o interesse do cliente logo no primeiro contato visual.`,
      `Substituir a imagem de capa por uma foto de alta qualidade que represente o melhor produto da loja, gerando impacto visual imediato e aumentando a taxa de clique.`,
      `Atualizar a foto de capa com uma composição visualmente impactante, destacando os produtos mais vendidos para captar a atenção do cliente nos primeiros segundos de navegação.`,
    ]],
    [/logo|logotipo|marca/i, [
      `Substituir a logo atual por uma versão em alta resolução, garantindo que a identidade visual da loja transmita profissionalismo e credibilidade dentro da plataforma.`,
      `Atualizar o logotipo para uma versão vetorizada e nítida, reforçando a identidade da marca e criando reconhecimento imediato entre os clientes da plataforma.`,
      `Revisar a identidade visual da marca, aplicando uma logo de alta definição que transmita confiança e se destaque entre os concorrentes da região.`,
    ]],
    [/descri[çc][ãa]o.*loja|loja.*descri/i, [
      `Reescrever a descrição da loja destacando os diferenciais, especialidades e o posicionamento estratégico que diferencia o estabelecimento dos concorrentes na região.`,
      `Reformular a descrição da loja com foco em SEO e conversão, enfatizando os pontos fortes, especialidades culinárias e proposta de valor única.`,
      `Criar uma descrição profissional que comunique claramente os diferenciais do negócio, utilizando palavras-chave que aumentem a descoberta da loja na plataforma.`,
    ]],
    [/hor[áa]rio|funcionamento/i, [
      `Ajustar os horários de funcionamento conforme a operação real da loja, evitando que pedidos sejam perdidos por indisponibilidade ou que clientes encontrem a loja fechada.`,
      `Revisar e otimizar os horários de funcionamento com base nos picos de demanda da região, maximizando a disponibilidade nos momentos de maior fluxo de pedidos.`,
      `Adequar os horários de operação para cobrir janelas estratégicas de alta demanda, garantindo presença online nos horários em que a concorrência está ausente.`,
    ]],
    [/cupom|desconto|primeira.*compra/i, [
      `Criar um cupom de primeira compra com desconto atrativo para captar novos clientes e incentivar a experimentação dos produtos da loja.`,
      `Implementar uma estratégia de cupom de boas-vindas com percentual competitivo, convertendo visitantes em compradores e construindo a base de clientes recorrentes.`,
      `Desenvolver uma campanha de desconto para novos clientes, utilizando cupons com valor percebido alto e prazo limitado para gerar urgência na conversão.`,
    ]],
    [/combo|kit/i, [
      `Reestruturar os combos oferecidos, combinando itens com boa margem e alta saída para aumentar o ticket médio sem comprometer a rentabilidade.`,
      `Criar novos combos estratégicos com precificação psicológica, agrupando itens complementares que aumentem a percepção de valor e o ticket médio do pedido.`,
      `Reformular a estrutura de combos com foco em margem e volume, incluindo produtos âncora com alta demanda e itens complementares de baixo custo operacional.`,
    ]],
    [/promo[çc][ãa]o|oferta/i, [
      `Implementar promoções semanais com rotatividade de produtos, criando senso de urgência e incentivando o retorno recorrente dos clientes.`,
      `Estruturar um calendário promocional mensal com ofertas temáticas e descontos progressivos, mantendo o engajamento constante dos clientes.`,
      `Criar promoções flash com duração limitada em horários estratégicos, gerando picos de demanda e aumentando a visibilidade orgânica da loja.`,
    ]],
    [/nota|avalia[çc][ãa]o|estrela/i, [
      `Implementar um plano de ação focado em elevar a nota da loja, priorizando melhorias na embalagem, tempo de preparo e qualidade do produto entregue.`,
      `Desenvolver uma estratégia de melhoria contínua da avaliação, com monitoramento diário de feedbacks e ações corretivas imediatas nos pontos mais criticados.`,
      `Criar um protocolo de qualidade com checkpoints operacionais para garantir consistência na experiência do cliente e elevação gradual da nota média.`,
    ]],
    [/atraso|demora|tempo.*entrega/i, [
      `Otimizar o tempo de preparo e comunicar prazos de entrega realistas ao cliente, reduzindo a frustração causada por atrasos e melhorando a experiência geral.`,
      `Revisar o fluxo operacional de preparo para identificar gargalos, implementando melhorias que reduzam o tempo médio de entrega em pelo menos 15%.`,
      `Estabelecer metas de tempo de preparo por categoria de produto, com monitoramento em tempo real para garantir que os prazos informados sejam cumpridos.`,
    ]],
    [/resposta|responder|coment[áa]rio/i, [
      `Criar uma rotina diária de resposta às avaliações negativas, demonstrando cuidado com a experiência do cliente e comprometimento com a melhoria contínua.`,
      `Implementar um protocolo de resposta empática e proativa para avaliações, transformando feedbacks negativos em oportunidades de reconquista do cliente.`,
      `Estabelecer SLA de resposta de 24h para todas as avaliações, com templates personalizáveis que demonstrem atenção individualizada a cada cliente.`,
    ]],
    [/categoria.*card[áa]pio|card[áa]pio.*categoria|posicion/i, [
      `Reorganizar as categorias do cardápio de forma estratégica, priorizando os itens de maior saída e facilitando a navegação do cliente durante a escolha.`,
      `Reestruturar a hierarquia do cardápio colocando as categorias mais rentáveis nas posições de maior visibilidade, seguindo padrões de leitura do usuário.`,
      `Otimizar o posicionamento das categorias com base em dados de conversão, garantindo que os produtos mais populares estejam sempre acessíveis em até dois cliques.`,
    ]],
    [/foto.*produto|produto.*foto|imagem.*produto/i, [
      `Adicionar fotos profissionais em todos os itens do cardápio, considerando que produtos com imagem convertem significativamente mais do que os sem foto.`,
      `Realizar sessão fotográfica profissional dos produtos, priorizando ângulos que destaquem texturas e cores, aumentando a taxa de conversão em até 30%.`,
      `Implementar padrão visual de fotos com fundo neutro e iluminação controlada, criando uma identidade visual consistente em todo o cardápio digital.`,
    ]],
    [/descri[çc][ãa]o.*item|item.*descri|descri[çc][ãa]o.*produto/i, [
      `Completar as descrições de todos os itens com ingredientes, diferenciais e informações relevantes que auxiliem o cliente na decisão de compra.`,
      `Reescrever as descrições dos produtos utilizando técnicas de copywriting gastronômico, destacando sabores, texturas e experiências sensoriais.`,
      `Padronizar as descrições dos itens com informações completas sobre ingredientes, porções e diferenciais, facilitando a escolha informada do cliente.`,
    ]],
    [/pre[çc]o|precifica/i, [
      `Revisar a precificação dos produtos comparando com os principais concorrentes da região, garantindo competitividade sem comprometer a margem de lucro.`,
      `Realizar análise de elasticidade de preço nos itens principais, identificando oportunidades de ajuste que maximizem receita sem impactar o volume de pedidos.`,
      `Implementar estratégia de precificação dinâmica baseada em horários e demanda, otimizando a margem nos horários de pico e atraindo volume nos horários de baixa.`,
    ]],
    [/card[áa]pio|menu/i, [
      `Revisar e otimizar o cardápio, garantindo que a organização, descrições e imagens estejam alinhadas com as melhores práticas de conversão na plataforma.`,
      `Reestruturar o cardápio com foco em engenharia de menu, classificando itens por popularidade e margem para maximizar a rentabilidade por pedido.`,
      `Simplificar o cardápio removendo itens de baixa saída, fortalecendo o foco nos produtos mais rentáveis e reduzindo a complexidade operacional.`,
    ]],
    [/embalagem|pacote/i, [
      `Revisar o padrão de embalagem utilizado, priorizando a proteção do produto durante o transporte e uma apresentação visual que reforce a identidade da marca.`,
      `Investir em embalagens com selo de fechamento e branding da loja, garantindo que o produto chegue íntegro e com apresentação premium ao cliente.`,
      `Testar novos materiais de embalagem que mantenham temperatura e integridade do produto, reduzindo reclamações e melhorando a nota de qualidade.`,
    ]],
    [/entrega|delivery|log[íi]stica/i, [
      `Otimizar o processo de entrega, revisando raios de atendimento, tempos estimados e parcerias com entregadores para garantir agilidade e satisfação do cliente.`,
      `Reestruturar a logística de entrega com zonas de atendimento otimizadas, reduzindo o custo por entrega e melhorando o tempo médio de chegada.`,
      `Implementar monitoramento de entregas em tempo real, identificando padrões de atraso e criando ações corretivas para cada zona de atendimento.`,
    ]],
    [/concorr[eê]ncia|concorrente/i, [
      `Realizar análise competitiva dos principais concorrentes da região, identificando oportunidades de diferenciação em preço, produto e posicionamento.`,
      `Mapear os pontos fortes e fracos dos cinco maiores concorrentes da região, definindo ações táticas para capturar participação de mercado.`,
      `Desenvolver benchmarking competitivo mensal, monitorando preços, promoções e novidades dos concorrentes para manter vantagem estratégica.`,
    ]],
    [/fideliza|recorr[eê]ncia|retorno/i, [
      `Implementar estratégia de fidelização com benefícios progressivos para incentivar a recompra e aumentar o lifetime value do cliente.`,
      `Criar programa de fidelidade com recompensas escalonadas, incentivando frequência de compra e transformando clientes ocasionais em recorrentes.`,
      `Desenvolver campanhas de reativação para clientes inativos, com ofertas personalizadas baseadas no histórico de pedidos anteriores.`,
    ]],
    [/destaque|visibilidade|posicionamento/i, [
      `Otimizar o posicionamento da loja na plataforma, utilizando recursos de destaque e impulsionamento para aumentar a visibilidade e o volume de pedidos.`,
      `Investir em posicionamento premium nos horários de maior demanda, maximizando a exposição da loja para clientes com alta intenção de compra.`,
      `Criar estratégia de visibilidade combinando impulsionamento pago com otimização orgânica do perfil, maximizando o retorno sobre investimento.`,
    ]],
  ];

  for (const [regex, texts] of templates) {
    if (regex.test(name)) {
      return pickRandom(texts);
    }
  }

  // Generic fallback with variations
  const fallbacks = [
    `Implementar ação corretiva para "${itemName}", analisando o cenário atual e aplicando as melhores práticas do mercado para otimizar resultados e garantir uma experiência superior ao cliente na plataforma.`,
    `Desenvolver plano de melhoria para "${itemName}", com diagnóstico detalhado da situação atual e definição de metas mensuráveis para acompanhamento de progresso.`,
    `Executar ajuste estratégico em "${itemName}", priorizando ações de alto impacto e baixo esforço para gerar resultados rápidos e sustentáveis na operação.`,
    `Mapear oportunidades de otimização em "${itemName}", definindo prioridades com base no impacto potencial e implementando melhorias graduais com acompanhamento de métricas.`,
  ];

  return pickRandom(fallbacks);
}
