/**
 * Generates professional strategic text based on an item name.
 * Maps common keywords to professional consulting-style recommendations.
 */
export function generateStrategicText(itemName: string): string {
  const name = itemName.toLowerCase().trim();

  const templates: [RegExp, string][] = [
    [/foto.*capa|capa.*foto|imagem.*capa/i, `Alterar a foto de capa para uma imagem mais atrativa, priorizando um produto carro-chefe da loja para aumentar a conversão e despertar o interesse do cliente logo no primeiro contato visual.`],
    [/logo|logotipo|marca/i, `Substituir a logo atual por uma versão em alta resolução, garantindo que a identidade visual da loja transmita profissionalismo e credibilidade dentro da plataforma.`],
    [/descri[çc][ãa]o.*loja|loja.*descri/i, `Reescrever a descrição da loja destacando os diferenciais, especialidades e o posicionamento estratégico que diferencia o estabelecimento dos concorrentes na região.`],
    [/hor[áa]rio|funcionamento/i, `Ajustar os horários de funcionamento conforme a operação real da loja, evitando que pedidos sejam perdidos por indisponibilidade ou que clientes encontrem a loja fechada.`],
    [/cupom|desconto|primeira.*compra/i, `Criar um cupom de primeira compra com desconto atrativo para captar novos clientes e incentivar a experimentação dos produtos da loja.`],
    [/combo|kit/i, `Reestruturar os combos oferecidos, combinando itens com boa margem e alta saída para aumentar o ticket médio sem comprometer a rentabilidade.`],
    [/promo[çc][ãa]o|oferta/i, `Implementar promoções semanais com rotatividade de produtos, criando senso de urgência e incentivando o retorno recorrente dos clientes.`],
    [/nota|avalia[çc][ãa]o|estrela/i, `Implementar um plano de ação focado em elevar a nota da loja, priorizando melhorias na embalagem, tempo de preparo e qualidade do produto entregue.`],
    [/atraso|demora|tempo.*entrega/i, `Otimizar o tempo de preparo e comunicar prazos de entrega realistas ao cliente, reduzindo a frustração causada por atrasos e melhorando a experiência geral.`],
    [/resposta|responder|coment[áa]rio/i, `Criar uma rotina diária de resposta às avaliações negativas, demonstrando cuidado com a experiência do cliente e comprometimento com a melhoria contínua.`],
    [/categoria.*card[áa]pio|card[áa]pio.*categoria|posicion/i, `Reorganizar as categorias do cardápio de forma estratégica, priorizando os itens de maior saída e facilitando a navegação do cliente durante a escolha.`],
    [/foto.*produto|produto.*foto|imagem.*produto/i, `Adicionar fotos profissionais em todos os itens do cardápio, considerando que produtos com imagem convertem significativamente mais do que os sem foto.`],
    [/descri[çc][ãa]o.*item|item.*descri|descri[çc][ãa]o.*produto/i, `Completar as descrições de todos os itens com ingredientes, diferenciais e informações relevantes que auxiliem o cliente na decisão de compra.`],
    [/pre[çc]o|precifica/i, `Revisar a precificação dos produtos comparando com os principais concorrentes da região, garantindo competitividade sem comprometer a margem de lucro.`],
    [/card[áa]pio|menu/i, `Revisar e otimizar o cardápio, garantindo que a organização, descrições e imagens estejam alinhadas com as melhores práticas de conversão na plataforma.`],
    [/embalagem|pacote/i, `Revisar o padrão de embalagem utilizado, priorizando a proteção do produto durante o transporte e uma apresentação visual que reforce a identidade da marca.`],
    [/entrega|delivery|log[íi]stica/i, `Otimizar o processo de entrega, revisando raios de atendimento, tempos estimados e parcerias com entregadores para garantir agilidade e satisfação do cliente.`],
    [/concorr[eê]ncia|concorrente/i, `Realizar análise competitiva dos principais concorrentes da região, identificando oportunidades de diferenciação em preço, produto e posicionamento.`],
    [/fideliza|recorr[eê]ncia|retorno/i, `Implementar estratégia de fidelização com benefícios progressivos para incentivar a recompra e aumentar o lifetime value do cliente.`],
    [/destaque|visibilidade|posicionamento/i, `Otimizar o posicionamento da loja na plataforma, utilizando recursos de destaque e impulsionamento para aumentar a visibilidade e o volume de pedidos.`],
  ];

  for (const [regex, text] of templates) {
    if (regex.test(name)) {
      return text;
    }
  }

  // Generic fallback: generate a professional text based on the item name
  return `Implementar ação corretiva para "${itemName}", analisando o cenário atual e aplicando as melhores práticas do mercado para otimizar resultados e garantir uma experiência superior ao cliente na plataforma.`;
}
