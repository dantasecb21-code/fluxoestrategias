import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { shortName } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ListChecks, Plus, Clock, CheckCircle2, User, Pencil, Trash2, Sparkles, Loader2, AlertCircle, AlertTriangle, Image, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingActivity {
  id: string;
  client_name: string;
  store_name: string;
  description: string;
  deadline: string;
  priority: string;
  assigned_to: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface OperationalUser {
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

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  medium: "bg-warning/20 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function PendingActivities() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const isStrategic = role === "strategic";
  const canManage = isAdmin || isStrategic;
  const isOperational = role === "operational";

  const [activities, setActivities] = useState<PendingActivity[]>([]);
  const [operationalUsers, setOperationalUsers] = useState<OperationalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [clientName, setClientName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState("pending");
  const [submitting, setSubmitting] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [pastedImage, setPastedImage] = useState<string | null>(null);

  const fetchActivities = async () => {
    const { data } = await supabase
      .from("pending_activities")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setActivities(data as unknown as PendingActivity[]);
    setLoading(false);
  };

  const fetchOperationalUsers = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "operational");
    if (!roles?.length) return;
    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds)
      .eq("approved", true);
    if (profiles) setOperationalUsers(profiles);
  };

  useEffect(() => {
    fetchActivities();
    if (canManage) fetchOperationalUsers();
  }, [canManage]);

  const resetForm = () => {
    setClientName("");
    setStoreName("");
    setDescription("");
    setDeadline("");
    setPriority("medium");
    setAssignedTo([]);
    setEditStatus("pending");
    setEditingId(null);
    setFreeText("");
    setPastedImage(null);
  };

  const openEdit = (act: PendingActivity) => {
    setClientName(act.client_name);
    setStoreName(act.store_name);
    setDescription(act.description);
    setDeadline(act.deadline);
    setPriority(act.priority);
    setAssignedTo(act.assigned_to ? [act.assigned_to] : []);
    setEditStatus(act.status);
    setEditingId(act.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("pending_activities").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir atividade.");
    } else {
      toast.success("Atividade excluída!");
      fetchActivities();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPastedImage(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPastedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleParseText = async () => {
    if (!freeText.trim() && !pastedImage) {
      toast.error("Cole texto ou uma imagem com as informações.");
      return;
    }
    setParsing(true);
    try {
      const body: any = {};
      if (freeText.trim()) body.text = freeText.trim();
      if (pastedImage) body.image = pastedImage;

      const { data, error } = await supabase.functions.invoke("parse-activity", { body });
      if (error) throw error;
      if (data.client_name) setClientName(data.client_name);
      if (data.store_name) setStoreName(data.store_name);
      if (data.description) setDescription(data.description);
      if (data.deadline) setDeadline(data.deadline);
      if (data.priority) setPriority(data.priority);
      toast.success("Dados extraídos! Revise e complete os campos.");
    } catch {
      toast.error("Erro ao processar. Preencha manualmente.");
    }
    setParsing(false);
  };

  const handleSubmit = async () => {
    if (!description.trim() || assignedTo.length === 0) {
      toast.error("Preencha a descrição e selecione ao menos um gestor responsável.");
      return;
    }
    if (!user) return;
    setSubmitting(true);

    if (editingId) {
      const { error } = await supabase.from("pending_activities").update({
        client_name: clientName.trim(),
        store_name: storeName.trim(),
        description: description.trim(),
        deadline,
        priority,
        assigned_to: assignedTo[0],
        status: editStatus,
      } as any).eq("id", editingId);
      if (error) {
        toast.error("Erro ao atualizar atividade.");
      } else {
        toast.success("Atividade atualizada!");
        resetForm();
        setDialogOpen(false);
        fetchActivities();
      }
    } else {
      const rows = assignedTo.map((uid) => ({
        client_name: clientName.trim(),
        store_name: storeName.trim(),
        description: description.trim(),
        deadline,
        priority,
        assigned_to: uid,
        created_by: user.id,
      }));
      const { error } = await supabase.from("pending_activities").insert(rows as any);
      if (error) {
        toast.error("Erro ao criar atividade.");
      } else {
        toast.success(assignedTo.length > 1 ? `${assignedTo.length} atividades criadas!` : "Atividade criada com sucesso!");
        resetForm();
        setDialogOpen(false);
        fetchActivities();
      }
    }
    setSubmitting(false);
  };

  const handleOperationalComplete = async (act: PendingActivity) => {
    const { error } = await supabase
      .from("pending_activities")
      .update({ status: "completed" } as any)
      .eq("id", act.id);
    if (error) {
      toast.error("Erro ao concluir atividade.");
    } else {
      toast.success("Atividade concluída!");
      fetchActivities();
    }
  };

  const getAssigneeName = (userId: string | null) => {
    if (!userId) return "—";
    const found = operationalUsers.find((u) => u.user_id === userId);
    return found?.display_name ? shortName(found.display_name) : "Gestor";
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
            <ListChecks className="h-6 w-6 text-primary" />
            Atividades Pendentes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {canManage
              ? "Solicitações de clientes para os gestores operacionais executarem."
              : "Atividades atribuídas a você para execução."}
          </p>
        </div>

        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Atividade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* AI parser */}
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
                        onPaste={handlePaste}
                        placeholder="Cole texto ou imagem (print) do cliente aqui..."
                        rows={2}
                        className="resize-none text-sm"
                      />
                      {pastedImage && (
                        <div className="relative inline-block">
                          <img src={pastedImage} alt="Print colado" className="max-h-32 rounded border border-border" />
                          <button
                            type="button"
                            onClick={() => setPastedImage(null)}
                            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs border-primary/20 text-primary hover:bg-primary/10"
                          onClick={handleParseText}
                          disabled={parsing}
                        >
                          {parsing ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Extraindo...</>
                          ) : (
                            <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Extrair dados com IA</>
                          )}
                        </Button>
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                          <div className="h-8 px-3 rounded-md border border-primary/20 text-primary hover:bg-primary/10 flex items-center gap-1.5 text-xs">
                            <Image className="h-3.5 w-3.5" />
                            Imagem
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Nome do Cliente</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex: João Silva" />
                </div>
                <div>
                  <Label>Loja</Label>
                  <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ex: Pizzaria do João" />
                </div>
                <div>
                  <Label>Descrição da Atividade *</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="O que precisa ser feito..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prazo</Label>
                    <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">
                          <span className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 text-destructive" /> Alta</span>
                        </SelectItem>
                        <SelectItem value="medium">
                          <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-warning" /> Média</span>
                        </SelectItem>
                        <SelectItem value="low">
                          <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> Baixa</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Gestor Responsável * {assignedTo.length > 0 && <span className="text-xs text-muted-foreground">({assignedTo.length} selecionado{assignedTo.length > 1 ? "s" : ""})</span>}</Label>
                  <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto rounded-md border border-border p-2">
                    {operationalUsers.map((u) => {
                      const checked = assignedTo.includes(u.user_id);
                      return (
                        <label key={u.user_id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${checked ? "bg-primary/20" : "hover:bg-accent/50"}`}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              if (v) setAssignedTo((prev) => [...prev, u.user_id]);
                              else setAssignedTo((prev) => prev.filter((id) => id !== u.user_id));
                            }}
                          />
                          <span className="text-sm">{shortName(u.display_name) || u.user_id}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                {editingId && (
                  <div>
                    <Label>Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Atividade"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {(() => {
        const pendingActs = activities.filter((a) => a.status !== "completed");
        const completedActs = activities.filter((a) => a.status === "completed");

        const renderCard = (act: any) => (
          <Card key={act.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{act.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                  {act.client_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> {act.client_name}
                    </span>
                  )}
                  {act.store_name && <span>🏪 {act.store_name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`${PRIORITY_COLORS[act.priority] || ""} text-xs`}>
                  {PRIORITY_LABELS[act.priority] || act.priority}
                </Badge>
                <Badge className={`${STATUS_COLORS[act.status] || ""} flex items-center gap-1.5`}>
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[act.status] || ""}`} />
                  {STATUS_LABELS[act.status] || act.status}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {act.deadline && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Prazo: {act.deadline}
                </span>
              )}
              {canManage && (
                <span>Gestor: {getAssigneeName(act.assigned_to)}</span>
              )}
              <span>
                Criado em {format(new Date(act.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>

            {isOperational && act.status !== "completed" && (
              <Button
                size="sm"
                onClick={() => handleOperationalComplete(act)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Marcar como Concluída
              </Button>
            )}

            {canManage && (
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(act)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(act.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                </Button>
              </div>
            )}
          </Card>
        );

        return (
          <>
            {/* Ativas */}
            {pendingActs.length === 0 && completedActs.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Nenhuma atividade encontrada.</p>
              </Card>
            ) : (
              <>
                {pendingActs.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Ativas ({pendingActs.length})
                    </h2>
                    <div className="grid gap-3">
                      {pendingActs.map(renderCard)}
                    </div>
                  </div>
                )}

                {completedActs.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="w-full flex items-center justify-between py-2 px-1 hover:opacity-80 transition-opacity">
                      <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        Concluídas ({completedActs.length})
                      </h2>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid gap-3 mt-2 opacity-75">
                        {completedActs.map(renderCard)}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            )}
          </>
        );
      })()}
    </div>
  );
}
