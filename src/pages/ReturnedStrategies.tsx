import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, AlertTriangle, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Item {
  id: string;
  store_name: string;
  platform: string;
  manager_name: string;
  algorithm_return_reason: string;
  algorithm_adaptation_started_at: string | null;
  updated_at: string;
}

const PLATFORM_LABELS: Record<string, string> = { ifood: "iFood", "99food": "99", keeta: "Keeta" };

export default function ReturnedStrategies() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("strategies")
      .select("id, store_name, platform, manager_name, algorithm_return_reason, algorithm_adaptation_started_at, updated_at")
      .eq("algorithm_adaptation_status", "returned")
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    setItems((data as Item[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`returned-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "strategies" }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

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

      {loading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground text-sm">Nenhuma estratégia devolvida. 🎉</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4 space-y-3 border-destructive/30">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground truncate">{item.store_name}</p>
                    <Badge variant="outline">{PLATFORM_LABELS[item.platform] || item.platform}</Badge>
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> Devolvida
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

              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/estrategia/${item.id}`)}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Abrir estratégia
                </Button>
                <Button size="sm" onClick={() => createRealignment(item)}>
                  <Sparkles className="h-4 w-4 mr-1" /> Criar estratégia de realinhamento
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}