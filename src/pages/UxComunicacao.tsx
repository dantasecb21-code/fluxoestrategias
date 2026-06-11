import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDbStrategies, DbStrategy } from "@/hooks/useDbStrategies";
import { useAuth } from "@/hooks/useAuth";
import { formatDateBR } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Palette, Clock, AlertCircle, ClipboardList, UserCheck, CheckCircle2,
  Zap, Filter, AlertTriangle, PauseCircle, TrendingUp, Users,
} from "lucide-react";
import { toast } from "sonner";

const PLATFORM_LABEL: Record<string, { label: string; color: string }> = {
  "99food": { label: "99Food",  color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
  ifood:   { label: "iFood",   color: "bg-red-500/15 text-red-500 border-red-500/30" },
  keeta:   { label: "Keeta",   color: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
};
function PlatformBadge({ platform }: { platform: string }) {
  const cfg = PLATFORM_LABEL[platform];
  if (!cfg) return null;
  return (
    <Badge variant="outline" className={`text-xs shrink-0 font-medium ${cfg.color}`}>
      {cfg.label}
    </Badge>
  );
}

interface UxPerson {
  user_id: string;
  display_name: string;
}

type UxStatus = "todos" | "aguardando" | "andamento" | "concluida" | "atrasada" | "pausada";

function calcProgress(categories: any[]) {
  const allItems = categories.flatMap((c: any) => c.items || []);
  if (allItems.length === 0) return { percent: 0, completed: 0, total: 0 };
  const completed = allItems.filter((i: any) => i.status === "completed").length;
  return { percent: Math.round((completed / allItems.length) * 100), completed, total: allItems.length };
}

function isOverdue(deadline: string | null) {
  if (!deadline) return false;
  return new Date(deadline + "T23:59:59") < new Date();
}

function isUrgent(deadline: string | null) {
  if (!deadline) return false;
  const now = new Date();
  const dl = new Date(deadline + "T23:59:59");
  const diffDays = (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 1;
}

function getUxStatus(s: DbStrategy): Exclude<UxStatus, "todos"> {
  if (s.ux_completed_by) return "concluida";
  if (isOverdue(s.deadline) && !s.ux_completed_by) return "atrasada";
  if (s.ux_assigned_to) return "andamento";
  if (s.returned) return "pausada";
  return "aguardando";
}

const STATUS_CONFIG: Record<Exclude<UxStatus, "todos">, { label: string; color: string; icon: React.ReactNode }> = {
  aguardando: { label: "Aguardando", color: "border-destructive/30 bg-destructive/5", icon: <AlertCircle className="h-3 w-3" /> },
  andamento: { label: "Em Andamento", color: "border-primary/20 bg-primary/5", icon: <TrendingUp className="h-3 w-3" /> },
  concluida: { label: "Concluída", color: "border-success/30 bg-success/5", icon: <CheckCircle2 className="h-3 w-3" /> },
  atrasada: { label: "Atrasada", color: "border-destructive/30 bg-destructive/10", icon: <AlertTriangle className="h-3 w-3" /> },
  pausada: { label: "Pausada", color: "border-warning/30 bg-warning/5", icon: <PauseCircle className="h-3 w-3" /> },
};

export default function UxComunicacao() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const { strategies, loading, assignUxCollaborator, completeUxStrategy } = useDbStrategies();
  const [uxPeople, setUxPeople] = useState<UxPerson[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState<Record<string, boolean>>({});

  // Filters
  const [filterStatus, setFilterStatus] = useState<UxStatus>("todos");
  const [filterResponsavel, setFilterResponsavel] = useState<string>("todos");
  const [filterConcluiu, setFilterConcluiu] = useState<string>("todos");
  const [filterPlatform, setFilterPlatform] = useState<string>("todos");

  const isLeader = role === "ux_leader";
  const isAdmin = role === "admin";
  const isManagerView = isLeader || isAdmin;
  const canAssign = isLeader || isAdmin;

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

  // ── Manager / Admin view ──
  const uxStrategies = useMemo(() => {
    return strategies.filter(
      (s) =>
        (s.ux_completed_by || s.status !== "approved") &&
        (isUrgent(s.deadline) || s.ux_assigned_to || s.ux_completed_by || s.returned)
    );
  }, [strategies]);

  const filteredStrategies = useMemo(() => {
    return uxStrategies
      .filter((s) => filterStatus === "todos" || getUxStatus(s) === filterStatus)
      .filter((s) => filterResponsavel === "todos" || s.ux_assigned_to === filterResponsavel)
      .filter((s) => filterConcluiu === "todos" || s.ux_completed_by === filterConcluiu)
      .filter((s) => filterPlatform === "todos" || s.platform === filterPlatform);
  }, [uxStrategies, filterStatus, filterResponsavel, filterConcluiu, filterPlatform]);

  // Per-person stats
  const personStats = useMemo(() => {
    return uxPeople.map((p) => {
      const concluidas = uxStrategies.filter((s) => s.ux_completed_by === p.user_id).length;
      // "passed over manager": completed by person but never assigned by manager
      const semGestor = uxStrategies.filter(
        (s) => s.ux_completed_by === p.user_id && !s.ux_assigned_to
      ).length;
      const emAndamento = uxStrategies.filter(
        (s) => s.ux_assigned_to === p.user_id && !s.ux_completed_by
      ).length;
      return { ...p, concluidas, semGestor, emAndamento };
    }).filter((p) => p.concluidas > 0 || p.emAndamento > 0);
  }, [uxPeople, uxStrategies]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: uxStrategies.length };
    for (const s of uxStrategies) {
      const st = getUxStatus(s);
      counts[st] = (counts[st] || 0) + 1;
    }
    return counts;
  }, [uxStrategies]);

  if (isManagerView) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Palette className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-heading font-bold text-3xl text-foreground">
              Setor <span className="text-primary">UX (Comunicação)</span>
            </h1>
          </div>
          <p className="text-muted-foreground ml-13">
            Visão completa do time UX — distribuição, andamento e conclusões.
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {/* Per-person stats */}
            {personStats.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Resumo por Colaborador
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {personStats.map((p) => (
                    <Card key={p.user_id} className="p-4 space-y-2">
                      <p className="font-heading font-semibold text-foreground text-sm">{p.display_name}</p>
                      <div className="flex gap-4 text-xs">
                        <span className="text-muted-foreground">
                          Em andamento: <span className="font-semibold text-primary">{p.emAndamento}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Concluídas: <span className="font-semibold text-success">{p.concluidas}</span>
                        </span>
                      </div>
                      {p.semGestor > 0 && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs font-medium">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {p.semGestor} sem atribuição do gestor
                        </Badge>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Filter bar */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Filtros</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {/* Status filter */}
                <div className="flex-1 min-w-[160px]">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as UxStatus)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos ({statusCounts.todos || 0})</SelectItem>
                      <SelectItem value="aguardando">Aguardando ({statusCounts.aguardando || 0})</SelectItem>
                      <SelectItem value="andamento">Em Andamento ({statusCounts.andamento || 0})</SelectItem>
                      <SelectItem value="concluida">Concluída ({statusCounts.concluida || 0})</SelectItem>
                      <SelectItem value="atrasada">Atrasada ({statusCounts.atrasada || 0})</SelectItem>
                      <SelectItem value="pausada">Pausada ({statusCounts.pausada || 0})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Responsável UX filter */}
                <div className="flex-1 min-w-[160px]">
                  <p className="text-xs text-muted-foreground mb-1">Responsável UX</p>
                  <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {uxPeople.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>{p.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quem concluiu filter */}
                <div className="flex-1 min-w-[160px]">
                  <p className="text-xs text-muted-foreground mb-1">Quem Concluiu</p>
                  <Select value={filterConcluiu} onValueChange={setFilterConcluiu}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {uxPeople.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>{p.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Platform filter */}
                <div className="flex-1 min-w-[160px]">
                  <p className="text-xs text-muted-foreground mb-1">Plataforma</p>
                  <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      <SelectItem value="99food">99Food</SelectItem>
                      <SelectItem value="ifood">iFood</SelectItem>
                      <SelectItem value="keeta">Keeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reset */}
                {(filterStatus !== "todos" || filterResponsavel !== "todos" || filterConcluiu !== "todos" || filterPlatform !== "todos") && (
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground"
                      onClick={() => { setFilterStatus("todos"); setFilterResponsavel("todos"); setFilterConcluiu("todos"); setFilterPlatform("todos"); }}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Unified strategy list */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Exibindo <span className="font-semibold text-foreground">{filteredStrategies.length}</span> estratégia(s)
              </p>

              {filteredStrategies.length === 0 ? (
                <Card className="p-10 text-center border-dashed">
                  <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma estratégia encontrada com os filtros selecionados.</p>
                </Card>
              ) : (
                filteredStrategies.map((s) => {
                  const uxStatus = getUxStatus(s);
                  const cfg = STATUS_CONFIG[uxStatus];
                  const assignedPerson = uxPeople.find((p) => p.user_id === s.ux_assigned_to);
                  const completedPerson = uxPeople.find((p) => p.user_id === s.ux_completed_by);
                  const progress = calcProgress(s.categories);
                  const overdue = isOverdue(s.deadline);
                  const bypassedManager = s.ux_completed_by && !s.ux_assigned_to;

                  return (
                    <Card key={s.id} className={`p-4 ${cfg.color}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h3 className="font-heading font-semibold text-foreground">{s.store_name || "Sem nome"}</h3>
                            <PlatformBadge platform={s.platform} />
                            <Badge
                              variant="outline"
                              className={`text-xs shrink-0 ${
                                uxStatus === "concluida" ? "border-success/30 text-success bg-success/10" :
                                uxStatus === "atrasada" ? "border-destructive/30 text-destructive bg-destructive/10" :
                                uxStatus === "andamento" ? "border-primary/30 text-primary bg-primary/10" :
                                uxStatus === "pausada" ? "border-warning/30 text-warning bg-warning/10" :
                                "border-muted-foreground/30 text-muted-foreground"
                              }`}
                            >
                              {cfg.icon}
                              <span className="ml-1">{cfg.label}</span>
                            </Badge>
                            {bypassedManager && (
                              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs shrink-0">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Sem atribuição do gestor
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Gestor operacional: {s.operational_manager || "—"}</p>
                        </div>

                        <div className="text-right shrink-0 space-y-1">
                          {assignedPerson && (
                            <p className="text-xs text-primary font-medium flex items-center gap-1 justify-end">
                              <UserCheck className="h-3 w-3" />
                              {assignedPerson.display_name}
                            </p>
                          )}
                          {completedPerson && uxStatus === "concluida" && (
                            <p className="text-xs text-success font-medium flex items-center gap-1 justify-end">
                              <Zap className="h-3 w-3" />
                              Concluiu: {completedPerson.display_name}
                            </p>
                          )}
                          <p className={`text-xs flex items-center gap-1 justify-end ${overdue && uxStatus !== "concluida" ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            <Clock className="h-3 w-3" />
                            {s.deadline ? formatDateBR(s.deadline) : "Sem prazo"}
                          </p>
                          {s.ux_completed_at && (
                            <p className="text-xs text-muted-foreground">
                              Concluído em {formatDateBR(s.ux_completed_at)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progresso geral</span>
                          <span className="font-medium">{progress.percent}% ({progress.completed}/{progress.total})</span>
                        </div>
                        <Progress value={progress.percent} className="h-1.5" />
                      </div>

                      {/* Distribute action — shown for aguardando or already assigned */}
                      {canAssign && uxStatus !== "concluida" && (
                        <div className="flex items-center gap-2">
                          {assignedPerson && (
                            <p className="text-xs text-success flex items-center gap-1 mr-2 shrink-0">
                              <UserCheck className="h-3 w-3" /> {assignedPerson.display_name}
                            </p>
                          )}
                          <Select
                            value={selections[s.id] || ""}
                            onValueChange={(v) => setSelections((prev) => ({ ...prev, [s.id]: v }))}
                          >
                            <SelectTrigger className="flex-1 h-8 text-xs">
                              <SelectValue
                                placeholder={
                                  uxPeople.length === 0
                                    ? "Nenhum membro UX"
                                    : assignedPerson
                                    ? "Reatribuir..."
                                    : "Quem vai executar?"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {uxPeople.map((p) => (
                                <SelectItem key={p.user_id} value={p.user_id}>{p.display_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={() => handleAssign(s.id)}
                            disabled={!!assigning[s.id] || !selections[s.id] || uxPeople.length === 0}
                          >
                            {assigning[s.id] ? "Salvando..." : assignedPerson ? "Reatribuir" : "Distribuir"}
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Collaborator view ──
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
          {strategies
            .filter((s) => !(s.status === "approved" && !s.ux_completed_by))
            .map((s) => {
            const progress = calcProgress(s.categories);
            const overdueFlag = isOverdue(s.deadline);
            const isCompleted = !!s.ux_completed_by;
            return (
              <Card key={s.id} onClick={() => navigate(`/operacional/${s.id}`)} className={`p-5 cursor-pointer hover:shadow-md transition-shadow ${isCompleted ? "border-success/30 bg-success/5" : overdueFlag ? "border-destructive/30 bg-destructive/5" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="font-heading font-semibold text-foreground text-lg">{s.store_name || "Sem nome"}</h3>
                      <PlatformBadge platform={s.platform} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Gestor Operacional: {s.operational_manager || "—"}</p>
                  </div>
                  <p className={`text-xs flex items-center gap-1 shrink-0 ml-3 ${overdueFlag && !isCompleted ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    <Clock className="h-3 w-3" />
                    {s.deadline ? formatDateBR(s.deadline) : "Sem prazo"}
                    {overdueFlag && !isCompleted && " · Atrasada"}
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
