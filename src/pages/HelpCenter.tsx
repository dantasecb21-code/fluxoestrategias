import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Search, UtensilsCrossed, Truck, Tag, Star, Settings, Image, CreditCard,
  MessageSquare, BookOpen, BarChart3, Users, Store, Zap, Shield, HelpCircle
} from "lucide-react";

interface Article {
  title: string;
  content: string;
  tags: string[];
}

interface Category {
  label: string;
  icon: React.ElementType;
  color: string;
  articles: Article[];
}

const HELP_CATEGORIES: Category[] = [
  {
    label: "Cardápio",
    icon: UtensilsCrossed,
    color: "text-orange-500",
    articles: [
      {
        title: "Como criar categorias no cardápio",
        content: "Acesse o painel da loja > Cardápio > Categorias. Clique em \"Nova Categoria\" e defina o nome (ex: Pizzas, Bebidas, Sobremesas). As categorias organizam os itens para o cliente encontrar mais rápido. Dica: coloque as categorias mais vendidas no topo para aumentar a conversão.",
        tags: ["cardápio", "categorias"],
      },
      {
        title: "Como adicionar itens ao cardápio",
        content: "Dentro de uma categoria, clique em \"Adicionar Item\". Preencha: nome do produto, descrição detalhada (ingredientes, tamanho), preço e foto. Itens com foto vendem até 30% mais. Use descrições que despertem desejo, como \"Hambúrguer artesanal com blend de 180g, queijo cheddar derretido e bacon crocante\".",
        tags: ["cardápio", "itens", "produtos"],
      },
      {
        title: "Como editar ou remover um item",
        content: "Vá em Cardápio, encontre o item desejado e clique no ícone de edição (lápis). Você pode alterar nome, descrição, preço e foto. Para remover, clique no ícone de lixeira. Atenção: remover um item é permanente. Se quiser apenas ocultar temporariamente, use a opção \"Pausar item\".",
        tags: ["cardápio", "editar", "remover"],
      },
      {
        title: "Como alterar a ordem dos itens",
        content: "Na tela do cardápio, use as setas para cima/baixo ao lado de cada item para reordenar. Os itens no topo da categoria são vistos primeiro pelo cliente. Estratégia: coloque os itens com maior margem de lucro nas primeiras posições.",
        tags: ["cardápio", "ordem", "posição"],
      },
      {
        title: "Como adicionar complementos e adicionais",
        content: "Acesse o item > Complementos > \"Novo grupo de complementos\". Defina: nome do grupo (ex: \"Adicionais\", \"Escolha o tamanho\"), mínimo e máximo de opções, e os itens com seus preços. Complementos bem configurados aumentam o ticket médio em até 40%.",
        tags: ["cardápio", "complementos", "adicionais"],
      },
      {
        title: "Como configurar tamanhos e variações",
        content: "Para itens com tamanhos diferentes (P, M, G), crie um grupo de complementos do tipo \"Tamanho\" com seleção obrigatória (mínimo 1, máximo 1). Defina cada tamanho com seu respectivo preço. O preço base do item pode ser o menor tamanho.",
        tags: ["cardápio", "tamanhos", "variações"],
      },
    ],
  },
  {
    label: "Configurações da Loja",
    icon: Settings,
    color: "text-blue-500",
    articles: [
      {
        title: "Como alterar o nome da loja",
        content: "Acesse Configurações > Informações da Loja > Nome. Altere o nome e salve. O nome aparece para os clientes na busca e na página da loja. Use um nome claro e fácil de lembrar. Evite abreviações que o cliente não entenda.",
        tags: ["configuração", "nome", "loja"],
      },
      {
        title: "Como alterar a categoria da loja",
        content: "Em Configurações > Categoria, selecione a categoria que melhor representa o tipo de culinária (ex: Pizzaria, Hamburgueria, Japonesa). Isso ajuda os clientes a encontrarem a loja nos filtros de busca da plataforma.",
        tags: ["configuração", "categoria"],
      },
      {
        title: "Como configurar horário de funcionamento",
        content: "Vá em Configurações > Horários. Defina os horários de abertura e fechamento para cada dia da semana. Você pode configurar horários diferentes para cada dia e até definir intervalos (ex: 11h-15h e 18h-23h). Manter os horários atualizados evita cancelamentos e melhora a nota.",
        tags: ["configuração", "horário", "funcionamento"],
      },
      {
        title: "Como pausar a loja temporariamente",
        content: "Use o botão \"Pausar Loja\" no painel principal. A loja ficará invisível para os clientes durante a pausa. Ideal para feriados, manutenção ou quando a demanda está muito alta. Lembre-se de reativar quando estiver pronto para receber pedidos novamente.",
        tags: ["configuração", "pausar", "status"],
      },
      {
        title: "Como mudar o endereço da loja",
        content: "Em Configurações > Endereço, atualize o endereço completo com CEP, rua, número e complemento. O endereço correto é essencial para o cálculo de frete e área de entrega. Alterações podem levar até 24h para refletir na plataforma.",
        tags: ["configuração", "endereço"],
      },
    ],
  },
  {
    label: "Entrega e Logística",
    icon: Truck,
    color: "text-green-500",
    articles: [
      {
        title: "Como configurar entrega pela loja",
        content: "Em Configurações > Entrega, ative a opção \"Entrega própria\". Defina o raio de entrega, taxa e tempo estimado. A entrega própria dá mais controle sobre a qualidade do serviço, mas exige gerenciamento de entregadores.",
        tags: ["entrega", "logística", "própria"],
      },
      {
        title: "Como definir área de entrega",
        content: "Acesse Configurações > Área de Entrega. Defina o raio em quilômetros a partir do endereço da loja. Você pode criar zonas com taxas diferentes (ex: até 3km = R$5, até 6km = R$8). Raios maiores atingem mais clientes, mas podem aumentar o tempo de entrega.",
        tags: ["entrega", "área", "raio"],
      },
      {
        title: "Como configurar taxa de entrega",
        content: "Em Configurações > Taxa de Entrega, defina o valor fixo ou por distância. Taxa grátis acima de um valor mínimo (ex: grátis acima de R$40) é uma ótima estratégia para aumentar o ticket médio. Você também pode criar promoções de frete grátis em dias específicos.",
        tags: ["entrega", "taxa", "frete"],
      },
      {
        title: "Como configurar tempo de preparo",
        content: "Em Configurações > Tempo de Preparo, defina o tempo médio que a cozinha leva para preparar um pedido. Seja realista: prometer 20 minutos e entregar em 40 prejudica a nota. É melhor prometer 40 e entregar em 30 — isso gera avaliações positivas.",
        tags: ["entrega", "tempo", "preparo"],
      },
    ],
  },
  {
    label: "Promoções e Cupons",
    icon: Tag,
    color: "text-purple-500",
    articles: [
      {
        title: "Como criar um cupom de desconto",
        content: "Vá em Marketing > Cupons > \"Criar Cupom\". Defina: código, tipo de desconto (% ou valor fixo), valor mínimo do pedido e data de validade. Cupons de primeira compra (ex: BEMVINDO10) são excelentes para atrair novos clientes. Limite o uso a 1 por cliente.",
        tags: ["promoção", "cupom", "desconto"],
      },
      {
        title: "Como criar uma promoção",
        content: "Em Marketing > Promoções, escolha o tipo: desconto em item, combo promocional ou desconto progressivo. Promoções com prazo limitado (\"só hoje\") geram urgência e aumentam pedidos. Combine com a foto do item em destaque para maximizar o resultado.",
        tags: ["promoção", "oferta"],
      },
      {
        title: "Como ativar combo promocional",
        content: "Crie um combo em Marketing > Combos. Selecione os itens que compõem o combo e defina o preço especial. O combo deve ter um desconto percebido de pelo menos 15% para ser atrativo. Dica: combine item popular + item de alta margem.",
        tags: ["promoção", "combo"],
      },
      {
        title: "Como funciona o programa de fidelidade",
        content: "O programa de fidelidade recompensa clientes recorrentes. Configure em Marketing > Fidelidade: defina quantos pedidos o cliente precisa fazer e qual a recompensa (desconto, item grátis). Programas de fidelidade aumentam a recorrência em até 25%.",
        tags: ["promoção", "fidelidade"],
      },
    ],
  },
  {
    label: "Avaliações e Clientes",
    icon: Star,
    color: "text-yellow-500",
    articles: [
      {
        title: "Como melhorar as avaliações da loja",
        content: "As avaliações dependem de 3 fatores principais: 1) Qualidade do produto (sabor, temperatura, apresentação), 2) Tempo de entrega (cumprir o prometido), 3) Embalagem (proteção e apresentação). Foque em melhorar esses pontos e a nota sobe naturalmente. Responda TODAS as avaliações, especialmente as negativas.",
        tags: ["avaliação", "nota", "cliente"],
      },
      {
        title: "Como responder avaliações dos clientes",
        content: "Acesse Avaliações no painel. Para cada avaliação, clique em \"Responder\". Seja educado e profissional. Para avaliações positivas: agradeça e convide a pedir novamente. Para negativas: peça desculpas, explique o que aconteceu e ofereça uma solução (cupom de desconto, novo pedido).",
        tags: ["avaliação", "resposta", "cliente"],
      },
      {
        title: "Como lidar com avaliações negativas",
        content: "Nunca ignore uma avaliação negativa. Responda em até 24h. Modelo: \"Olá [nome], pedimos desculpas pela experiência. Já tomamos as providências para que não aconteça novamente. Gostaríamos de compensar com [oferta]. Obrigado por nos ajudar a melhorar.\" Isso mostra profissionalismo e pode reverter a impressão.",
        tags: ["avaliação", "negativa", "reclamação"],
      },
      {
        title: "Como aumentar a recorrência de clientes",
        content: "Estratégias comprovadas: 1) Programa de fidelidade, 2) Cupom na embalagem para próximo pedido, 3) Mensagem personalizada de agradecimento, 4) Cardápio rotativo com novidades semanais, 5) Promoções exclusivas para clientes que já compraram. A recorrência é mais barata que aquisição de novos clientes.",
        tags: ["cliente", "recorrência", "fidelização"],
      },
    ],
  },
  {
    label: "Fotos e Imagens",
    icon: Image,
    color: "text-pink-500",
    articles: [
      {
        title: "Como alterar a foto de capa",
        content: "Em Configurações > Aparência > Foto de Capa. A foto de capa é a primeira coisa que o cliente vê. Use uma imagem de alta qualidade do seu prato mais bonito ou do ambiente da loja. Tamanho recomendado: 1200x400 pixels. Evite textos na imagem — eles ficam ilegíveis no celular.",
        tags: ["foto", "capa", "imagem"],
      },
      {
        title: "Como alterar o logo da loja",
        content: "Em Configurações > Aparência > Logo. O logo aparece no perfil e nos resultados de busca. Use uma imagem quadrada (400x400 pixels), com fundo limpo e boa resolução. O logo deve ser reconhecível mesmo em tamanho pequeno. Formatos aceitos: JPG, PNG.",
        tags: ["foto", "logo", "marca"],
      },
      {
        title: "Como adicionar fotos nos itens",
        content: "Ao editar um item do cardápio, clique em \"Adicionar Foto\". Use fotos reais dos seus produtos (não fotos de banco de imagens). Dicas: boa iluminação, ângulo de cima (45°), fundo neutro, prato completo e montado. Itens com foto vendem significativamente mais.",
        tags: ["foto", "item", "produto"],
      },
      {
        title: "Qual o tamanho ideal das imagens",
        content: "Logo: 400x400 pixels (quadrado). Foto de capa: 1200x400 pixels (retangular). Fotos de itens: 800x800 pixels (quadrado). Formato: JPG para fotos, PNG para logo com transparência. Mantenha o arquivo abaixo de 2MB para carregamento rápido.",
        tags: ["foto", "tamanho", "resolução"],
      },
    ],
  },
  {
    label: "Financeiro e Pagamentos",
    icon: CreditCard,
    color: "text-emerald-500",
    articles: [
      {
        title: "Como ver o extrato de vendas",
        content: "Acesse Financeiro > Extrato. Você verá todas as vendas do período selecionado, com detalhes de cada pedido: valor bruto, taxas, valor líquido. Use os filtros por data para analisar períodos específicos. Exporte em CSV para controle financeiro.",
        tags: ["financeiro", "extrato", "vendas"],
      },
      {
        title: "Como funcionam os repasses",
        content: "Os repasses são feitos semanalmente ou quinzenalmente, dependendo do plano. O valor repassado é o total de vendas menos as taxas da plataforma. Verifique em Financeiro > Repasses o histórico e as datas previstas. Mantenha seus dados bancários sempre atualizados.",
        tags: ["financeiro", "repasses", "pagamento"],
      },
      {
        title: "Como configurar formas de pagamento",
        content: "Em Configurações > Pagamentos, ative as formas aceitas: cartão de crédito/débito (online), PIX, dinheiro na entrega. Quanto mais opções, mais clientes conseguem comprar. O PIX é rápido e sem taxas adicionais para o lojista na maioria das plataformas.",
        tags: ["financeiro", "pagamento", "pix"],
      },
    ],
  },
  {
    label: "Pedidos e Operação",
    icon: MessageSquare,
    color: "text-sky-500",
    articles: [
      {
        title: "Como aceitar pedidos",
        content: "Quando um pedido chega, você recebe uma notificação sonora e visual. Clique em \"Aceitar\" para confirmar que está preparando. O cliente é notificado automaticamente. Aceite o mais rápido possível — pedidos não aceitos em tempo hábil podem ser cancelados automaticamente.",
        tags: ["pedido", "aceitar", "operação"],
      },
      {
        title: "Como cancelar um pedido",
        content: "Em Pedidos > selecione o pedido > Cancelar. Informe o motivo do cancelamento. Cancelamentos frequentes prejudicam a nota da loja e podem gerar penalidades. Evite cancelar: mantenha o cardápio atualizado e o estoque controlado.",
        tags: ["pedido", "cancelar"],
      },
      {
        title: "Como gerenciar o tempo de preparo",
        content: "Monitore o tempo entre aceitar e despachar. Se a cozinha está sobrecarregada, pause temporariamente a loja para não comprometer a qualidade. Use o indicador de tempo no painel para identificar gargalos. Treine a equipe para manter o fluxo eficiente.",
        tags: ["pedido", "tempo", "operação"],
      },
      {
        title: "Como lidar com horários de pico",
        content: "Nos horários de maior demanda (11h-14h e 18h-21h): 1) Prepare insumos com antecedência, 2) Tenha equipe reforçada, 3) Simplifique o cardápio se necessário, 4) Ajuste o tempo de preparo para ser realista. É melhor entregar bem do que entregar rápido e com qualidade ruim.",
        tags: ["pedido", "pico", "demanda"],
      },
    ],
  },
  {
    label: "Estratégias de Crescimento",
    icon: BarChart3,
    color: "text-indigo-500",
    articles: [
      {
        title: "Como aumentar as vendas na plataforma",
        content: "5 ações comprovadas: 1) Fotos profissionais em todos os itens, 2) Descrições detalhadas e apetitosas, 3) Cupom de primeira compra ativo, 4) Responder todas as avaliações, 5) Manter nota acima de 4.5. Lojas que aplicam essas 5 ações aumentam as vendas em média 35%.",
        tags: ["crescimento", "vendas", "estratégia"],
      },
      {
        title: "Como se destacar da concorrência",
        content: "Analise seus concorrentes: preços, cardápio, avaliações e fotos. Identifique o que eles fazem bem e onde falham. Seu diferencial pode ser: velocidade de entrega, qualidade da embalagem, variedade do cardápio ou atendimento personalizado. Foque em 1-2 diferenciais e comunique-os claramente.",
        tags: ["crescimento", "concorrência", "diferencial"],
      },
      {
        title: "Como usar dados para tomar decisões",
        content: "Acesse os relatórios no painel: itens mais vendidos, horários de pico, taxa de cancelamento e nota média. Use esses dados para: ajustar o cardápio (remover itens que não vendem), otimizar horários e identificar problemas operacionais antes que afetem a nota.",
        tags: ["crescimento", "dados", "relatórios"],
      },
    ],
  },
  {
    label: "Usando a Plataforma",
    icon: Zap,
    color: "text-primary",
    articles: [
      {
        title: "Como funciona o Fluxo de Estratégias",
        content: "O Fluxo de Estratégias é a ferramenta de gestão de tarefas para lojas de delivery. O gestor estratégico cria estratégias com categorias e itens de ação. O gestor operacional executa cada item, marcando o progresso. O admin acompanha tudo pelo dashboard.",
        tags: ["plataforma", "estratégia", "fluxo"],
      },
      {
        title: "Como criar uma estratégia",
        content: "Vá em \"Nova Estratégia\" no menu lateral. Preencha: nome da loja, nome do gestor, prazo de entrega e gestor operacional responsável. Adicione categorias (ex: Cardápio, Marketing, Operação) e dentro de cada uma, os itens de ação com texto explicativo.",
        tags: ["plataforma", "estratégia", "criar"],
      },
      {
        title: "Entendendo os papéis do sistema",
        content: "Administrador: acesso total, aprova usuários e estratégias. Gestor Estratégico: cria e gerencia estratégias, atribui tarefas. Gestor Operacional: executa as tarefas da estratégia, marca progresso. Cada papel tem um menu específico para sua função.",
        tags: ["plataforma", "papéis", "acesso"],
      },
      {
        title: "Como usar o bloco de notas",
        content: "O Bloco de Notas é seu espaço pessoal para anotar informações importantes: dados de clientes, ideias, lembretes. Acesse pelo menu lateral > Bloco de Notas. Suas notas são privadas e ficam salvas na nuvem, acessíveis de qualquer dispositivo.",
        tags: ["plataforma", "notas", "anotações"],
      },
      {
        title: "Como usar o calendário",
        content: "O Calendário mostra todas as estratégias com seus prazos de entrega. Visualize quais lojas precisam de atenção em cada data. Use para planejar sua semana e garantir que nenhum prazo seja perdido.",
        tags: ["plataforma", "calendário", "prazo"],
      },
      {
        title: "Como usar a calculadora de precificação",
        content: "A Calculadora de Precificação ajuda a definir o preço ideal dos produtos. Informe: custo dos ingredientes, embalagem, mão de obra e margem desejada. A ferramenta calcula o preço de venda considerando as taxas da plataforma, garantindo que sua operação seja lucrativa.",
        tags: ["plataforma", "precificação", "preço"],
      },
    ],
  },
];

export default function HelpCenter() {
  const [search, setSearch] = useState("");

  const filteredCategories = HELP_CATEGORIES.map((cat) => ({
    ...cat,
    articles: cat.articles.filter((a) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.tags.some((t) => t.includes(q))
      );
    }),
  })).filter((cat) => cat.articles.length > 0);

  const totalArticles = HELP_CATEGORIES.reduce((acc, c) => acc + c.articles.length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <HelpCircle className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Central de Ajuda</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Tudo que você precisa saber para gerenciar lojas de delivery com sucesso.
          {" "}<Badge variant="secondary" className="text-[10px]">{totalArticles} artigos</Badge>
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar artigos..."
          className="pl-10 bg-background"
        />
      </div>

      {/* Categories */}
      {filteredCategories.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum artigo encontrado para "{search}"</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card key={cat.label} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className={`h-5 w-5 ${cat.color}`} />
                    {cat.label}
                    <Badge variant="outline" className="text-[10px] ml-auto">{cat.articles.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Accordion type="multiple" className="w-full">
                    {cat.articles.map((article, i) => (
                      <AccordionItem key={i} value={`${cat.label}-${i}`} className="border-border/50">
                        <AccordionTrigger className="text-sm font-medium text-foreground hover:text-primary py-3">
                          {article.title}
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                            {article.content}
                          </p>
                          <div className="flex gap-1.5 mt-3 flex-wrap">
                            {article.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[10px] cursor-pointer hover:bg-primary/10"
                                onClick={() => setSearch(tag)}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
