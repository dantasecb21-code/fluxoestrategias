import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ClipboardList, Eye, Clock, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import OverdueAlert from "@/components/OverdueAlert";
import { deriveStrategyDisplayStatus, getStatusLabel, getStatusBadgeProps } from "@/lib/strategyStatus";

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

export default function OperationalDashboard() {
  const navigate = useNavigate();
  const { strategies, loading } = useDbStrategies();
  const [showCompleted, setShowCompleted] = useState(false);

  const activeStrategies = [...strategies]
    .filter((s) => deriveStrategyDisplayStatus(s) !== "completed")
    .sort((a, b) => {
      const aReturned = deriveStrategyDisplayStatus(a) === "returned" ? 0 : 1;
      const bReturned = deriveStrategyDisplayStatus(b) === "returned" ? 0 : 1;
      if (aReturned !== bReturned) return aReturned - bReturned;
      const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return dateA - dateB;
    });

  const completedStrategies = strategies.filter((s) => deriveStrategyDisplayStatus(s) === "completed");

  const renderCard = (s: any, isCompleted = false) => {
    const progress = calcProgress(s.categories);
    const ds = deriveStrategyDisplayStatus(s);
    return (
      <Card
        key={s.id}
        className={`p-5 hover:border-primary/30 transition-colors cursor-pointer ${ds === "returned" ? "border-destructive/40 bg-destructive/5" : ""} ${isCompleted ? "border-success/30 bg-success/5" : ""}`}
        onClick={() => navigate(`/operacional/${s.id}`)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-semibold text-foreground text-lg truncate">
              {s.store_name || "Sem nome"}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Prazo: {s.deadline || "Não definido"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            {(() => {
              if (ds === "returned" || isCompleted) {
                const bp = getStatusBadgeProps(ds);
                return <Badge variant={bp.variant} className={`text-[10px] py-0 px-1.5 h-5 leading-none ${bp.className}`}>{getStatusLabel(ds)}</Badge>;
              }
              return null;
            })()}
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 mr-1" /> Ver estratégia
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium text-foreground">{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} className="h-2" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="text-success">{progress.completed} concluídos</span>
            <span className="text-primary">{progress.inProgress} em andamento</span>
            <span className="text-warning">{progress.pending} pendentes</span>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Painel <span className="text-primary">Operacional</span>
          </h1>
        </div>
        <p className="text-muted-foreground">Acompanhe e execute as estratégias atribuídas a você.</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : strategies.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Nenhuma estratégia atribuída</h2>
          <p className="text-muted-foreground">Aguarde o administrador atribuir estratégias a você.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active strategies */}
          <div className="space-y-4">
            <OverdueAlert strategies={activeStrategies} isOperational />
            {activeStrategies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma estratégia ativa no momento.</p>
            ) : (
              activeStrategies.map((s) => renderCard(s))
            )}
          </div>

          {/* Completed strategies - collapsible */}
          {completedStrategies.length > 0 && (
            <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 font-heading font-semibold text-lg text-foreground hover:text-primary transition-colors w-full text-left">
                  {showCompleted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Concluídas ({completedStrategies.length})
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {completedStrategies.map((s) => renderCard(s, true))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}
