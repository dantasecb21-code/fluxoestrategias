import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDbStrategies, DbStrategy } from "@/hooks/useDbStrategies";
import { useAuth } from "@/hooks/useAuth";
import { formatDateBR } from "@/lib/utils";
import { deriveStrategyDisplayStatus } from "@/lib/strategyStatus";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Clock, AlertCircle, ClipboardList, UserCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface UxCollaborator {
  user_id: string;
  display_name: string;
}

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function calcProgress(categories: any[]) {
  const allItems = categories.flatMap((c: any) => c.items || []);
  if (allItems.length === 0) return { percent: 0, completed: 0, total: 0 };
  const completed = allItems.filter((i: any) => i.status === "completed").length;
  return { percent: Math.round((completed / allItems.length) * 100), completed, total: allItems.length };
}

export default function UxComunicacao() {
  const { role, user } = useAuth();
  const { strategies, loading, assignUxCollaborator, completeUxStrategy } = useDbStrategies();
  const [collaborators, setCollaborators] = useState<UxCollaborator[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState<Record<string, boolean>>({});

  const isLeader = role === "ux_leader";
  const isAdmin = role === "admin";
  const isManagerView = isLeader || isAdmin;

  useEffect(() => {
    if (!isManagerView) return;
    async function fetchCollaborators() {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "ux_collaborator" as any);

      if (!roles || roles.length === 0) { setCollaborators([]); return; }

      const ids = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);

      setCollaborators(profiles || []);
    }
    fetchCollaborators();
  }, [isManagerView]);

  async function handleAssign(strategyId: string) {
    const collaboratorId = selections[strategyId];
    if (!collaboratorId) { toast.error("Selecione um colaborador"); return; }
    setAssigning((prev) => ({ ...prev, [strategyId]: true }));
    const ok = await assignUxCollaborator(strategyId, collaboratorId);
    setAssigning((prev) => ({ ...prev, [strategyId]: false }));
    if (ok) toast.success("Estratégia distribuída com sucesso");
    else toast.error("Erro ao distribuir estratégia");
  }

  async function handleComplete(strategyId: string) {
    if (!user) return;
    setCompleting((prev) => ({ ...prev, [strategyId]: true }));
    const ok = await completeUxStrategy(strategyId, user.id);
    setCompleting((prev) => ({ ...prev, [strategyId]: false }));
    if (ok) toast.success("Estratégia marcada como finalizada!");
    else toast.error("Erro ao finalizar estratégia");
  }

  // Leader / Admin view
  if (isManagerView) {
    const tomorrow = getTomorrow();
    const urgent = strategies.filter(
      (s) => s.deadline?.slice(0, 10) === tomorrow && deriveStrategyDisplayStatus(s) !== "completed"
    );
    const distributed = strategies.filter((s) => s.ux_assigned_to);
    const completedByUx = distributed.filter((s) => s.ux_completed_by);
    const inProgress = distributed.filter((s) => !s.ux_completed_by);

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
            {isAdmin ? "Visão geral do setor UX — distribuição e finalizações." : "Distribuição de estratégias urgentes para colaboradores UX."}
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {/* Urgent section — only leader distributes */}
            {isLeader && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <h2 className="font-heading font-semibold text-xl text-foreground">
                    Entrega Amanhã — Não Concluídas
                    <span className="ml-2 text-sm font-normal text-muted-foreground">({urgent.length})</span>
                  </h2>
                </div>
                {urgent.length === 0 ? (
                  <Card className="p-8 text-center border-dashed">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhuma estratégia com entrega amanhã.</p>
                  </Card>
                ) : (
                  urgent.map((s) => (
                    <UrgentCard
                      key={s.id}
                      strategy={s}
                      collaborators={collaborators}
                      selection={selections[s.id] || ""}
                      onSelect={(v) => setSelections((prev) => ({ ...prev, [s.id]: v }))}
                      onAssign={() => handleAssign(s.id)}
                      assigning={!!assigning[s.id]}
                    />
                  ))
                )}
              </div>
            )}

            {/* In Progress */}
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
                  const collab = collaborators.find((c) => c.user_id === s.ux_assigned_to);
                  const progress = calcProgress(s.categories);
                  return (
                    <Card key={s.id} className="p-4 border-primary/20 bg-primary/5">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-heading font-semibold text-foreground">{s.store_name || "Sem nome"}</h3>
                          <p className="text-xs text-muted-foreground">Gestor: {s.operational_manager || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-primary font-medium">
                            <UserCheck className="inline h-3 w-3 mr-1" />
                            {collab?.display_name || "Colaborador"}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                            <Clock className="h-3 w-3" /> {s.deadline ? formatDateBR(s.deadline) : "—"}
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
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <h2 className="font-heading font-semibold text-xl text-foreground">
                    Finalizadas pelo Setor UX
                    <span className="ml-2 text-sm font-normal text-muted-foreground">({completedByUx.length})</span>
                  </h2>
                </div>
                {completedByUx.map((s) => {
                  const collab = collaborators.find((c) => c.user_id === s.ux_completed_by);
                  const assignedCollab = collaborators.find((c) => c.user_id === s.ux_assigned_to);
                  const progress = calcProgress(s.categories);
                  return (
                    <Card key={s.id} className="p-4 border-success/30 bg-success/5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-heading font-semibold text-foreground">{s.store_name || "Sem nome"}</h3>
                          <p className="text-xs text-muted-foreground">Gestor: {s.operational_manager || "—"}</p>
                          {assignedCollab && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Atribuída a: {assignedCollab.display_name}
                            </p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className="bg-success/20 text-success border-success/30 text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Finalizado por {collab?.display_name || "UX"}
                          </Badge>
                          {s.ux_completed_at && (
                            <p className="text-xs text-muted-foreground">
                              {formatDateBR(s.ux_completed_at)}
                            </p>
                          )}
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

            {distributed.length === 0 && (
              <Card className="p-12 text-center border-dashed">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Nenhuma estratégia distribuída</h2>
                <p className="text-muted-foreground">Ainda não há estratégias atribuídas ao setor UX.</p>
              </Card>
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
            const isOverdue = s.deadline && new Date(s.deadline) < new Date();
            const isCompleted = !!s.ux_completed_by;
            return (
              <Card key={s.id} className={`p-5 ${isCompleted ? "border-success/30 bg-success/5" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-heading font-semibold text-foreground text-lg">{s.store_name || "Sem nome"}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Gestor Operacional: {s.operational_manager || "—"}</p>
                  </div>
                  <p className={`text-xs flex items-center gap-1 shrink-0 ml-3 ${isOverdue && !isCompleted ? "text-destructive" : "text-muted-foreground"}`}>
                    <Clock className="h-3 w-3" />
                    {s.deadline ? formatDateBR(s.deadline) : "Sem prazo"}
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
                  <Badge className="bg-success/20 text-success border-success/30 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Finalizado por você{s.ux_completed_at ? ` em ${formatDateBR(s.ux_completed_at)}` : ""}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-success/50 text-success hover:bg-success/10"
                    onClick={() => handleComplete(s.id)}
                    disabled={!!completing[s.id]}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {completing[s.id] ? "Salvando..." : "Marcar como Finalizado"}
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

function UrgentCard({
  strategy,
  collaborators,
  selection,
  onSelect,
  onAssign,
  assigning,
}: {
  strategy: DbStrategy;
  collaborators: UxCollaborator[];
  selection: string;
  onSelect: (v: string) => void;
  onAssign: () => void;
  assigning: boolean;
}) {
  const progress = calcProgress(strategy.categories);
  const alreadyAssigned = !!strategy.ux_assigned_to;
  const assignedCollab = collaborators.find((c) => c.user_id === strategy.ux_assigned_to);

  return (
    <Card className="p-5 border-destructive/30 bg-destructive/5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-heading font-semibold text-foreground text-lg">{strategy.store_name || "Sem nome"}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Gestor Operacional: {strategy.operational_manager || "—"}</p>
        </div>
        <p className="text-xs text-destructive flex items-center gap-1 shrink-0 ml-3">
          <Clock className="h-3 w-3" />
          {strategy.deadline ? formatDateBR(strategy.deadline) : "—"}
        </p>
      </div>

      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{progress.percent}%</span>
        </div>
        <Progress value={progress.percent} className="h-2" />
      </div>

      {alreadyAssigned ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-success flex items-center gap-1">
            <UserCheck className="h-3 w-3" /> Atribuído a: {assignedCollab?.display_name || "Colaborador"}
          </p>
          <Select value={selection} onValueChange={onSelect}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Reatribuir..." />
            </SelectTrigger>
            <SelectContent>
              {collaborators.map((c) => (
                <SelectItem key={c.user_id} value={c.user_id}>{c.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={onAssign} disabled={assigning || !selection} className="ml-2">
            {assigning ? "Salvando..." : "Reatribuir"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Select value={selection} onValueChange={onSelect}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder={collaborators.length === 0 ? "Nenhum colaborador cadastrado" : "Selecionar colaborador UX..."} />
            </SelectTrigger>
            <SelectContent>
              {collaborators.map((c) => (
                <SelectItem key={c.user_id} value={c.user_id}>{c.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={onAssign} disabled={assigning || !selection || collaborators.length === 0}>
            {assigning ? "Salvando..." : "Distribuir"}
          </Button>
        </div>
      )}
    </Card>
  );
}
