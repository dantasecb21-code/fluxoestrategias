import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { shortName } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Store, Plus, User, ArrowRight, Pencil, Trash2, Clock, CheckCircle2, Flame, ChevronDown, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { PlatformBadge, PLATFORM_OPTIONS, PLATFORM_LABELS } from "@/components/PlatformBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BaseRequest {
  id: string;
  created_by: string;
  assigned_to: string;
  store_name: string;
  operational_manager: string;
  platform: string;
  observation: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface StrategicUser { user_id: string; display_name: string; }
interface OperationalUser { user_id: string; display_name: string; }

const COMPETITION_STUDY_OPTIONS = [
  { value: "all", label: "Todos os estudos" },
  { value: "yes", label: "Com estudo" },
  { value: "no", label: "Sem estudo" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/20 text-warning border-warning/30",
  in_progress: "bg-primary/20 text-primary border-primary/30",
  completed: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
};
const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};
const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/20 text-destructive border-destructive/40",
  medium: "bg-warning/20 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function BaseStrategyRequests() {
  const { user, role, displayName } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const isAssistant = role === "strategic_assistant";
  const isStrategic = role === "strategic";

  const [requests, setRequests] = useState<BaseRequest[]>([]);
  const [strategicUsers, setStrategicUsers] = useState<StrategicUser[]>([]);
  const [operationalUsers, setOperationalUsers] = useState<OperationalUser[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [storeName, setStoreName] = useState("");
  const [operationalManager, setOperationalManager] = useState("");
  const [platform, setPlatform] = useState("99food");
  const [priority, setPriority] = useState("medium");
  const [observation, setObservation] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [competitionFilter, setCompetitionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [studies, setStudies] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    const [reqRes, studiesRes] = await Promise.all([
      supabase.from("base_strategy_requests" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("competitor_studies" as any).select("store_name, platform, status")
    ]);

    const rows = (reqRes.data as unknown as BaseRequest[]) ?? [];
    setRequests(rows);
    setStudies(studiesRes.data || []);

    const userIds = [...new Set([
      ...rows.map((r) => r.assigned_to),
      ...rows.map((r) => r.created_by),
    ].filter(Boolean))];
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      setCreatorNames(Object.fromEntries((profs ?? []).map((p) => [p.user_id, p.display_name])));
    }
    setLoading(false);
  }, []);

  const fetchStrategicUsers = useCallback(async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "strategic");
    const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
    if (!ids.length) return setStrategicUsers([]);
    const { data: profs } = await supabase
      .from("profiles").select("user_id, display_name")
      .in("user_id", ids).eq("approved", true)
      .order("display_name", { ascending: true });
    setStrategicUsers((profs ?? []) as StrategicUser[]);
  }, []);

  const fetchOperationalUsers = useCallback(async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "operational");
    const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
    if (!ids.length) return setOperationalUsers([]);
    const { data: profs } = await supabase
      .from("profiles").select("user_id, display_name")
      .in("user_id", ids).eq("approved", true)
      .order("display_name", { ascending: true });
    setOperationalUsers((profs ?? []) as OperationalUser[]);
  }, []);

  useEffect(() => {
    fetchAll();
    if (isAssistant || isAdmin) {
      fetchStrategicUsers();
      fetchOperationalUsers();
    }
  }, [fetchAll, fetchStrategicUsers, fetchOperationalUsers, isAssistant, isAdmin]);

  const resetForm = () => {
    setStoreName(""); setOperationalManager(""); setPlatform("99food");
    setPriority("medium"); setObservation(""); setAssignedTo("");
    setEditingId(null);
  };

  const openEdit = (r: BaseRequest) => {
    setStoreName(r.store_name);
    setOperationalManager(r.operational_manager);
    setPlatform(r.platform || "99food");
    setPriority(r.priority || "medium");
    setObservation(r.observation || "");
    setAssignedTo(r.assigned_to);
    setEditingId(r.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!storeName.trim() || !assignedTo) {
      toast.error("Informe o nome da loja e o estrategista.");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    const payload: any = {
      store_name: storeName.trim(),
      operational_manager: operationalManager.trim(),
      platform,
      priority,
      observation: observation.trim(),
      assigned_to: assignedTo,
    };
    if (editingId) {
      const { error } = await supabase.from("base_strategy_requests" as any).update(payload).eq("id", editingId);
      if (error) toast.error("Erro ao atualizar solicitação.");
      else { toast.success("Solicitação atualizada!"); resetForm(); setDialogOpen(false); fetchAll(); }
    } else {
      const { error } = await supabase.from("base_strategy_requests" as any).insert({ ...payload, created_by: user.id });
      if (error) toast.error("Erro ao criar solicitação.");
      else { toast.success("Solicitação enviada!"); resetForm(); setDialogOpen(false); fetchAll(); }
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("base_strategy_requests" as any).delete().eq("id", id);
    if (error) toast.error("Erro ao excluir.");
    else { toast.success("Solicitação excluída."); fetchAll(); }
  };

  const markCompleted = async (id: string) => {
    const { error } = await supabase.from("base_strategy_requests" as any).update({ status: "completed" }).eq("id", id);
    if (error) toast.error("Erro ao concluir.");
    else { toast.success("Concluída!"); fetchAll(); }
  };

  const startStrategy = async (r: BaseRequest) => {
    if (r.status === "pending") {
      await supabase.from("base_strategy_requests" as any).update({ status: "in_progress" }).eq("id", r.id);
    }
    const params = new URLSearchParams();
    params.set("store", r.store_name);
    params.set("operational_manager", r.operational_manager || "");
    params.set("platform", r.platform || "99food");
    params.set("study_requested", "true");
    navigate(`/nova?${params.toString()}`);
  };

  const nameOf = (id: string) => {
    const n = creatorNames[id];
    return n ? shortName(n) : "—";
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            Solicitações da Base
          </h1>
          <p className="text-sm text-muted-foreground">
            Pedidos de estratégia para lojas já existentes na base.
          </p>
        </div>
        {(isAssistant || isAdmin) && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Nova solicitação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar solicitação" : "Nova solicitação da base"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome da loja *</Label>
                  <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ex: Loja Central" />
                </div>
                <div>
                  <Label>Gestor operacional</Label>
                  <Select value={operationalManager} onValueChange={setOperationalManager}>
                    <SelectTrigger><SelectValue placeholder="Selecione o gestor" /></SelectTrigger>
                    <SelectContent>
                      {operationalUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.display_name}>{u.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Plataforma</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="low">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Estrategista responsável *</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {strategicUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>{u.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observação</Label>
                  <Textarea value={observation} onChange={(e) => setObservation(e.target.value)} rows={4} />
                </div>
                <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                  {submitting ? "Salvando..." : editingId ? "Atualizar" : "Enviar solicitação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar loja ou gestor..."
            className="h-9 pl-9 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); if (v === "completed") setShowCompleted(true); }}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="completed">Concluída</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as plataformas</SelectItem>
            {PLATFORM_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="Estudo de concorrência" />
          </SelectTrigger>
          <SelectContent>
            {COMPETITION_STUDY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter !== "all" || platformFilter !== "all" || competitionFilter !== "all" || searchQuery.trim()) && (
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setStatusFilter("all"); setPlatformFilter("all"); setCompetitionFilter("all"); setSearchQuery(""); }}>
            Limpar filtros
          </Button>
        )}
      </div>

      {(() => {
        const filtered = requests
          .filter((r) => platformFilter === "all" || r.platform === platformFilter)
          .filter((r) => statusFilter === "all" || r.status === statusFilter)
          .filter((r) => {
            if (competitionFilter === "all") return true;
            const hasStudy = studies.some(s =>
              s.store_name?.toLowerCase().trim() === r.store_name?.toLowerCase().trim() &&
              s.platform === r.platform
            ) || r.observation?.toLowerCase().includes("estudo de concorrência");
            return competitionFilter === "yes" ? hasStudy : !hasStudy;
          })
          .filter((r) => {
            const q = searchQuery.trim().toLowerCase();
            if (!q) return true;
            return [r.store_name, r.operational_manager, r.observation, nameOf(r.assigned_to), nameOf(r.created_by)]
              .join(" ").toLowerCase().includes(q);
          });

        if (requests.length === 0) {
          return (
            <Card className="p-10 text-center text-muted-foreground">
              Nenhuma solicitação por aqui ainda.
            </Card>
          );
        }

        if (filtered.length === 0) {
          return (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhuma solicitação encontrada com os filtros selecionados.
            </Card>
          );
        }

        const active = filtered.filter((r) => r.status !== "completed");
        const completed = filtered.filter((r) => r.status === "completed")
          .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

        const renderCard = (r: BaseRequest) => {
          const canStart = isStrategic && r.assigned_to === user?.id && r.status !== "completed";
          return (
            <Card key={r.id} className={`p-4 space-y-3 ${canStart ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}`}
              onClick={() => canStart && startStrategy(r)}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-semibold text-foreground text-lg flex items-center gap-2 flex-wrap">
                    {r.store_name}
                    <PlatformBadge platform={r.platform || "99food"} />
                    <Badge className={PRIORITY_COLORS[r.priority] || ""}>
                      <Flame className="h-3 w-3 mr-1" /> {PRIORITY_LABELS[r.priority] || r.priority}
                    </Badge>
                  </h3>
                  {r.operational_manager && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> Gestor: {r.operational_manager}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[r.status] || ""}>{STATUS_LABELS[r.status] || r.status}</Badge>
                  {canStart && <ArrowRight className="h-4 w-4 text-primary" />}
                </div>
              </div>

              {r.observation && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded whitespace-pre-wrap">{r.observation}</p>
              )}

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Criado em {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                <span>Solicitado por: {nameOf(r.created_by)}</span>
                {(isAdmin || isAssistant) && <span>Estrategista: {nameOf(r.assigned_to)}</span>}
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {canStart && (
                  <Button size="sm" onClick={() => startStrategy(r)}>
                    Iniciar estratégia <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
                {isStrategic && r.assigned_to === user?.id && r.status === "in_progress" && (
                  <Button size="sm" variant="outline" onClick={() => markCompleted(r.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Marcar como concluída
                  </Button>
                )}
                {((isAssistant && r.created_by === user?.id) || isAdmin) && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir solicitação?</AlertDialogTitle>
                          <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(r.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </Card>
          );
        };

        return (
          <div className="space-y-6">
            {/* Active requests */}
            {active.length > 0 && (
              <div className="space-y-3">
                {active.map(renderCard)}
              </div>
            )}

            {/* Completed — collapsed by default */}
            {completed.length > 0 && (
              <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-left hover:bg-muted/60 transition-colors">
                  {showCompleted ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-foreground">Concluídas</span>
                  <Badge variant="outline" className="ml-1 text-xs">{completed.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="grid gap-2">
                    {completed.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 hover:bg-accent/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                              {r.store_name}
                              <PlatformBadge platform={r.platform || "99food"} />
                            </p>
                            {r.operational_manager && (
                              <p className="text-xs text-muted-foreground truncate">Gestor: {r.operational_manager}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(r.updated_at || r.created_at), "dd/MM/yyyy")}
                          </span>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir solicitação?</AlertDialogTitle>
                                  <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(r.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        );
      })()}
    </div>
  );
}