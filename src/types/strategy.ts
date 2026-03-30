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

export interface Strategy {
  id: string;
  meta: StrategyMeta;
  categories: StrategyCategory[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CATEGORIES: StrategyCategory[] = [
  {
    id: "cat-details",
    name: "Detalhes da Loja",
    items: [
      { id: "d1", name: "Foto de capa desatualizada", text: "Atualizar a foto de capa com imagem profissional e atrativa para aumentar os cliques.", checked: false },
      { id: "d2", name: "Logo em baixa qualidade", text: "Substituir a logo por uma versão em alta resolução para transmitir profissionalismo.", checked: false },
      { id: "d3", name: "Descrição da loja genérica", text: "Reescrever a descrição da loja destacando diferenciais e especialidades.", checked: false },
      { id: "d4", name: "Horário de funcionamento incorreto", text: "Ajustar os horários de funcionamento para evitar pedidos perdidos.", checked: false },
    ],
  },
  {
    id: "cat-promos",
    name: "Promoções",
    items: [
      { id: "p1", name: "Sem cupom ativo", text: "Criar cupom de primeira compra para atrair novos clientes.", checked: false },
      { id: "p2", name: "Combo mal estruturado", text: "Reestruturar combos para aumentar o ticket médio com opções atrativas.", checked: false },
      { id: "p3", name: "Falta promoção recorrente", text: "Implementar promoções semanais para fidelizar clientes.", checked: false },
    ],
  },
  {
    id: "cat-reviews",
    name: "Avaliações",
    items: [
      { id: "r1", name: "Nota abaixo de 4.5", text: "Implementar plano de ação para melhorar a nota com foco em embalagem e tempo de entrega.", checked: false },
      { id: "r2", name: "Muitas reclamações de atraso", text: "Otimizar o tempo de preparo e comunicar prazos realistas ao cliente.", checked: false },
      { id: "r3", name: "Sem resposta às avaliações", text: "Criar rotina de resposta às avaliações negativas para demonstrar cuidado com o cliente.", checked: false },
    ],
  },
  {
    id: "cat-menu",
    name: "Cardápio",
    items: [
      { id: "m1", name: "Categoria mal posicionada", text: "Reorganizar categorias para melhorar a navegação do cliente dentro do cardápio.", checked: false },
      { id: "m2", name: "Fotos de produtos ausentes", text: "Adicionar fotos profissionais em todos os itens para aumentar a conversão.", checked: false },
      { id: "m3", name: "Descrição de itens incompleta", text: "Completar as descrições dos itens com ingredientes e diferenciais.", checked: false },
      { id: "m4", name: "Preço fora do padrão", text: "Revisar precificação comparando com concorrentes da região.", checked: false },
    ],
  },
];
