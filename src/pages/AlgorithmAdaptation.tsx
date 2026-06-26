import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Cpu, CheckCircle2, RotateCcw, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const RETURN_PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgente", color: "destructive" },
  high: { label: "Alta", color: "secondary" },
  medium: { label: "Média", color: "outline" },
  low: { label: "Baixa", color: "outline" },
};

interface AdaptationItem {
  id: string;
  store_name: string;
  platform: string;
  user_id: string;
  strategist_name: string;
  algorithm_adaptation_started_at: string | null;
  algorithm_adaptation_deadline: string | null;
  algorithm_adaptation_status: string;
  algorithm_return_reason: string;
  algorithm_return_priority: string;
  algorithm_approved_at: string | null;
}

const PLATFORM_LABELS: Record<string, string> = { ifood: "iFood", "99food": "99", keeta: "Keeta" };

export default function AlgorithmAdaptation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AdaptationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<AdaptationItem | null>(null);
  const [reason, setReason] = useState("");
  const [returnPriority, setReturnPriority] = useState<string>("medium");
  const [strategistFilter, setStrategistFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("strategies")
      .select("id, store_name, platform, user_id, algorithm_adaptation_started_at, algorithm_adaptation_deadline, algorithm_adaptation_status, algorithm_return_reason, algorithm_return_priority, algorithm_approved_at")
      .neq("algorithm_adaptation_status", "none")
      .is("deleted_at", null)
      .order("algorithm_adaptation_started_at", { ascending: false });

    const userIds = Array.from(new Set((data || []).map((s: any) => s.user_id)));
    let nameMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, display_name").in("user_id", userIds);
      profiles?.forEach((p) => nameMap.set(p.user_id, p.display_name || ""));
    }

    setItems((data || []).map((s: any) => ({
      ...s,
      strategist_name: nameMap.get(s.user_id) || "—",
      algorithm_return_priority: s.algorithm_return_priority || "medium",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    const ch = supabase.channel(`algo-adapt-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "strategies" }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const grouped = useMemo(() => ({
    pending: items.filter((i) => i.algorithm_adaptation_status === "pending"),
    approved: items.filter((i) => i.algorithm_adaptation_status === "approved"),
    returned: items.filter((i) => i.algorithm_adaptation_status === "returned"),
  }), [items]);

  const strategistOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => { if (i.user_id) map.set(i.user_id, i.strategist_name); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  const priorityOf = (deadline: string | null, status: string) => {
    if (status !== "pending") return "none";
    if (!deadline) return "low";
    const ms = new Date(deadline).getTime() - Date.now();
    if (ms < 0) return "overdue";
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (days <= 2) return "high";
    if (days <= 5) return "medium";
    return "low";
  };

  const applyFilters = (list: AdaptationItem[]) => list.filter((i) => {
    if (strategistFilter !== "all" && i.user_id !== strategistFilter) return false;
    if (priorityFilter !== "all" && priorityOf(i.algorithm_adaptation_deadline, i.algorithm_adaptation_status) !== priorityFilter) return false;
    if (platformFilter !== "all" && i.platform !== platformFilter) return false;
    return true;
  });

  const approve = async (item: AdaptationItem) => {
    const { error } = await supabase.from("strategies").update({
      algorithm_adaptation_status: "approved",
      algorithm_approved_by: user?.id,
      algorithm_approved_at: new Date().toISOString(),
    } as any).eq("id", item.id);
    if (error) { toast.error("Erro ao aprovar"); return; }
    toast.success("Aprovado");
    fetchItems();
  };

  const doReturn = async () => {
    if (!returning || !reason.trim()) { toast.error("Informe o motivo"); return; }
    const { error } = await supabase.from("strategies").update({
      algorithm_adaptation_status: "returned",
      algorithm_return_reason: reason.trim(),
      algorithm_return_priority: returnPriority,
      status: "in_progress",
      admin_approved: false,
      returned: true,
    } as any).eq("id", returning.id);
    if (error) { toast.error("Erro ao devolver"); return; }
    toast.success("Devolvido ao estrategista");
    setReturning(null); setReason(""); setReturnPriority("medium");
    fetchItems();
  };

  const isOverdue = (deadline: string | null) =>
    deadline ? new Date(deadline).getTime() < Date.now() : false;

  const daysLeft = (deadline: string | null) => {
    if (!deadline) return null;
    const ms = new Date(deadline).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const ItemCard = ({ item }: { item: AdaptationItem }) => {
    const left = daysLeft(item.algorithm_adaptation_deadline);
    const overdue = isOverdue(item.algorithm_adaptation_deadline) && item.algorithm_adaptation_status === "pending";
    const retPriority = RETURN_PRIORITY_LABELS[item.algorithm_return_priority] || RETURN_PRIORITY_LABELS.medium;
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{item.store_name}</p>
            <p className="text-xs text-muted-foreground">Estrategista: {item.strategist_name}</p>
            {item.algorithm_adaptation_started_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Início: {new Date(item.algorithm_adaptation_started_at).toLocaleDateString("pt-BR")}
                {item.algorithm_adaptation_deadline && (
                  <> · Prazo: {new Date(item.algorithm_adaptation_deadline).toLocaleDateString("pt-BR")}</>
                )}
              </p>
            )}
            {item.algorithm_return_reason && item.algorithm_adaptation_status === "returned" && (
              <p className="text-xs text-destructive mt-2 whitespace-pre-wrap">
                Motivo: {item.algorithm_return_reason}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline">{PLATFORM_LABELS[item.platform] || item.platform}</Badge>
            {item.algorithm_adaptation_status === "pending" && left !== null && (
              <Badge variant={overdue ? "destructive" : left <= 2 ? "secondary" : "outline"}>
                {overdue ? "Atrasada" : `${left}d restantes`}
              </Badge>
            )}
            {item.algorithm_adaptation_status === "returned" && (
              <Badge variant={retPriority.color as any}>
                Prioridade: {retPriority.label}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/estrategia/${item.id}`)}>
            <ExternalLink className="h-4 w-4 mr-1" /> Ver estratégia
          </Button>
          {item.algorithm_adaptation_status === "pending" && (
            <>
              <Button size="sm" variant="outline" onClick={() => { setReturning(item); setReason(""); setReturnPriority("medium"); }}>
                <RotateCcw className="h-4 w-4 mr-1" /> Devolver
              </Button>
              <Button size="sm" onClick={() => approve(item)} className="bg-success hover:bg-success/90 text-success-foreground">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
              </Button>
            </>
          )}
        </div>
      </Card>
    );
  };

  const Empty = ({ msg }: { msg: string }) => (
    <Card className="p-8 text-center border-dashed"><p className="text-muted-foreground text-sm">{msg}</p></Card>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <Cpu className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Adaptação do <span className="text-primary">Algoritmo</span>
          </h1>
          <p className="text-sm text-muted-foreground">Revise as lojas em adaptação (prazo de 10 dias).</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : (
        <>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={strategistFilter} onValueChange={setStrategistFilter}>
            <SelectTrigger className="sm:w-64"><SelectValue placeholder="Estrategista" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estrategistas</SelectItem>
              {strategistOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="sm:w-56"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
              <SelectItem value="high">Alta (≤ 2 dias)</SelectItem>
              <SelectItem value="medium">Média (3-5 dias)</SelectItem>
              <SelectItem value="low">Baixa ({'>'} 5 dias)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="sm:w-48"><SelectValue placeholder="Plataforma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as plataformas</SelectItem>
              <SelectItem value="ifood">iFood</SelectItem>
              <SelectItem value="99food">99</SelectItem>
              <SelectItem value="keeta">Keeta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending"><Clock className="h-4 w-4 mr-1" /> Pendentes ({grouped.pending.length})</TabsTrigger>
            <TabsTrigger value="returned"><AlertTriangle className="h-4 w-4 mr-1" /> Devolvidas ({grouped.returned.length})</TabsTrigger>
            <TabsTrigger value="approved"><CheckCircle2 className="h-4 w-4 mr-1" /> Aprovadas ({grouped.approved.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-3 mt-4">
            {applyFilters(grouped.pending).length === 0 ? <Empty msg="Nada para revisar." /> : applyFilters(grouped.pending).map((i) => <ItemCard key={i.id} item={i} />)}
          </TabsContent>
          <TabsContent value="returned" className="space-y-3 mt-4">
            {applyFilters(grouped.returned).length === 0 ? <Empty msg="Nenhuma devolvida." /> : applyFilters(grouped.returned).map((i) => <ItemCard key={i.id} item={i} />)}
          </TabsContent>
          <TabsContent value="approved" className="space-y-3 mt-4">
            {applyFilters(grouped.approved).length === 0 ? <Empty msg="Nenhuma aprovada." /> : applyFilters(grouped.approved).map((i) => <ItemCard key={i.id} item={i} />)}
          </TabsContent>
        </Tabs>
        </>
      )}

      <Dialog open={!!returning} onOpenChange={(o) => { if (!o) { setReturning(null); setReason(""); setReturnPriority("medium"); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver: {returning?.store_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Prioridade de correção</p>
              <div className="flex gap-2 flex-wrap">
                {(["urgent", "high", "medium", "low"] as const).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={returnPriority === p ? "default" : "outline"}
                    onClick={() => setReturnPriority(p)}
                    className={returnPriority === p && p === "urgent" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
                  >
                    {RETURN_PRIORITY_LABELS[p].label}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea rows={5} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo da devolução (obrigatório)" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setReturning(null); setReturnPriority("medium"); }}>Cancelar</Button>
            <Button variant="destructive" onClick={doReturn}>Devolver ao estrategista</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}