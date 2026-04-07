import { useCallback, useEffect, useState } from "react";
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
import { Store, Plus, Clock, CheckCircle2, User, ArrowRight, Pencil, Trash2, Sparkles, Loader2 } from "lucide-react";
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
  const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});
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
  const [freeText, setFreeText] = useState("");
  const [parsing, setParsing] = useState(false);

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from("store_requests")
      .select("*")
      .order("created_at", { ascending: false });

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
  }, []);

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
    setStoreCreated(false);
    setPlatformAccess(false);
    setMeetingDate("");
    setObservation("");
    setAssignedTo("");
    setEditStatus("pending");
    setEditingId(null);
    setFreeText("");
  };

  const handleParseText = async () => {
    if (!freeText.trim()) {
      toast.error("Cole ou digite o texto com as informações da loja.");
      return;
    }
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-store-request", {
        body: { text: freeText.trim() },
      });
      if (error) throw error;
      if (data.store_name) setStoreName(data.store_name);
      if (data.client_name) setClientName(data.client_name);
      if (data.meeting_date) setMeetingDate(data.meeting_date);
      if (data.observation) setObservation(data.observation);
      toast.success("Dados extraídos com sucesso! Revise e complete os campos.");
    } catch {
      toast.error("Erro ao processar texto. Preencha manualmente.");
    }
    setParsing(false);
  };

  const openEdit = (req: StoreRequest) => {
    setStoreName(req.store_name);
    setClientName(req.client_name);
    setStoreCreated(req.store_created);
    setPlatformAccess(req.platform_access_confirmed);
    setMeetingDate(req.meeting_date);
    setObservation(req.observation);
    setAssignedTo(req.assigned_to || "");
    setEditStatus(req.status);
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
        status: editStatus,
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




  const getAssigneeName = (userId: string | null) => {
    if (!userId) return "—";
    const displayName = assigneeNames[userId];
    return displayName ? shortName(displayName) : "Estrategista";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
        Carregando...
      </div>
    );
  }

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
                {/* AI Free Text Parser - collapsible, compact */}
                {!editingId && (
                  <div className="rounded-lg border border-primary/20 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-primary/10">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">Preenchimento inteligente</span>
                    </div>
                    <div className="p-3 space-y-2">
                      <Textarea
                        value={freeText}
                        onChange={(e) => setFreeText(e.target.value)}
                        placeholder="Cole aqui qualquer texto com as informações da loja e a IA preenche os campos automaticamente..."
                        rows={2}
                        className="resize-none text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs border-primary/20 text-primary hover:bg-primary/10"
                        onClick={handleParseText}
                        disabled={parsing}
                      >
                        {parsing ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Extraindo...</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Extrair dados com IA</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
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

      {requests.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Store className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma solicitação de loja nova encontrada.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Loja a criar */}
          {(() => {
            const toCreate = requests.filter((r) => !r.store_created);
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

          {/* Loja criada */}
          {(() => {
            const created = requests.filter((r) => r.store_created);
            if (!created.length) return null;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <h2 className="font-heading font-semibold text-lg text-foreground">Loja criada</h2>
                  <Badge variant="outline" className="ml-1 text-xs">{created.length}</Badge>
                </div>
                <div className="grid gap-4">
                  {created.map((req) => renderRequestCard(req))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
