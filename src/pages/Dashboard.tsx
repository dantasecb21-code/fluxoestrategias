import { useNavigate } from "react-router-dom";
import { Strategy } from "@/types/strategy";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Copy, Pencil, Trash2, FileText, Zap } from "lucide-react";

interface DashboardProps {
  strategies: Strategy[];
  deleteStrategy: (id: string) => void;
  duplicateStrategy: (id: string) => Strategy | null;
}

export function Dashboard({ strategies, deleteStrategy, duplicateStrategy }: DashboardProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-heading font-bold text-3xl text-foreground">
              Gestor de Estratégias <span className="text-primary">99Food</span>
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Construtor inteligente de estratégias • Base viva de conhecimento
          </p>
          <Button onClick={() => navigate("/nova")} className="mt-6" size="lg">
            <Plus className="h-5 w-5 mr-2" /> Nova Estratégia
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {strategies.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Nenhuma estratégia criada</h2>
            <p className="text-muted-foreground mb-6">
              Comece criando sua primeira estratégia personalizada.
            </p>
            <Button onClick={() => navigate("/nova")}>
              <Plus className="h-4 w-4 mr-2" /> Criar primeira estratégia
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Histórico ({strategies.length})
            </h2>
            {strategies.map((s) => {
              const checkedCount = s.categories.reduce(
                (acc, c) => acc + c.items.filter((i) => i.checked).length, 0
              );
              const totalItems = s.categories.reduce((acc, c) => acc + c.items.length, 0);
              return (
                <Card
                  key={s.id}
                  className="p-4 flex items-center justify-between hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/estrategia/${s.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-semibold text-foreground truncate">
                      {s.meta.storeName || "Sem nome"}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{checkedCount}/{totalItems} itens</span>
                      <span>•</span>
                      <span>{s.categories.length} categorias</span>
                      <span>•</span>
                      <span>{new Date(s.updatedAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => navigate(`/estrategia/${s.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const dup = duplicateStrategy(s.id);
                        if (dup) navigate(`/estrategia/${dup.id}`);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteStrategy(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
