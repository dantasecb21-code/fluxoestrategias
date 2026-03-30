export interface StrategyItem {
  id: string;
  name: string;
  text: string;
  checked: boolean;
}

export interface StrategyCategory {
  id: string;
  name: string;
  items: StrategyItem[];
}

export interface StrategyMeta {
  storeName: string;
  managerName: string;
  operationalManager: string;
  deadline: string;
}

export const DEFAULT_CATEGORIES: StrategyCategory[] = [
  {
    id: "cat-details",
    name: "Detalhes da Loja",
    items: [
      { id: "d1", name: "Foto de capa desatualizada", text: "Alterar a foto de capa para uma imagem mais atrativa, priorizando um produto carro-chefe da loja para aumentar a conversão e despertar o interesse do cliente logo no primeiro contato visual.", checked: false },
      { id: "d2", name: "Logo em baixa qualidade", text: "Substituir a logo atual por uma versão em alta resolução, garantindo que a identidade visual da loja transmita profissionalismo e credibilidade dentro da plataforma.", checked: false },
      { id: "d3", name: "Descrição da loja genérica", text: "Reescrever a descrição da loja destacando os diferenciais, especialidades e o posicionamento estratégico que diferencia o estabelecimento dos concorrentes na região.", checked: false },
      { id: "d4", name: "Horário de funcionamento incorreto", text: "Ajustar os horários de funcionamento conforme a operação real da loja, evitando que pedidos sejam perdidos por indisponibilidade ou que clientes encontrem a loja fechada.", checked: false },
    ],
  },
  {
    id: "cat-promos",
    name: "Promoções",
    items: [
      { id: "p1", name: "Sem cupom ativo", text: "Criar um cupom de primeira compra com desconto atrativo para captar novos clientes e incentivar a experimentação dos produtos da loja.", checked: false },
      { id: "p2", name: "Combo mal estruturado", text: "Reestruturar os combos oferecidos, combinando itens com boa margem e alta saída para aumentar o ticket médio sem comprometer a rentabilidade.", checked: false },
      { id: "p3", name: "Falta promoção recorrente", text: "Implementar promoções semanais com rotatividade de produtos, criando senso de urgência e incentivando o retorno recorrente dos clientes.", checked: false },
    ],
  },
  {
    id: "cat-reviews",
    name: "Avaliações",
    items: [
      { id: "r1", name: "Nota abaixo de 4.5", text: "Implementar um plano de ação focado em elevar a nota da loja, priorizando melhorias na embalagem, tempo de preparo e qualidade do produto entregue.", checked: false },
      { id: "r2", name: "Reclamações de atraso", text: "Otimizar o tempo de preparo e comunicar prazos de entrega realistas ao cliente, reduzindo a frustração causada por atrasos e melhorando a experiência geral.", checked: false },
      { id: "r3", name: "Sem resposta às avaliações", text: "Criar uma rotina diária de resposta às avaliações negativas, demonstrando cuidado com a experiência do cliente e comprometimento com a melhoria contínua.", checked: false },
    ],
  },
  {
    id: "cat-menu",
    name: "Cardápio",
    items: [
      { id: "m1", name: "Categoria mal posicionada", text: "Reorganizar as categorias do cardápio de forma estratégica, priorizando os itens de maior saída e facilitando a navegação do cliente durante a escolha.", checked: false },
      { id: "m2", name: "Fotos de produtos ausentes", text: "Adicionar fotos profissionais em todos os itens do cardápio, considerando que produtos com imagem convertem significativamente mais do que os sem foto.", checked: false },
      { id: "m3", name: "Descrição de itens incompleta", text: "Completar as descrições de todos os itens com ingredientes, diferenciais e informações relevantes que auxiliem o cliente na decisão de compra.", checked: false },
      { id: "m4", name: "Preço fora do padrão", text: "Revisar a precificação dos produtos comparando com os principais concorrentes da região, garantindo competitividade sem comprometer a margem de lucro.", checked: false },
    ],
  },
];
