import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, AlertTriangle, ExternalLink, Sparkles, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Item {
  id: string;
  store_name: string;
  platform: string;
  manager_name: string;
  algorithm_return_reason: string;
  algorithm_return_priority: string;
  algorithm_adaptation_started_at: string | null;
  updated_at: string;
}

const PLATFORM_LABELS: Record<string, string> = { ifood: "iFood", "99food": "99", keeta: "Keeta" };

const RETURN_PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgente", color: "destructive" },
  high: { label: "Alta", color: "secondary" },
  medium: { label: "Média", color: "outline" },
  low: { label: "Baixa", color: "outline" },
};

export default function ReturnedStrategies() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    const isAdmin = roles.includes("admin");
    let query = supabase
      .from("strategies")
      .select("id, store_name, platform, manager_name, algorithm_return_reason, algorithm_return_priority, algorithm_adaptation_started_at, updated_at")
      .eq("algorithm_adaptation_status", "returned")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (!isAdmin) {
      query = query.or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`);
    }
    const { data } = await query;
    setItems(((data as any[]) || []).map((i) => ({ ...i, algorithm_return_priority: i.algorithm_return_priority || "medium" })) as Item[]);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user, roles]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`returned-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "strategies" }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const filteredItems = useMemo(() => items.filter((i) => {
    if (searchTerm && !i.store_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (platformFilter !== "all" && i.platform !== platformFilter) return false;
    return true;
  }), [items, searchTerm, platformFilter]);

  const createRealignment = (item: Item) => {
    const params = new URLSearchParams({
      store: item.store_name,
      manager: item.manager_name || "",
      platform: item.platform,
      type: "alignment",
      replaces: item.id,
    });
    navigate(`/nova?${params.toString()}`);
  };

  const requeuePending = async (item: Item) => {
    const { error } = await supabase.from("strategies").update({
      algorithm_adaptation_status: "pending",
      algorithm_return_reason: "",
    } as any).eq("id", item.id);
    if (error) { toast.error("Erro ao colocar como pendente"); return; }
    toast.success("Voltou para pendentes");
    fetchItems();
  };

  const deleteReturned = async (item: Item) => {
    if (!confirm(`Excluir a estratégia devolvida de "${item.store_name}"?`)) return;
    const { error } = await supabase.from("strategies").update({
      deleted_at: new Date().toISOString(),
    } as any).eq("id", item.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Excluída");
    fetchItems();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-destructive flex items-center justify-center">
          <RotateCcw className="h-5 w-5 text-destructive-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Devolvidas pelo <span className="text-primary">Braço Direito</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Ajuste o que foi pedido e reenvie para a aprovação final.
          </p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar loja..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder="Plataforma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as plataformas</SelectItem>
              <SelectItem value="ifood">iFood</SelectItem>
              <SelectItem value="99food">99</SelectItem>
              <SelectItem value="keeta">Keeta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground text-sm">Nenhuma estratégia devolvida. 🎉</p>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground text-sm">Nenhum resultado para os filtros aplicados.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const retPriority = RETURN_PRIORITY_LABELS[item.algorithm_return_priority] || RETURN_PRIORITY_LABELS.medium;
            return (
            <Card key={item.id} className="p-4 space-y-3 border-destructive/30">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground truncate">{item.store_name}</p>
                    <Badge variant="outline">{PLATFORM_LABELS[item.platform] || item.platform}</Badge>
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> Devolvida
                    </Badge>
                    <Badge variant={retPriority.color as any}>
                      Prioridade: {retPriority.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Devolvida em {new Date(item.updated_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              {item.algorithm_return_reason && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3">
                  <p className="text-xs font-semibold text-destructive mb-1">Motivo da devolução:</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{item.algorithm_return_reason}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => navigate(`/estrategia/${item.id}`)}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Abrir estratégia
                </Button>
                <Button size="sm" variant="outline" onClick={() => requeuePending(item)}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Colocar como pendente
                </Button>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteReturned(item)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
                <Button size="sm" onClick={() => createRealignment(item)}>
                  <Sparkles className="h-4 w-4 mr-1" /> Criar estratégia de realinhamento
                </Button>
              </div>
            </Card>
          );})}
        </div>
      )}
    </div>
  );
}