import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Rocket, DollarSign, Monitor, Settings, Star, UtensilsCrossed,
  Tag, Truck, ClipboardList, HelpCircle, ExternalLink, BookOpen, Zap, Bot, AlertTriangle
} from "lucide-react";
import AiHelpChat from "@/components/AiHelpChat";
import AiQuotaCard from "@/components/AiQuotaCard";
import { useAuth } from "@/hooks/useAuth";
interface Guide {
  title: string;
  url: string;
  tags: string[];
}

interface Category {
  label: string;
  icon: React.ElementType;
  color: string;
  guides: Guide[];
}

const GUIDE_CATEGORIES: Category[] = [
  {
    label: "Ative sua Loja",
    icon: Rocket,
    color: "text-green-500",
    guides: [
      { title: "Como ativar sua loja", url: "https://99app.com/99food/restaurantes/guias/como-ativar-sua-loja/", tags: ["ativar", "loja", "início"] },
      { title: "Como construir o seu cardápio", url: "https://99app.com/99food/restaurantes/guias/como-construir-o-seu-cardapio/", tags: ["cardápio", "criar", "início"] },
      { title: "Guia de Como Criar seu CNPJ", url: "https://99app.com/99food/restaurantes/guias/guia-de-como-criar-seu-cnpj/", tags: ["cnpj", "cadastro", "documento"] },
    ],
  },
  {
    label: "Gestão do Cardápio",
    icon: UtensilsCrossed,
    color: "text-orange-500",
    guides: [
      { title: "Aprenda a gerenciar seu cardápio", url: "https://99app.com/99food/restaurantes/guias/aprenda-a-gerenciar-seu-cardapio/", tags: ["cardápio", "gerenciar"] },
      { title: "Como Mudar as Fotos do Cardápio", url: "https://99app.com/99food/restaurantes/guias/guia-de-como-mudar-as-fotos-do-cardapio-e-cardapio/", tags: ["foto", "cardápio", "imagem"] },
      { title: "Como criar Itens Individuais no Cardápio", url: "https://99app.com/99food/restaurantes/guias/br-guide-how-to-create-individual-items-in-the-menu/", tags: ["item", "cardápio", "criar"] },
      { title: "Como criar Categorias no Cardápio", url: "https://99app.com/99food/restaurantes/guias/como-criar-categorias-no-cardapio/", tags: ["categoria", "cardápio", "criar"] },
      { title: "Como criar Modificadores no Cardápio", url: "https://99app.com/99food/restaurantes/guias/br.guide.-how-to-create-modifiers-in-the-menu", tags: ["modificador", "complemento", "adicional"] },
      { title: "Como criar Combos no Cardápio", url: "https://99app.com/99food/restaurantes/guias/br-guide-how-to-create-combo-in-the-menu/", tags: ["combo", "cardápio", "promoção"] },
      { title: "Como sincronizar o menu entre lojas", url: "https://99app.com/99food/restaurantes/guias/como-sincronizar-o-menu-entre-lojas/", tags: ["sincronizar", "menu", "lojas"] },
      { title: "Como desligar item no Cardápio", url: "https://99app.com/99food/restaurantes/guias/como-desligar-item-no-cardapio/", tags: ["desligar", "pausar", "item"] },
      { title: "Como atualizar item no Cardápio", url: "https://99app.com/99food/restaurantes/guias/como-atualizar-item-no-cardapio/", tags: ["atualizar", "editar", "item"] },
    ],
  },
  {
    label: "Configurações da Conta e Loja",
    icon: Settings,
    color: "text-blue-500",
    guides: [
      { title: "Configuração de horários de funcionamento", url: "https://99app.com/99food/restaurantes/guias/configuracao-horario-funcionamento-99food/", tags: ["horário", "funcionamento", "configurar"] },
      { title: "O que é a Cobertura de Imagem?", url: "https://99app.com/99food/restaurantes/guias/o-que-e-a-cobertura-de-imagem/", tags: ["imagem", "cobertura", "foto"] },
      { title: "Como ligar, pausar e desligar a loja", url: "https://99app.com/99food/restaurantes/guias/como-ligar-e-desligar-a-loja/", tags: ["ligar", "pausar", "desligar", "loja"] },
      { title: "Como alterar o nome da loja", url: "https://99app.com/99food/restaurantes/guias/como-alterar-o-nome-da-loja/", tags: ["nome", "loja", "alterar"] },
      { title: "Como alterar a categoria da Loja", url: "https://99app.com/99food/restaurantes/guias/como-alterar-a-categoria-da-loja/", tags: ["categoria", "loja", "alterar"] },
      { title: "Como mudar seu endereço pelo app", url: "https://99app.com/99food/restaurantes/guias/mudar-endereco-99loja/", tags: ["endereço", "mudar", "loja"] },
      { title: "Como alterar meu número de telefone", url: "https://99app.com/99food/restaurantes/guias/alterar-numero-telefone/", tags: ["telefone", "alterar", "conta"] },
      { title: "Como criar um novo usuário", url: "https://99app.com/99food/restaurantes/guias/como-criar-um-novo-usuario/", tags: ["usuário", "criar", "conta"] },
      { title: "Como visualizar as permissões da conta", url: "https://99app.com/99food/restaurantes/guias/como-visualizar-as-permissoes-da-conta/", tags: ["permissão", "conta", "acesso"] },
      { title: "Como remover uma conta", url: "https://99app.com/99food/restaurantes/guias/como-remover-uma-conta/", tags: ["remover", "conta", "excluir"] },
      { title: "Como baixar o app do motorista e adicionar ao Restaurante", url: "https://99app.com/99food/restaurantes/guias/como-adicionar-uma-conta-de-motorista-ao-restaurante/", tags: ["motorista", "app", "adicionar"] },
    ],
  },
  {
    label: "Nota de Qualidade e Avaliações",
    icon: Star,
    color: "text-yellow-500",
    guides: [
      { title: "O que é a Nota de Qualidade?", url: "https://99app.com/99food/restaurantes/guias/br-guide-oque--a-nota-de-qualidade/", tags: ["nota", "qualidade", "avaliação"] },
      { title: "Como Conquistar as 5 Estrelas na Avaliação do Cliente", url: "https://99app.com/99food/restaurantes/guias/como-conquistar-as-5-estrelas-na-avaliacao-do-cliente/", tags: ["estrela", "avaliação", "cliente"] },
      { title: "Como Zerar os Cancelamentos e Blindar sua Nota", url: "https://99app.com/99food/restaurantes/guias/como-zerar-os-cancelamentos-e-blindar-sua-nota-de-qualidade/", tags: ["cancelamento", "nota", "qualidade"] },
      { title: "Como Zerar a Taxa de Pedidos Errados e Faltantes", url: "https://99app.com/99food/restaurantes/guias/como-zerar-a-taxa-de-pedidos-errados-e-faltantes/", tags: ["pedido", "errado", "faltante"] },
      { title: "Como Melhorar Sua Taxa de Online e Garantir Mais Pedidos", url: "https://99app.com/99food/restaurantes/guias/como-melhorar-sua-taxa-de-online-e-garantir-mais-pedidos/", tags: ["online", "pedidos", "taxa"] },
      { title: "Guia de Como contestar Avaliações", url: "https://99app.com/99food/restaurantes/guias/guia-de-como-contestar-avaliacoes/", tags: ["contestar", "avaliação", "recurso"] },
    ],
  },
  {
    label: "Gestão de Promoções",
    icon: Tag,
    color: "text-purple-500",
    guides: [
      { title: "Promoções e Taxas", url: "https://99app.com/99food/restaurantes/guias/promocoes-e-taxas-99food/", tags: ["promoção", "taxa", "desconto"] },
      { title: "Como se cadastrar em campanhas promocionais", url: "https://99app.com/99food/restaurantes/guias/como-se-cadastrar-em-campanhas-promocionais/", tags: ["campanha", "promocional", "cadastrar"] },
      { title: "Como compartilhar sua loja", url: "https://99app.com/99food/restaurantes/guias/como-compartilhar-sua-loja/", tags: ["compartilhar", "loja", "divulgar"] },
      { title: "Como configurar promoção de entrega gratuita", url: "https://99app.com/99food/restaurantes/guias/como-configuro-uma-promocao-de-entrega-gratuita/", tags: ["entrega", "gratuita", "promoção"] },
      { title: "Como configurar promoção de itens promocionais", url: "https://99app.com/99food/restaurantes/guias/br-guide-how-to-set-an-offer-promotional-items/", tags: ["item", "promocional", "oferta"] },
      { title: "Como configurar promoção compre 1, leve 2", url: "https://99app.com/99food/restaurantes/guias/br-guide-how-to-set-an-offer-buy-x-take-y/", tags: ["compre", "leve", "promoção"] },
    ],
  },
  {
    label: "Informações Financeiras",
    icon: DollarSign,
    color: "text-emerald-500",
    guides: [
      { title: "Entendendo as Cobranças", url: "https://99app.com/99food/restaurantes/guias/entendendo-as-cobrancas-da-99food/", tags: ["cobrança", "taxa", "financeiro"] },
      { title: "Diferença entre ganhos por pedido e valor recebido", url: "https://99app.com/99food/restaurantes/guias/guia-de-como-entender-a-diferenca-entre-seus-ganhos-por-pedido-e-o-valor/", tags: ["ganho", "pedido", "valor"] },
      { title: "Como compreender o Relatório", url: "https://99app.com/99food/restaurantes/guias/como-compreender-o-relatorio-da-99food/", tags: ["relatório", "financeiro", "extrato"] },
      { title: "Gestão da Fatura", url: "https://99app.com/99food/restaurantes/guias/gestao-da-fatura/", tags: ["fatura", "gestão", "pagamento"] },
      { title: "Guia da Fatura Simplificado", url: "https://99app.com/99food/restaurantes/guias/guia-da-fatura-da-99food-simplificado/", tags: ["fatura", "simplificado", "guia"] },
      { title: "Reforma Tributária 2026", url: "https://99app.com/99food/restaurantes/guias/reforma-tributaria-2026/", tags: ["tributária", "reforma", "imposto"] },
      { title: "Como Contestar um Pedido Pós-Venda", url: "https://99app.com/99food/restaurantes/guias/como-contestar-um-pedido-pos-venda/", tags: ["contestar", "pedido", "pós-venda"] },
      { title: "Como visualizar custos aplicáveis ao Restaurante", url: "https://99app.com/99food/restaurantes/guias/como-visualizar-os-custos-aplicaveis-ao-restaurante/", tags: ["custo", "restaurante", "taxa"] },
      { title: "Como ver o seu status de pagamento", url: "https://99app.com/99food/restaurantes/guias/como-ver-o-seu-status-de-pagamento/", tags: ["pagamento", "status", "repasse"] },
      { title: "Quando você recebe o pagamento?", url: "https://99app.com/99food/restaurantes/guias/quando-a-99food-te-paga/", tags: ["pagamento", "prazo", "repasse"] },
      { title: "Como receber pagamento de Vale Refeição", url: "https://99app.com/99food/restaurantes/guias/como-receber-pagamento-de-vale-refeicao-na-99Food/", tags: ["vale", "refeição", "pagamento"] },
      { title: "Como visualizar o Relatório Financeiro", url: "https://99app.com/99food/restaurantes/guias/como-visualizar-o-relatorio-financeiro/", tags: ["relatório", "financeiro", "visualizar"] },
      { title: "Como alterar a conta bancária", url: "https://99app.com/99food/restaurantes/guias/adicionar-alterar-conta-bancaria-99Food/", tags: ["banco", "conta", "alterar"] },
    ],
  },
  {
    label: "Usando o Gestor de Pedidos",
    icon: ClipboardList,
    color: "text-sky-500",
    guides: [
      { title: "Como Modificar Tempo de Preparo de um pedido", url: "https://99app.com/99food/restaurantes/guias/como-modificar-tempo-de-preparo-de-um-pedido/", tags: ["tempo", "preparo", "pedido"] },
      { title: "Como testar um pedido", url: "https://99app.com/99food/restaurantes/guias/como-testar-um-pedido/", tags: ["testar", "pedido", "teste"] },
      { title: "Como avaliar e bloquear motoristas", url: "https://99app.com/99food/restaurantes/guias/br-guide-how-to-block-drivers-at-99food/", tags: ["motorista", "bloquear", "avaliar"] },
      { title: "Como atribuir corrida a um motorista específico", url: "https://99app.com/99food/restaurantes/guias/br-guide-how-to-atribute-to-a-Driver/", tags: ["motorista", "corrida", "atribuir"] },
      { title: "Gerenciar pedidos de diferentes lojas no mesmo aparelho", url: "https://99app.com/99food/restaurantes/guias/como-gerenciar-pedidos-de-diferentes-estabelecimentos-no-mesmo-aparelho/", tags: ["pedido", "lojas", "aparelho"] },
      { title: "Ativar Localizador do Motorista em Entrega pela Loja", url: "https://99app.com/99food/restaurantes/guias/como-ativar-o-localizador-do-motorista-em-entrega-feita-pela-loja/", tags: ["localizador", "motorista", "entrega"] },
      { title: "Instalação de múltiplas impressoras", url: "https://99app.com/99food/restaurantes/guias/instalacao-de-multiplas-impressoras/", tags: ["impressora", "instalar", "configurar"] },
    ],
  },
  {
    label: "Configurações de Entrega",
    icon: Truck,
    color: "text-green-500",
    guides: [
      { title: "Como configurar a Entrega feita pela loja", url: "https://99app.com/99food/restaurantes/guias/como-configurar-a-entrega-feita-pela-loja/", tags: ["entrega", "loja", "configurar"] },
      { title: "Como configurar a Entrega Flex", url: "https://99app.com/99food/restaurantes/guias/como-configurar-a-entrega-flex/", tags: ["entrega", "flex", "configurar"] },
      { title: "Como configurar o Tempo de Preparo", url: "https://99app.com/99food/restaurantes/guias/como-configurar-o-tempo-de-preparo/", tags: ["tempo", "preparo", "configurar"] },
      { title: "Valor Mínimo do Pedido", url: "https://99app.com/99food/restaurantes/guias/valor-minimo-do-pedido/", tags: ["valor", "mínimo", "pedido"] },
    ],
  },
  {
    label: "Conhecendo a Plataforma",
    icon: Monitor,
    color: "text-indigo-500",
    guides: [
      { title: "O que é a Plataforma de Gestão?", url: "https://99app.com/99food/restaurantes/guias/o-que-e-a-plataforma-de-gestao-da-99-food/", tags: ["plataforma", "gestão", "painel"] },
      { title: "Quais tipos de aplicativos temos e suas diferenças", url: "https://99app.com/99food/restaurantes/guias/99food-store-quais-tipos-de-aplicativos-temos-qual-a-diferenca-entre-eles/", tags: ["app", "aplicativo", "diferença"] },
      { title: "Diferentes maneiras para fazer Login", url: "https://99app.com/99food/restaurantes/guias/diferentes-maneiras-para-fazer-login/", tags: ["login", "acesso", "entrar"] },
      { title: "Guia de como utilizar o modo baixar", url: "https://99app.com/99food/restaurantes/guias/guia-de-como-utilizar-o-modo-baixar/", tags: ["baixar", "download", "modo"] },
    ],
  },
  {
    label: "Melhores Práticas",
    icon: BookOpen,
    color: "text-pink-500",
    guides: [
      { title: "Como gerar seus primeiros pedidos pagos", url: "https://99app.com/99food/restaurantes/guias/como-gerar-seus-primeiros-pedidos-pagos-na-99food/", tags: ["primeiros", "pedidos", "venda"] },
      { title: "Melhores Práticas na Entrega", url: "https://99app.com/99food/restaurantes/guias/melhores-praticas-na-entrega-da-99food/", tags: ["entrega", "prática", "qualidade"] },
      { title: "Boas práticas para evitar cancelamentos", url: "https://99app.com/99food/restaurantes/guias/boas-praticas-para-evitar-cancelamentos/", tags: ["cancelamento", "evitar", "prática"] },
      { title: "Como receber Vale Refeição na sua Loja", url: "https://99app.com/99food/restaurantes/guias/como-receber-pagamento-de-vale-refeicao-na-sua-loja/", tags: ["vale", "refeição", "loja"] },
    ],
  },
  {
    label: "Usando a Plataforma Interna",
    icon: Zap,
    color: "text-primary",
    guides: [
      { title: "Como funciona o Fluxo de Estratégias", url: "", tags: ["estratégia", "fluxo", "plataforma"], },
      { title: "Como criar uma estratégia para a loja", url: "", tags: ["estratégia", "criar", "loja"], },
      { title: "Entendendo os papéis do sistema (Admin, Estratégico, Operacional)", url: "", tags: ["papéis", "acesso", "permissão"], },
      { title: "Como usar o Bloco de Notas", url: "", tags: ["notas", "anotações", "bloco"], },
      { title: "Como usar o Calendário de Estratégias", url: "", tags: ["calendário", "prazo", "data"], },
      { title: "Como usar a Calculadora de Precificação", url: "", tags: ["precificação", "preço", "calculadora"], },
    ],
  },
];

const INTERNAL_ARTICLES: Record<string, string> = {
  "Como funciona o Fluxo de Estratégias": "O Fluxo de Estratégias é a ferramenta de gestão de tarefas para lojas de delivery. O gestor estratégico cria estratégias com categorias e itens de ação. O gestor operacional executa cada item, marcando o progresso. O admin acompanha tudo pelo dashboard.",
  "Como criar uma estratégia para a loja": "Vá em \"Nova Estratégia\" no menu lateral. Preencha: nome da loja, nome do gestor, prazo de entrega e gestor operacional responsável. Adicione categorias (ex: Cardápio, Marketing, Operação) e dentro de cada uma, os itens de ação com texto explicativo. Ao finalizar, clique em Salvar.",
  "Entendendo os papéis do sistema (Admin, Estratégico, Operacional)": "Administrador: acesso total, aprova usuários e estratégias. Gestor Estratégico: cria e gerencia estratégias, atribui tarefas aos operacionais. Gestor Operacional: executa as tarefas da estratégia, marca progresso dos itens. Cada papel tem um menu específico para sua função.",
  "Como usar o Bloco de Notas": "O Bloco de Notas é seu espaço pessoal para anotar informações importantes: dados de clientes, ideias, lembretes. Acesse pelo menu lateral > Bloco de Notas. Suas notas são privadas e ficam salvas na nuvem, acessíveis de qualquer dispositivo.",
  "Como usar o Calendário de Estratégias": "O Calendário mostra todas as estratégias com seus prazos de entrega. Visualize quais lojas precisam de atenção em cada data. Use para planejar sua semana e garantir que nenhum prazo seja perdido.",
  "Como usar a Calculadora de Precificação": "A Calculadora de Precificação ajuda a definir o preço ideal dos produtos. Informe: custo dos ingredientes, embalagem, mão de obra e margem desejada. A ferramenta calcula o preço de venda considerando as taxas da plataforma, garantindo que sua operação seja lucrativa.",
};

export default function HelpCenter() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [search, setSearch] = useState("");
  const [expandedInternal, setExpandedInternal] = useState<string | null>(null);

  const filteredCategories = GUIDE_CATEGORIES.map((cat) => ({
    ...cat,
    guides: cat.guides.filter((g) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        g.title.toLowerCase().includes(q) ||
        g.tags.some((t) => t.includes(q))
      );
    }),
  })).filter((cat) => cat.guides.length > 0);

  const totalGuides = GUIDE_CATEGORIES.reduce((acc, c) => acc + c.guides.length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isAdmin && (
        <Card className="border-warning/30 bg-warning/5 p-4">
          <div className="flex gap-3 text-sm">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Aviso para administrador</p>
              <p className="text-muted-foreground">
                A IA está no modo gratuito protegido: ela pausa automaticamente em 90% de 1.000 chamadas no mês para evitar cobrança.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <HelpCircle className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Central de Ajuda</h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Guias completos e assistente com IA para ajudar na gestão das lojas na plataforma.
        </p>
      </div>

      <Tabs defaultValue="guides" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs mx-auto">
          <TabsTrigger value="guides" className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Guias
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5" /> Assistente IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guides" className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar guias... (ex: cardápio, entrega, promoção)"
              className="pl-10 bg-background"
            />
          </div>

          {/* Categories */}
          {filteredCategories.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhum guia encontrado para "{search}"</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Card key={cat.label} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className={`h-5 w-5 ${cat.color}`} />
                        {cat.label}
                        <Badge variant="outline" className="text-[10px] ml-auto">{cat.guides.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="divide-y divide-border/50">
                        {cat.guides.map((guide, i) => {
                          const isInternal = !guide.url;
                          const internalContent = INTERNAL_ARTICLES[guide.title];
                          const isExpanded = expandedInternal === `${cat.label}-${i}`;

                          return (
                            <div key={i} className="py-2.5">
                              {isInternal ? (
                                <div>
                                  <button
                                    onClick={() => setExpandedInternal(isExpanded ? null : `${cat.label}-${i}`)}
                                    className="w-full flex items-center justify-between gap-2 text-left group"
                                  >
                                    <span className="text-sm text-foreground group-hover:text-primary transition-colors font-medium">
                                      {guide.title}
                                    </span>
                                    <Badge variant="secondary" className="text-[9px] shrink-0">
                                      interno
                                    </Badge>
                                  </button>
                                  {isExpanded && internalContent && (
                                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed border-l-2 border-primary/30 pl-3">
                                      {internalContent}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <a
                                  href={guide.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between gap-2 group"
                                >
                                  <span className="text-sm text-foreground group-hover:text-primary transition-colors font-medium">
                                    {guide.title}
                                  </span>
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                </a>
                              )}
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {guide.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-[9px] py-0 px-1.5 cursor-pointer hover:bg-primary/10"
                                    onClick={(e) => { e.preventDefault(); setSearch(tag); }}
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <Card className="p-6 text-center space-y-3 border-primary/20 bg-primary/5">
            <p className="text-sm text-foreground font-medium">Não encontrou o que procurava?</p>
            <p className="text-xs text-muted-foreground">
              Acesse a página completa de guias para ver todos os tutoriais disponíveis com prints e passo a passo.
            </p>
            <Button asChild variant="outline" size="sm">
              <a href="https://99app.com/99food/restaurantes/guias/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Ver todos os guias
              </a>
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <div className="space-y-3">
            {isAdmin && <AiQuotaCard />}
            <Card className="overflow-hidden">
              <AiHelpChat />
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
