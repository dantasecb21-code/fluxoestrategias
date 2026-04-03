import { useNavigate } from "react-router-dom";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { Badge } from "@/components/ui/badge";
import { deriveStrategyDisplayStatus, getStatusLabel, getStatusBadgeProps } from "@/lib/strategyStatus";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle, UserCheck, Eye } from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import OverdueAlert from "@/components/OverdueAlert";

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

export default function PendingStrategies() {
  const navigate = useNavigate();
  const { strategies, loading } = useDbStrategies();

  const pendingStrategies = strategies.filter((s) => {
    const displayStatus = deriveStrategyDisplayStatus(s);
    // Include: pending, in_progress, AND pending_approval
    return displayStatus !== "completed";
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-warning/20 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Estratégias <span className="text-primary">Pendentes</span>
          </h1>
        </div>
        <p className="text-muted-foreground">
          Acompanhe todas as estratégias que ainda não foram concluídas.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : pendingStrategies.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Nenhuma estratégia pendente</h2>
          <p className="text-muted-foreground">Todas as estratégias estão concluídas!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          <OverdueAlert strategies={pendingStrategies} />
          <p className="text-sm text-muted-foreground mb-4">{pendingStrategies.length} estratégia(s) em andamento</p>
          {pendingStrategies.map((s) => {
            const progress = calcProgress(s.categories);
            return (
              <Card
                key={s.id}
                className="p-5 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/estrategia/${s.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-semibold text-foreground text-lg truncate">
                        {s.store_name || "Sem nome"}
                      </h3>
                      {(() => {
                        const ds = deriveStrategyDisplayStatus(s);
                        const badgeProps = getStatusBadgeProps(ds);
                        return (
                          <Badge variant={badgeProps.variant} className={badgeProps.className + " text-[10px] shrink-0"}>
                            {getStatusLabel(ds)}
                          </Badge>
                        );
                      })()}
                    </div>
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
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/estrategia/${s.id}`); }}>
                    <Eye className="h-4 w-4 mr-1" /> Ver
                  </Button>
                </div>
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
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
