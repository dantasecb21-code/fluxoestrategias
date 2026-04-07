import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Send, Loader2, Bot, User, Trash2, UtensilsCrossed, Truck, Tag, Star, Settings, Image, CreditCard, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ImageLightbox } from "@/components/ImageLightbox";
import { supabase } from "@/integrations/supabase/client";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`;

const FAQ_CATEGORIES = [
  {
    label: "Cardápio",
    icon: UtensilsCrossed,
    questions: [
      "Como criar categorias no cardápio?",
      "Como adicionar itens ao cardápio?",
      "Como editar ou remover um item?",
      "Como alterar a ordem dos itens?",
      "Como adicionar complementos e adicionais?",
      "Como configurar tamanhos e variações?",
    ],
  },
  {
    label: "Configurações da Loja",
    icon: Settings,
    questions: [
      "Como alterar o nome da loja?",
      "Como alterar a categoria da loja?",
      "Como mudar o endereço da loja?",
      "Como configurar horário de funcionamento?",
      "Como pausar a loja temporariamente?",
      "Como ativar ou desativar a loja?",
    ],
  },
  {
    label: "Entrega e Logística",
    icon: Truck,
    questions: [
      "Como configurar entrega pela loja?",
      "Como definir área de entrega?",
      "Como configurar taxa de entrega?",
      "Como configurar tempo de preparo?",
      "Como funciona a entrega pela plataforma?",
    ],
  },
  {
    label: "Promoções e Cupons",
    icon: Tag,
    questions: [
      "Como criar um cupom de desconto?",
      "Como criar uma promoção?",
      "Como ativar combo promocional?",
      "Como funciona o programa de fidelidade?",
    ],
  },
  {
    label: "Avaliações e Clientes",
    icon: Star,
    questions: [
      "Como melhorar as avaliações?",
      "Como responder avaliações dos clientes?",
      "Como lidar com avaliações negativas?",
      "Como aumentar a recorrência de clientes?",
    ],
  },
  {
    label: "Fotos e Imagens",
    icon: Image,
    questions: [
      "Como alterar a foto de capa?",
      "Como alterar o logo da loja?",
      "Como adicionar fotos nos itens?",
      "Qual o tamanho ideal das imagens?",
    ],
  },
  {
    label: "Financeiro e Pagamentos",
    icon: CreditCard,
    questions: [
      "Como ver o extrato de vendas?",
      "Como funcionam os repasses?",
      "Como configurar formas de pagamento?",
    ],
  },
  {
    label: "Pedidos e Operação",
    icon: MessageSquare,
    questions: [
      "Como aceitar pedidos?",
      "Como cancelar um pedido?",
      "Como configurar pedido mínimo?",
      "Como funciona o chat com o cliente?",
    ],
  },
];

export default function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (directText?: string) => {
    const text = (directText || input).trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const allMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => null);
        throw new Error(errorData?.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("Sem resposta do servidor");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      const assistantId = crypto.randomUUID();

      // Add empty assistant message
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const currentContent = assistantContent;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: currentContent } : m))
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const currentContent = assistantContent;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: currentContent } : m))
              );
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem");
      // Remove last user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm rounded-t-xl mt-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-semibold text-base text-foreground leading-tight">Chatinho Gepeto</h1>
            <p className="text-[11px] text-muted-foreground">Tire dúvidas sobre a plataforma</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground hover:text-destructive h-8 text-xs gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col gap-4 py-6">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-heading font-semibold text-foreground text-base">Olá! Sou o Chatinho Gepeto</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Clique em qualquer pergunta para enviar direto</p>
            </div>

            <Accordion type="multiple" className="w-full max-w-lg mx-auto">
              {FAQ_CATEGORIES.map((cat) => (
                <AccordionItem key={cat.label} value={cat.label} className="border-border">
                  <AccordionTrigger className="text-sm font-medium text-foreground hover:text-primary py-2.5 gap-2">
                    <span className="flex items-center gap-2">
                      <cat.icon className="h-4 w-4 text-primary" />
                      {cat.label}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="flex flex-col gap-1">
                      {cat.questions.map((q) => (
                        <button
                          key={q}
                          className="text-left px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setInput(q);
                            setTimeout(() => handleSend(), 50);
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          img: ({ src, alt }) => <ImageLightbox src={src} alt={alt} />,
                        }}
                      >
                        {msg.content || "..."}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2.5 justify-start">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pensando...
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2 items-end bg-muted/50 rounded-xl p-1.5 border border-border focus-within:border-primary/40 transition-colors">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua dúvida... (ex: Como alterar o nome da loja?)"
            className="min-h-[40px] max-h-28 resize-none bg-transparent border-0 focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60"
            rows={1}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="h-9 w-9 shrink-0 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            size="icon"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
