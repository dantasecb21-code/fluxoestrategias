import { useNavigate } from "react-router-dom";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Copy, Pencil, Trash2, FileText, Zap, Clock, UserCheck } from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function calcProgress(categories: any[]) {
  const allItems = categories.flatMap((c: any) => c.items);
  if (allItems.length === 0) return { percent: 0, completed: 0, inProgress: 0, pending: 0, total: 0 };
  const completed = allItems.filter((i: any) => i.status === "completed").length;
  const inProgress = allItems.filter((i: any) => i.status === "in_progress").length;
  const pending = allItems.filter((i: any) => !i.status || i.status === "pending").length;
  const total = allItems.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { percent, completed, inProgress, pending, total };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { strategies, loading, deleteStrategy, duplicateStrategy } = useDbStrategies();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Gestor de <span className="text-primary">Estratégias</span>
          </h1>
        </div>
        <p className="text-muted-foreground">
          Construtor inteligente de estratégias — crie, atribua e acompanhe a execução.
        </p>
        <Button onClick={() => navigate("/nova")} className="mt-4" size="lg">
          <Plus className="h-5 w-5 mr-2" /> Nova Estratégia
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : strategies.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Nenhuma estratégia criada</h2>
          <p className="text-muted-foreground mb-6">Comece criando sua primeira estratégia personalizada.</p>
          <Button onClick={() => navigate("/nova")}>
            <Plus className="h-4 w-4 mr-2" /> Criar primeira estratégia
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="font-heading font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Estratégias ({strategies.length})
          </h2>
          {strategies.map((s) => {
            const progress = calcProgress(s.categories);
            const status = (s as any).status || "in_progress";
            const statusLabel = status === "pending_approval" ? "Aguardando aprovação" : status === "approved" ? "Concluída ✓" : "Em andamento";
            const statusVariant = status === "pending_approval" ? "outline" as const : status === "approved" ? "default" as const : "secondary" as const;
            const isApproved = status === "approved";
            return (
              <Card
                key={s.id}
                className={`p-5 hover:border-primary/30 transition-colors cursor-pointer ${isApproved ? "border-success/30 bg-success/5" : ""}`}
                onClick={() => navigate(`/estrategia/${s.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-semibold text-foreground text-lg truncate flex items-center gap-2">
                      {s.store_name || "Sem nome"}
                      <Badge variant={statusVariant} className={`text-[10px] py-0 px-1.5 h-4 leading-none ${isApproved ? "bg-success/20 text-success border-success/30" : ""}`}>{statusLabel}</Badge>
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                      {s.operational_manager && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3" /> {s.operational_manager}
                        </span>
                      )}
                      {s.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Prazo: {formatDateBR(s.deadline)}
                        </span>
                      )}
                      <span>{new Date(s.updated_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => navigate(`/estrategia/${s.id}`)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={async () => {
                        const dup = await duplicateStrategy(s.id);
                        if (dup) navigate(`/estrategia/${dup.id}`);
                      }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteStrategy(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress */}
                {progress.total > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Execução</span>
                      <span className="font-medium text-foreground">{progress.percent}%</span>
                    </div>
                    <Progress value={progress.percent} className="h-1.5" />
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="text-success">{progress.completed} concluídos</span>
                      <span className="text-primary">{progress.inProgress} em andamento</span>
                      <span className="text-warning">{progress.pending} pendentes</span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
