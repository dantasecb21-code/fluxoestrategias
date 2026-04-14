import { useCallback, useEffect, useState, useMemo } from "react";
import { shortName } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Store, Plus, Clock, CheckCircle2, User, ArrowRight, Pencil, Trash2, Sparkles, Loader2, Hammer, Filter, ChevronDown, ChevronRight, Globe } from "lucide-react";
import { toast } from "sonner";
import { PlatformBadge, PLATFORM_LABELS, PLATFORM_OPTIONS, Platform } from "@/components/PlatformBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StoreRequest {
  id: string;
  store_name: string;
  client_name: string;
  store_creation_status: string;
  platform_access_confirmed: boolean;
  meeting_date: string;
  observation: string;
  assigned_to: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  platform: string;
}

interface StrategicUser {
  user_id: string;
  display_name: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  pending: "bg-warning",
  in_progress: "bg-primary",
  completed: "bg-emerald-500",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/20 text-warning border-warning/30",
  in_progress: "bg-primary/20 text-primary border-primary/30",
  completed: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
};

const CREATION_STATUS_LABELS: Record<string, string> = {
  pending: "Loja a criar",
  in_progress: "Criação em andamento",
  created: "Loja criada",
};

export default function StoreRequests() {
  const { user, role, displayName, platforms } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const isStrategicUser = role === "strategic";
  const [requests, setRequests] = useState<StoreRequest[]>([]);
  const [strategicUsers, setStrategicUsers] = useState<StrategicUser[]>([]);
  const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [storeName, setStoreName] = useState("");
  const [clientName, setClientName] = useState("");
  const [storeCreationStatus, setStoreCreationStatus] = useState("pending");
  const [platformAccess, setPlatformAccess] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [observation, setObservation] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [editStatus, setEditStatus] = useState("pending");
  const [submitting, setSubmitting] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCreation, setFilterCreation] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [platformField, setPlatformField] = useState<string>("99food");
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchRequests = useCallback(async () => {
    let query = supabase
      .from("store_requests")
      .select("*");

    // Filter by user's platforms for non-admin users
    if (role !== "admin" && platforms.length > 0) {
      query = query.in("platform", platforms);
    }

    const { data } = await query.order("created_at", { ascending: false });

    const requestRows = (data as unknown as StoreRequest[]) ?? [];
    setRequests(requestRows);

    const assignedUserIds = [...new Set(
      requestRows
        .map((request) => request.assigned_to)
        .filter((value): value is string => Boolean(value)),
    )];

    if (!assignedUserIds.length) {
      setAssigneeNames({});
      setLoading(false);
      return;
    }

    const { data: assignees } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", assignedUserIds);

    setAssigneeNames(
      Object.fromEntries((assignees ?? []).map((profile) => [profile.user_id, profile.display_name])),
    );
    setLoading(false);
  }, [role, platforms]);

  const fetchStrategicUsers = useCallback(async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "strategic");

    if (!roles?.length) {
      setStrategicUsers([]);
      return;
    }

    const userIds = [...new Set(roles.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds)
      .eq("approved", true)
      .order("display_name", { ascending: true });

    setStrategicUsers((profiles ?? []) as StrategicUser[]);
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchStrategicUsers();
  }, [fetchRequests, fetchStrategicUsers]);

  useEffect(() => {
    const channelId = `store-requests-strategic-users-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelId);

    channel
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "user_roles",
      }, () => {
        fetchStrategicUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStrategicUsers]);

  useEffect(() => {
    if (assignedTo && !strategicUsers.some((strategicUser) => strategicUser.user_id === assignedTo)) {
      setAssignedTo("");
    }
  }, [assignedTo, strategicUsers]);

  const resetForm = () => {
    setStoreName("");
    setClientName("");
    setStoreCreationStatus("pending");
    setPlatformAccess(false);
    setMeetingDate("");
    setObservation("");
    setAssignedTo("");
    setEditStatus("pending");
    setEditingId(null);
    setFreeText("");
    setPlatformField("99food");
  };




  const openEdit = (req: StoreRequest) => {
    setStoreName(req.store_name);
    setClientName(req.client_name);
    setStoreCreationStatus(req.store_creation_status || "pending");
    setPlatformAccess(req.platform_access_confirmed);
    setMeetingDate(req.meeting_date);
    setObservation(req.observation);
    setAssignedTo(req.assigned_to || "");
    setEditStatus(req.status);
    setEditingId(req.id);
    setPlatformField(req.platform || "99food");
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("store_requests").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir solicitação.");
    } else {
      toast.success("Solicitação excluída!");
      fetchRequests();
    }
  };

  const handleUpdateCreationStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("store_requests")
      .update({ store_creation_status: newStatus } as any)
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status da loja.");
    } else {
      toast.success(`Status atualizado para "${CREATION_STATUS_LABELS[newStatus]}"`);
      fetchRequests();
    }
  };

  const handleSubmit = async () => {
    if (!storeName.trim() || !clientName.trim() || !assignedTo) {
      toast.error("Preencha os campos obrigatórios: nome da loja, nome do cliente e estrategista.");
      return;
    }
    if (!user) return;

    setSubmitting(true);

    if (editingId) {
      const { error } = await supabase.from("store_requests").update({
        store_name: storeName.trim(),
        client_name: clientName.trim(),
        store_creation_status: storeCreationStatus,
        platform_access_confirmed: platformAccess,
        meeting_date: meetingDate,
        observation: observation.trim(),
        assigned_to: assignedTo,
        status: editStatus,
        platform: platformField,
      } as any).eq("id", editingId);

      if (error) {
        toast.error("Erro ao atualizar solicitação.");
      } else {
        toast.success("Solicitação atualizada!");
        resetForm();
        setDialogOpen(false);
        fetchRequests();
      }
    } else {
      const { error } = await supabase.from("store_requests").insert({
        store_name: storeName.trim(),
        client_name: clientName.trim(),
        store_creation_status: storeCreationStatus,
        platform_access_confirmed: platformAccess,
        meeting_date: meetingDate,
        observation: observation.trim(),
        assigned_to: assignedTo,
        created_by: user.id,
        platform: platformField,
      } as any);

      if (error) {
        toast.error("Erro ao criar solicitação.");
      } else {
        toast.success("Solicitação enviada com sucesso!");
        resetForm();
        setDialogOpen(false);
        fetchRequests();
      }
    }
    setSubmitting(false);
  };

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return "—";
    const dn = assigneeNames[userId];
    return dn ? shortName(dn) : "Estrategista";
  };

  const getCreationStatusIcon = (status: string) => {
    switch (status) {
      case "created":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case "in_progress":
        return <Hammer className="h-3.5 w-3.5 text-primary" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-warning" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const renderRequestCard = (req: StoreRequest) => {
    const isStrategic = role === "strategic" && req.assigned_to === user?.id;
    const canNavigate = isStrategic && req.status !== "completed" && req.store_creation_status === "created";
    const creationStatus = req.store_creation_status || "pending";

    return (
      <Card
        key={req.id}
        className={`p-4 space-y-3 ${canNavigate ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}`}
        onClick={() => {
          if (canNavigate) {
            if (req.status === "pending") {
              supabase.from("store_requests").update({ status: "in_progress" } as any).eq("id", req.id);
            }
            const params = new URLSearchParams();
            params.set("store", req.store_name);
            params.set("manager", displayName || "");
            params.set("store_request_id", req.id);
            params.set("platform", req.platform || "99food");
            navigate(`/nova?${params.toString()}`);
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
              {req.store_name}
              <PlatformBadge platform={req.platform || "99food"} />
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Cliente: {req.client_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${STATUS_COLORS[req.status] || ""} flex items-center gap-1.5`}>
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[req.status] || ""}`} />
              {STATUS_LABELS[req.status] || req.status}
            </Badge>
            {canNavigate && (
              <ArrowRight className="h-4 w-4 text-primary" />
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {getCreationStatusIcon(creationStatus)}
            {CREATION_STATUS_LABELS[creationStatus] || "Loja a criar"}
          </span>
          <span className="flex items-center gap-1">
            {req.platform_access_confirmed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-warning" />
            )}
            Acesso MiBusca {req.platform_access_confirmed ? "confirmado" : "pendente"}
          </span>
          {req.meeting_date && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Reunião: {format(new Date(req.meeting_date), "dd/MM/yyyy")}
            </span>
          )}
          {isAdmin && (
            <span>Estrategista: {getAssigneeName(req.assigned_to)}</span>
          )}
        </div>

        {req.observation && (
          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            {req.observation}
          </p>
        )}

        <div className="text-xs text-muted-foreground">
          Criado em {format(new Date(req.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {/* Strategic user actions for creation status */}
          {isStrategic && req.assigned_to === user?.id && creationStatus === "pending" && (
            <Button
              size="sm"
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => handleUpdateCreationStatus(req.id, "in_progress")}
            >
              <Hammer className="h-3.5 w-3.5 mr-1" />
              Criação em andamento
            </Button>
          )}
          {isStrategic && req.assigned_to === user?.id && creationStatus === "in_progress" && (
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
              onClick={() => handleUpdateCreationStatus(req.id, "created")}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Marcar como criada
            </Button>
          )}

          {/* Admin actions */}
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={() => openEdit(req)}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(req.id)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Excluir
              </Button>
            </>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            Solicitações de Lojas Novas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Envie solicitações para os estrategistas montarem estratégias de lojas novas."
              : "Lojas novas atribuídas a você para montar a estratégia."}
          </p>
        </div>

        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Solicitação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Solicitação" : "Nova Solicitação de Loja"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">


                <div>
                  <Label>Nome da Loja *</Label>
                  <Input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex: Pizzaria do João"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Plataforma *</Label>
                  <Select value={platformField} onValueChange={setPlatformField}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_OPTIONS.map((key) => (
                        <SelectItem key={key} value={key}>
                          <span className={key === "ifood" ? "text-red-400" : "text-yellow-400"}>●</span>{" "}
                          {PLATFORM_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status de criação da loja</Label>
                  <Select value={storeCreationStatus} onValueChange={setStoreCreationStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-warning" /> Loja a criar</span>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <span className="flex items-center gap-2"><Hammer className="h-3.5 w-3.5 text-primary" /> Criação em andamento</span>
                      </SelectItem>
                      <SelectItem value="created">
                        <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Loja criada</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="platform-access"
                    checked={platformAccess}
                    onCheckedChange={(v) => setPlatformAccess(v === true)}
                  />
                  <Label htmlFor="platform-access" className="cursor-pointer text-sm">
                    Acesso MiBusca confirmado
                  </Label>
                </div>
                <div>
                  <Label>Data da Reunião Inicial</Label>
                  <Input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Estrategista Responsável *</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estrategista" />
                    </SelectTrigger>
                    <SelectContent>
                      {strategicUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {shortName(u.display_name) || u.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editingId && (
                  <div>
                    <Label>Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-warning" /> Pendente</span>
                        </SelectItem>
                        <SelectItem value="in_progress">
                          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> Em andamento</span>
                        </SelectItem>
                        <SelectItem value="completed">
                          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Concluída</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Observação</Label>
                  <Textarea
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Informações adicionais sobre a loja..."
                    rows={3}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Salvando..." : editingId ? "Salvar Alterações" : "Enviar Solicitação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>


      {/* Filters */}
      {requests.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
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
          <Select value={filterCreation} onValueChange={setFilterCreation}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Etapa de criação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etapas</SelectItem>
              <SelectItem value="pending">Loja a criar</SelectItem>
              <SelectItem value="in_progress">Criação em andamento</SelectItem>
              <SelectItem value="created">Loja criada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Serviço" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os serviços</SelectItem>
              {PLATFORM_OPTIONS.map((key) => (
                <SelectItem key={key} value={key}>{PLATFORM_LABELS[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterStatus !== "all" || filterCreation !== "all" || filterPlatform !== "all") && (
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setFilterStatus("all"); setFilterCreation("all"); setFilterPlatform("all"); }}>
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {(() => {
        const filtered = requests.filter(r => {
          if (filterStatus !== "all" && r.status !== filterStatus) return false;
          if (filterCreation !== "all" && (r.store_creation_status || "pending") !== filterCreation) return false;
          if (filterPlatform !== "all" && (r.platform || "99food") !== filterPlatform) return false;
          return true;
        });

        if (requests.length === 0) {
          return (
            <Card className="p-8 text-center text-muted-foreground">
              <Store className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma solicitação de loja nova encontrada.</p>
            </Card>
          );
        }

        if (filtered.length === 0) {
          return (
            <Card className="p-8 text-center text-muted-foreground">
              <Filter className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma solicitação encontrada com os filtros selecionados.</p>
            </Card>
          );
        }

        return (
          <div className="space-y-8">
            {/* Loja a criar */}
            {(() => {
              const toCreate = filtered.filter((r) => (r.store_creation_status || "pending") === "pending").sort((a, b) => new Date(a.meeting_date || a.created_at).getTime() - new Date(b.meeting_date || b.created_at).getTime());
              if (!toCreate.length) return null;
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    <h2 className="font-heading font-semibold text-lg text-foreground">Loja a criar</h2>
                    <Badge variant="outline" className="ml-1 text-xs">{toCreate.length}</Badge>
                  </div>
                  <div className="grid gap-4">
                    {toCreate.map((req) => renderRequestCard(req))}
                  </div>
                </div>
              );
            })()}

            {/* Criação em andamento */}
            {(() => {
              const inProg = filtered.filter((r) => r.store_creation_status === "in_progress").sort((a, b) => new Date(a.meeting_date || a.created_at).getTime() - new Date(b.meeting_date || b.created_at).getTime());
              if (!inProg.length) return null;
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Hammer className="h-5 w-5 text-primary" />
                    <h2 className="font-heading font-semibold text-lg text-foreground">Criação em andamento</h2>
                    <Badge variant="outline" className="ml-1 text-xs">{inProg.length}</Badge>
                  </div>
                  <div className="grid gap-4">
                    {inProg.map((req) => renderRequestCard(req))}
                  </div>
                </div>
              );
            })()}

            {/* Loja criada (pendente de estratégia) */}
            {(() => {
              const created = filtered.filter((r) => r.store_creation_status === "created" && r.status !== "completed").sort((a, b) => new Date(a.meeting_date || a.created_at).getTime() - new Date(b.meeting_date || b.created_at).getTime());
              if (!created.length) return null;
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <h2 className="font-heading font-semibold text-lg text-foreground">Loja criada</h2>
                    <Badge variant="outline" className="ml-1 text-xs">{created.length}</Badge>
                  </div>
                  <div className="grid gap-4">
                    {created.map((req) => renderRequestCard(req))}
                  </div>
                </div>
              );
            })()}

            {/* Concluídas - collapsible summary */}
            {(() => {
              const completed = filtered.filter((r) => r.status === "completed").sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
              if (!completed.length) return null;
              return (
                <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 font-heading font-semibold text-lg text-foreground hover:text-primary transition-colors w-full text-left">
                      {showCompleted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      Concluídas ({completed.length})
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="grid gap-2">
                      {completed.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 hover:bg-accent/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{req.store_name}</p>
                              <p className="text-xs text-muted-foreground truncate">Cliente: {req.client_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(req.updated_at || req.created_at), "dd/MM/yyyy")}
                            </span>
                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(req.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}
