import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDbStrategies, DbStrategy } from "@/hooks/useDbStrategies";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Copy, Pencil, Trash2, FileText, Zap, Clock, UserCheck, Undo2, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDateBR, shortName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { deriveStrategyDisplayStatus, getStatusLabel, getStatusBadgeProps } from "@/lib/strategyStatus";
import { toast } from "sonner";

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
  const { strategies, loading, deleteStrategy, duplicateStrategy, restoreStrategy, fetchDeletedStrategies } = useDbStrategies();
  const [showTrash, setShowTrash] = useState(false);
  const [deletedStrategies, setDeletedStrategies] = useState<DbStrategy[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const activeStrategies = strategies.filter((s) => deriveStrategyDisplayStatus(s) !== "completed");
  const completedStrategies = strategies.filter((s) => deriveStrategyDisplayStatus(s) === "completed");

  const toggleTrash = async () => {
    if (!showTrash) {
      setLoadingTrash(true);
      const deleted = await fetchDeletedStrategies();
      setDeletedStrategies(deleted);
      setLoadingTrash(false);
    }
    setShowTrash(!showTrash);
  };

  const handleRestore = async (id: string) => {
    await restoreStrategy(id);
    setDeletedStrategies((prev) => prev.filter((s) => s.id !== id));
    toast.success("Estratégia restaurada!");
  };

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
        <div className="space-y-6">
          {/* Active strategies */}
          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Estratégias ({activeStrategies.length})
            </h2>
            {activeStrategies.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-1">Nenhuma estratégia ativa no momento.</p>
            ) : (
              activeStrategies.map((s) => renderStrategyCard(s))
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
                {completedStrategies.map((s) => renderStrategyCard(s))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {/* Lixeira */}
      <div className="mt-8">
        <Button variant="ghost" onClick={toggleTrash} className="text-muted-foreground hover:text-foreground gap-2">
          {showTrash ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Trash2 className="h-4 w-4" />
          Lixeira
        </Button>

        {showTrash && (
          <div className="mt-3 space-y-2">
            {loadingTrash ? (
              <p className="text-sm text-muted-foreground pl-4">Carregando...</p>
            ) : deletedStrategies.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-4">Nenhuma estratégia na lixeira.</p>
            ) : (
              deletedStrategies.map((s) => (
                <Card key={s.id} className="p-4 border-dashed opacity-70">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">{s.store_name || "Sem nome"}</h4>
                      <p className="text-xs text-muted-foreground">
                        Excluída em {s.deleted_at ? new Date(s.deleted_at).toLocaleDateString("pt-BR") : "—"}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleRestore(s.id)} className="gap-1.5">
                      <Undo2 className="h-3.5 w-3.5" /> Restaurar
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
