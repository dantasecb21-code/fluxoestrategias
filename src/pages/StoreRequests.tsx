import { useEffect, useState } from "react";
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
import { Store, Plus, Clock, CheckCircle2, User, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StoreRequest {
  id: string;
  store_name: string;
  client_name: string;
  store_created: boolean;
  platform_access_confirmed: boolean;
  meeting_date: string;
  observation: string;
  assigned_to: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
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

export default function StoreRequests() {
  const { user, role, displayName } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const [requests, setRequests] = useState<StoreRequest[]>([]);
  const [strategicUsers, setStrategicUsers] = useState<StrategicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [storeName, setStoreName] = useState("");
  const [clientName, setClientName] = useState("");
  const [storeCreated, setStoreCreated] = useState(false);
  const [platformAccess, setPlatformAccess] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [observation, setObservation] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [editStatus, setEditStatus] = useState("pending");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("store_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRequests(data as unknown as StoreRequest[]);
    setLoading(false);
  };

  const fetchStrategicUsers = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "strategic");
    if (!roles?.length) return;

    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds)
      .eq("approved", true);
    if (profiles) setStrategicUsers(profiles);
  };

  useEffect(() => {
    fetchRequests();
    if (isAdmin) fetchStrategicUsers();
  }, [isAdmin]);

  const resetForm = () => {
    setStoreName("");
    setClientName("");
    setStoreCreated(false);
    setPlatformAccess(false);
    setMeetingDate("");
    setObservation("");
    setAssignedTo("");
    setEditingId(null);
  };

  const openEdit = (req: StoreRequest) => {
    setStoreName(req.store_name);
    setClientName(req.client_name);
    setStoreCreated(req.store_created);
    setPlatformAccess(req.platform_access_confirmed);
    setMeetingDate(req.meeting_date);
    setObservation(req.observation);
    setAssignedTo(req.assigned_to || "");
    setEditingId(req.id);
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
        store_created: storeCreated,
        platform_access_confirmed: platformAccess,
        meeting_date: meetingDate,
        observation: observation.trim(),
        assigned_to: assignedTo,
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
        store_created: storeCreated,
        platform_access_confirmed: platformAccess,
        meeting_date: meetingDate,
        observation: observation.trim(),
        assigned_to: assignedTo,
        created_by: user.id,
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

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("store_requests")
      .update({ status: newStatus } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar status.");
    } else {
      toast.success("Status atualizado!");
      fetchRequests();
    }
  };

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return "—";
    const found = strategicUsers.find((u) => u.user_id === userId);
    return found?.display_name || "Estrategista";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
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
            <DialogContent className="max-w-lg">
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
                <div>
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="store-created"
                      checked={storeCreated}
                      onCheckedChange={(v) => setStoreCreated(v === true)}
                    />
                    <Label htmlFor="store-created" className="cursor-pointer text-sm">
                      Loja já está criada
                    </Label>
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
                          {u.display_name || u.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

      {requests.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Store className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma solicitação de loja nova encontrada.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => {
            const isStrategic = role === "strategic" && req.assigned_to === user?.id;

            return (
              <Card
                key={req.id}
                className={`p-4 space-y-3 ${isStrategic && req.status !== "completed" ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}`}
                onClick={() => {
                  if (isStrategic && req.status !== "completed") {
                    // Mark as in_progress and navigate to new strategy
                    if (req.status === "pending") {
                      supabase.from("store_requests").update({ status: "in_progress" } as any).eq("id", req.id);
                    }
                    const params = new URLSearchParams();
                    params.set("store", req.store_name);
                    params.set("manager", displayName || "");
                    params.set("store_request_id", req.id);
                    navigate(`/nova?${params.toString()}`);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{req.store_name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      Cliente: {req.client_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[req.status] || ""}>
                      {STATUS_LABELS[req.status] || req.status}
                    </Badge>
                    {isStrategic && req.status !== "completed" && (
                      <ArrowRight className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {req.store_created ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-warning" />
                    )}
                    Loja {req.store_created ? "criada" : "a criar"}
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
                      Reunião: {req.meeting_date}
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

                {/* Admin actions */}
                {isAdmin && (
                  <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <Select value={req.status} onValueChange={(v) => handleStatusChange(req.id, v)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em andamento</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => openEdit(req)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(req.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Excluir
                    </Button>
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
