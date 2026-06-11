import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDbStrategies, DbStrategy } from "@/hooks/useDbStrategies";
import { useAuth } from "@/hooks/useAuth";
import { formatDateBR } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Clock, AlertCircle, ClipboardList, UserCheck, CheckCircle2, Zap } from "lucide-react";
import { toast } from "sonner";

interface UxPerson {
  user_id: string;
  display_name: string;
}

function calcProgress(categories: any[]) {
  const allItems = categories.flatMap((c: any) => c.items || []);
  if (allItems.length === 0) return { percent: 0, completed: 0, total: 0 };
  const completed = allItems.filter((i: any) => i.status === "completed").length;
  return { percent: Math.round((completed / allItems.length) * 100), completed, total: allItems.length };
}

function isUrgent(deadline: string | null) {
  if (!deadline) return false;
  const now = new Date();
  const dl = new Date(deadline + "T23:59:59");
  const diffDays = (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 1; // overdue OR due within 1 day
}

export default function UxComunicacao() {
  const { role, user } = useAuth();
  const { strategies, loading, assignUxCollaborator, completeUxStrategy } = useDbStrategies();
  const [uxPeople, setUxPeople] = useState<UxPerson[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState<Record<string, boolean>>({});

  const isLeader = role === "ux_leader";
  const isAdmin = role === "admin";
  const isManagerView = isLeader || isAdmin;

  // Fetch UX people (collaborators + leader themselves for self-assignment)
  useEffect(() => {
    if (!isManagerView) return;
    async function fetchUxPeople() {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["ux_collaborator", "ux_leader"] as any);

      if (!roles || roles.length === 0) { setUxPeople([]); return; }

      const ids = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);

      setUxPeople(profiles || []);
    }
    fetchUxPeople();
  }, [isManagerView]);

  async function handleAssign(strategyId: string) {
    const personId = selections[strategyId];
    if (!personId) { toast.error("Selecione quem vai executar"); return; }
    setAssigning((prev) => ({ ...prev, [strategyId]: true }));
    const ok = await assignUxCollaborator(strategyId, personId);
    setAssigning((prev) => ({ ...prev, [strategyId]: false }));
    if (ok) toast.success("Estratégia distribuída com sucesso");
    else toast.error("Erro ao distribuir estratégia");
  }

  async function handleComplete(strategyId: string) {
    if (!user) return;
    setCompleting((prev) => ({ ...prev, [strategyId]: true }));
    const ok = await completeUxStrategy(strategyId, user.id);
    setCompleting((prev) => ({ ...prev, [strategyId]: false }));
    if (ok) toast.success("Estratégia concluída pelo Setor UX!");
    else toast.error("Erro ao concluir estratégia");
  }

  // Leader / Admin view
  if (isManagerView) {
    // Strategies that need UX attention: overdue OR ≤1 day left, not yet approved
    const needsUx = strategies.filter(
      (s) => isUrgent(s.deadline) && s.status !== "approved"
    );
    // Not yet assigned to UX
    const toDistribute = needsUx.filter((s) => !s.ux_assigned_to);
    // Assigned, in progress
    const inProgress = strategies.filter((s) => s.ux_assigned_to && !s.ux_completed_by);
    // Completed by UX
    const completedByUx = strategies.filter((s) => !!s.ux_completed_by);

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Palette className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-heading font-bold text-3xl text-foreground">
              Setor <span className="text-primary">UX (Comunicação)</span>
            </h1>
          </div>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Visão geral do setor UX — atrasadas, em andamento e concluídas."
              : "Estratégias urgentes para distribuição ao time UX."}
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {/* To distribute */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <h2 className="font-heading font-semibold text-xl text-foreground">
                  Aguardando Distribuição
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({toDistribute.length})</span>
                </h2>
              </div>

              {toDistribute.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma estratégia aguardando distribuição.</p>
                </Card>
              ) : (
                toDistribute.map((s) => (
                  <DistributeCard
                    key={s.id}
                    strategy={s}
                    uxPeople={uxPeople}
                    selection={selections[s.id] || ""}
                    onSelect={(v) => setSelections((prev) => ({ ...prev, [s.id]: v }))}
                    onAssign={() => handleAssign(s.id)}
                    assigning={!!assigning[s.id]}
                    canAssign={isLeader}
                  />
                ))
              )}
            </div>

            {/* In progress */}
            {inProgress.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <h2 className="font-heading font-semibold text-xl text-foreground">
                    Em Andamento
                    <span className="ml-2 text-sm font-normal text-muted-foreground">({inProgress.length})</span>
                  </h2>
                </div>
                {inProgress.map((s) => {
                  const person = uxPeople.find((p) => p.user_id === s.ux_assigned_to);
                  const progress = calcProgress(s.categories);
                  const overdue = s.deadline && new Date(s.deadline + "T23:59:59") < new Date();
                  return (
                    <Card key={s.id} className="p-4 border-primary/20 bg-primary/5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-heading font-semibold text-foreground">{s.store_name || "Sem nome"}</h3>
                          <p className="text-xs text-muted-foreground">Gestor: {s.operational_manager || "—"}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-xs text-primary font-medium flex items-center gap-1 justify-end">
                            <UserCheck className="h-3 w-3" />
                            {person?.display_name || "UX"}
                          </p>
                          <p className={`text-xs flex items-center gap-1 justify-end ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            <Clock className="h-3 w-3" />
                            {s.deadline ? formatDateBR(s.deadline) : "—"}
                            {overdue && " · Atrasada"}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium">{progress.percent}%</span>
                        </div>
                        <Progress value={progress.percent} className="h-1.5" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Completed by UX */}
            {completedByUx.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-success" />
                  <h2 className="font-heading font-semibold text-xl text-foreground">
                    Concluídas pelo Setor UX
                    <span className="ml-2 text-sm font-normal text-muted-foreground">({completedByUx.length})</span>
                  </h2>
                </div>
                {completedByUx.map((s) => {
                  const person = uxPeople.find((p) => p.user_id === s.ux_completed_by);
                  const assignedPerson = uxPeople.find((p) => p.user_id === s.ux_assigned_to);
                  const progress = calcProgress(s.categories);
                  return (
                    <Card key={s.id} className="p-4 border-success/30 bg-success/5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-heading font-semibold text-foreground">{s.store_name || "Sem nome"}</h3>
                          <p className="text-xs text-muted-foreground">Gestor: {s.operational_manager || "—"}</p>
                          {assignedPerson && assignedPerson.user_id !== s.ux_completed_by && (
                            <p className="text-xs text-muted-foreground">Atribuída a: {assignedPerson.display_name}</p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className="bg-success/20 text-success border-success/30 text-xs font-semibold">
                            <Zap className="h-3 w-3 mr-1" />
                            Finalizado por {person?.display_name || "UX"}
                          </Badge>
                          {s.ux_completed_at && (
                            <p className="text-xs text-muted-foreground">{formatDateBR(s.ux_completed_at)}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progresso no momento da conclusão</span>
                          <span className="font-medium">{progress.percent}%</span>
                        </div>
                        <Progress value={progress.percent} className="h-1.5" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Collaborator view
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Palette className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Minhas <span className="text-primary">Tarefas UX</span>
          </h1>
        </div>
        <p className="text-muted-foreground">Estratégias atribuídas a você para suporte ao gestor operacional.</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : strategies.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Nenhuma tarefa atribuída</h2>
          <p className="text-muted-foreground">O líder UX ainda não distribuiu nenhuma estratégia para você.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {strategies.map((s) => {
            const progress = calcProgress(s.categories);
            const isOverdue = s.deadline && new Date(s.deadline + "T23:59:59") < new Date();
            const isCompleted = !!s.ux_completed_by;
            return (
              <Card key={s.id} className={`p-5 ${isCompleted ? "border-success/30 bg-success/5" : isOverdue ? "border-destructive/30 bg-destructive/5" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-heading font-semibold text-foreground text-lg">{s.store_name || "Sem nome"}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Gestor Operacional: {s.operational_manager || "—"}</p>
                  </div>
                  <p className={`text-xs flex items-center gap-1 shrink-0 ml-3 ${isOverdue && !isCompleted ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    <Clock className="h-3 w-3" />
                    {s.deadline ? formatDateBR(s.deadline) : "Sem prazo"}
                    {isOverdue && !isCompleted && " · Atrasada"}
                  </p>
                </div>

                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{progress.percent}% ({progress.completed}/{progress.total})</span>
                  </div>
                  <Progress value={progress.percent} className="h-2" />
                </div>

                {isCompleted ? (
                  <Badge className="bg-success/20 text-success border-success/30 text-xs font-medium">
                    <Zap className="h-3 w-3 mr-1" />
                    Concluída pelo Setor UX{s.ux_completed_at ? ` — ${formatDateBR(s.ux_completed_at)}` : ""}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90 text-white"
                    onClick={() => handleComplete(s.id)}
                    disabled={!!completing[s.id]}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {completing[s.id] ? "Concluindo..." : "Concluir pelo Setor UX"}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DistributeCard({
  strategy,
  uxPeople,
  selection,
  onSelect,
  onAssign,
  assigning,
  canAssign,
}: {
  strategy: DbStrategy;
  uxPeople: UxPerson[];
  selection: string;
  onSelect: (v: string) => void;
  onAssign: () => void;
  assigning: boolean;
  canAssign: boolean;
}) {
  const progress = calcProgress(strategy.categories);
  const alreadyAssigned = !!strategy.ux_assigned_to;
  const assignedPerson = uxPeople.find((p) => p.user_id === strategy.ux_assigned_to);
  const overdue = strategy.deadline && new Date(strategy.deadline + "T23:59:59") < new Date();

  return (
    <Card className="p-5 border-destructive/30 bg-destructive/5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-heading font-semibold text-foreground text-lg">{strategy.store_name || "Sem nome"}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Gestor: {strategy.operational_manager || "—"}</p>
        </div>
        <p className={`text-xs flex items-center gap-1 shrink-0 ml-3 font-medium ${overdue ? "text-destructive" : "text-warning"}`}>
          <Clock className="h-3 w-3" />
          {strategy.deadline ? formatDateBR(strategy.deadline) : "—"}
          {overdue ? " · Atrasada" : " · Vence amanhã"}
        </p>
      </div>

      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{progress.percent}%</span>
        </div>
        <Progress value={progress.percent} className="h-2" />
      </div>

      {canAssign && (
        <div className="flex items-center gap-2">
          {alreadyAssigned && (
            <p className="text-xs text-success flex items-center gap-1 mr-2 shrink-0">
              <UserCheck className="h-3 w-3" /> {assignedPerson?.display_name || "UX"}
            </p>
          )}
          <Select value={selection} onValueChange={onSelect}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder={uxPeople.length === 0 ? "Nenhum membro UX cadastrado" : alreadyAssigned ? "Reatribuir..." : "Quem vai executar?"} />
            </SelectTrigger>
            <SelectContent>
              {uxPeople.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>{p.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={onAssign} disabled={assigning || !selection || uxPeople.length === 0}>
            {assigning ? "Salvando..." : alreadyAssigned ? "Reatribuir" : "Distribuir"}
          </Button>
        </div>
      )}

      {!canAssign && alreadyAssigned && (
        <p className="text-xs text-primary flex items-center gap-1">
          <UserCheck className="h-3 w-3" /> Atribuída a: {assignedPerson?.display_name || "UX"}
        </p>
      )}
    </Card>
  );
}
