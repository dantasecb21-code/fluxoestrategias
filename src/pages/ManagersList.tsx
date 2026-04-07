import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { shortName } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Trash2, AlertTriangle, Store, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { calcManagerStats, deriveStrategyDisplayStatus, getStatusLabel, getStatusBadgeProps } from "@/lib/strategyStatus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OperationalManager {
  user_id: string;
  display_name: string;
  whatsapp: string;
  avatar_url: string;
  store_limit: number;
  store_count: number;
}

type StatusFilter = "completed" | "pending_approval" | "in_progress" | "pending";

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  completed: "Concluídas",
  pending_approval: "Aguardando",
  in_progress: "Em andamento",
  pending: "Pendentes",
};

export default function ManagersList() {
  const [managers, setManagers] = useState<OperationalManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [editingCount, setEditingCount] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [storesDialog, setStoresDialog] = useState<{ managerId: string; managerName: string; status: StatusFilter } | null>(null);
  const { strategies } = useDbStrategies();
  const navigate = useNavigate();

  const fetchManagers = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "operational");

    if (roles && roles.length > 0) {
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, whatsapp, avatar_url, store_limit, store_count")
        .in("user_id", userIds);

      if (profiles) {
        setManagers(profiles.map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name,
          whatsapp: p.whatsapp || "",
          avatar_url: p.avatar_url || "",
          store_limit: (p as any).store_limit ?? 10,
          store_count: (p as any).store_count ?? 0,
        })));
      }
    } else {
      setManagers([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchManagers(); }, []);

  const handleDeleteManager = async (managerId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", managerId)
      .eq("role", "operational");

    if (error) {
      toast.error("Erro ao remover gestor");
      return;
    }

    toast.success("Acesso do gestor removido com sucesso");
    setManagers((prev) => prev.filter((m) => m.user_id !== managerId));
  };

  const handleSaveLimit = async (managerId: string) => {
    const val = parseInt(editValue);
    if (isNaN(val) || val < 0) {
      toast.error("Informe um número válido");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ store_limit: val } as any)
      .eq("user_id", managerId);

    if (error) {
      toast.error("Erro ao salvar limite");
      return;
    }

    setManagers((prev) =>
      prev.map((m) => (m.user_id === managerId ? { ...m, store_limit: val } : m))
    );
    setEditingLimit(null);
    toast.success("Limite atualizado");
  };
  const handleSaveCount = async (managerId: string) => {
    const val = parseInt(editValue);
    if (isNaN(val) || val < 0) {
      toast.error("Informe um número válido");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ store_count: val } as any)
      .eq("user_id", managerId);

    if (error) {
      toast.error("Erro ao salvar contagem");
      return;
    }

    setManagers((prev) =>
      prev.map((m) => (m.user_id === managerId ? { ...m, store_count: val } : m))
    );
    setEditingCount(null);
    toast.success("Contagem atualizada");
  };

  const sortedManagers = [...managers].sort((a, b) => {
    const statsA = calcManagerStats(strategies, a.user_id);
    const statsB = calcManagerStats(strategies, b.user_id);
    return statsB.completed - statsA.completed || statsB.completionRate - statsA.completionRate;
  });

  const getFilteredStrategies = () => {
    if (!storesDialog) return [];
    return strategies.filter((s) => {
      if (s.assigned_to !== storesDialog.managerId) return false;
      const displayStatus = deriveStrategyDisplayStatus(s);
      if (storesDialog.status === "in_progress") {
        return displayStatus === "in_progress" || displayStatus === "returned";
      }
      return displayStatus === storesDialog.status;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Users className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Gestores <span className="text-primary">Operacionais</span>
          </h1>
        </div>
        <p className="text-muted-foreground">
          Ranking de desempenho e gestão de acessos dos gestores operacionais.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : managers.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Nenhum gestor cadastrado</h2>
          <p className="text-muted-foreground">Os gestores operacionais precisam criar conta selecionando "Gestor Operacional" no cadastro.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedManagers.map((m) => {
            const stats = calcManagerStats(strategies, m.user_id);
            const isOverLimit = m.store_count >= m.store_limit;

            return (
              <Card key={m.user_id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-2 border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={shortName(m.display_name)} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">
                          {m.display_name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-foreground">{shortName(m.display_name) || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">Gestor Operacional</p>
                      {m.whatsapp && <p className="text-xs text-muted-foreground">📱 {m.whatsapp}</p>}
                      <button onClick={() => navigate(`/perfil/${m.user_id}`)} className="text-xs text-primary hover:underline mt-0.5">Ver perfil →</button>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" /> Remover acesso
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover o acesso operacional de <strong>{shortName(m.display_name)}</strong>? 
                          O gestor não poderá mais acessar o painel operacional.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteManager(m.user_id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Store counter */}
                <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-muted/50 border border-border">
                  <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Lojas:</span>
                  {editingCount === m.user_id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-7 w-16 text-sm px-2"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveCount(m.user_id);
                          if (e.key === "Escape") setEditingCount(null);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-success" onClick={() => handleSaveCount(m.user_id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => setEditingCount(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className={`font-heading font-bold text-sm ${isOverLimit ? "text-destructive" : "text-foreground"}`}>
                        {m.store_count}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setEditingCount(m.user_id);
                          setEditValue(String(m.store_count));
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <span className="text-sm text-muted-foreground">/</span>
                  {editingLimit === m.user_id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-7 w-16 text-sm px-2"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveLimit(m.user_id);
                          if (e.key === "Escape") setEditingLimit(null);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-success" onClick={() => handleSaveLimit(m.user_id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => setEditingLimit(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="font-heading font-bold text-sm text-foreground">{m.store_limit}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setEditingLimit(m.user_id);
                          setEditValue(String(m.store_limit));
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {isOverLimit && (
                    <span className="text-xs text-destructive ml-auto">Limite atingido</span>
                  )}
                </div>

                {/* Stats - clickable */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <button
                    className="text-center p-2 rounded-lg bg-success/10 hover:bg-success/20 transition-colors cursor-pointer"
                    onClick={() => setStoresDialog({ managerId: m.user_id, managerName: m.display_name, status: "completed" })}
                  >
                    <p className="font-heading font-bold text-lg text-success">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </button>
                  <button
                    className="text-center p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors cursor-pointer"
                    onClick={() => setStoresDialog({ managerId: m.user_id, managerName: m.display_name, status: "pending_approval" })}
                  >
                    <p className="font-heading font-bold text-lg text-blue-400">{stats.pendingApproval}</p>
                    <p className="text-xs text-muted-foreground">Aguardando</p>
                  </button>
                  <button
                    className="text-center p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
                    onClick={() => setStoresDialog({ managerId: m.user_id, managerName: m.display_name, status: "in_progress" })}
                  >
                    <p className="font-heading font-bold text-lg text-primary">{stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground">Em andamento</p>
                  </button>
                  <button
                    className="text-center p-2 rounded-lg bg-warning/10 hover:bg-warning/20 transition-colors cursor-pointer"
                    onClick={() => setStoresDialog({ managerId: m.user_id, managerName: m.display_name, status: "pending" })}
                  >
                    <p className="font-heading font-bold text-lg text-warning">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Taxa de conclusão</span>
                    <span className="font-medium text-foreground">{stats.completionRate}%</span>
                  </div>
                  <Progress value={stats.completionRate} className="h-1.5" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de lojas por status */}
      <Dialog open={!!storesDialog} onOpenChange={(open) => { if (!open) setStoresDialog(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              {storesDialog && `${STATUS_FILTER_LABELS[storesDialog.status]} — ${shortName(storesDialog.managerName)}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {(() => {
              const filtered = getFilteredStrategies();
              if (filtered.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhuma loja nesse status.
                  </p>
                );
              }
              return filtered.map((s: any) => {
                const displayStatus = deriveStrategyDisplayStatus(s);
                const badgeProps = getStatusBadgeProps(displayStatus);
                return (
                  <Card key={s.id} className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-foreground">{s.store_name || "Sem nome"}</h4>
                      <Badge className={badgeProps.className} variant={badgeProps.variant}>
                        {getStatusLabel(displayStatus)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tipo: {s.strategy_type === "initial" ? "Inicial" : "Repreci ficação"}
                    </p>
                    {s.deadline && (
                      <p className="text-xs text-muted-foreground">Prazo: {s.deadline}</p>
                    )}
                  </Card>
                );
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
