import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, CheckCircle2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface QuotaStatus {
  current: number;
  limit: number;
  threshold: number;
  threshold_pct: number;
  year_month: string;
}

export default function AiQuotaCard() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newLimit, setNewLimit] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_ai_usage_status");
    if (!error && data) {
      const s = data as unknown as QuotaStatus;
      setStatus(s);
      setNewLimit(String(s.limit));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("ai-quota-changed", handler);
    return () => window.removeEventListener("ai-quota-changed", handler);
  }, []);

  const saveLimit = async () => {
    const n = parseInt(newLimit, 10);
    if (isNaN(n) || n < 100 || n > 1000) {
      toast.error("Use um limite entre 100 e 1000 para manter o modo gratuito");
      return;
    }
    const { data: existing } = await (supabase as any)
      .from("ai_quota_settings")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await (supabase as any)
        .from("ai_quota_settings")
        .update({ monthly_limit: n, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        return;
      }
    }
    toast.success("Limite atualizado");
    setEditing(false);
    load();
  };

  if (loading || !status) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">Carregando uso da IA...</Card>
    );
  }

  const pct = status.limit > 0 ? Math.min(100, Math.round((status.current / status.limit) * 100)) : 0;
  const blocked = status.current >= status.threshold;
  const warning = pct >= 70 && !blocked;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${blocked ? "bg-destructive/10" : warning ? "bg-warning/10" : "bg-primary/10"}`}>
            {blocked ? <AlertTriangle className="h-4 w-4 text-destructive" /> :
             warning ? <AlertTriangle className="h-4 w-4 text-warning" /> :
             <Sparkles className="h-4 w-4 text-primary" />}
          </div>
          <div>
            <p className="text-sm font-medium">Uso de IA — {status.year_month}</p>
            <p className="text-xs text-muted-foreground">
              {status.current.toLocaleString("pt-BR")} de {status.limit.toLocaleString("pt-BR")} chamadas ({pct}%)
            </p>
          </div>
        </div>
        {blocked ? (
          <Badge variant="destructive">Bloqueado</Badge>
        ) : warning ? (
          <Badge variant="outline" className="border-warning text-warning">Atenção</Badge>
        ) : (
          <Badge variant="outline" className="border-success text-success">
            <CheckCircle2 className="h-3 w-3 mr-1" /> OK
          </Badge>
        )}
      </div>

      <Progress value={pct} className={blocked ? "[&>div]:bg-destructive" : warning ? "[&>div]:bg-warning" : ""} />

      {blocked && (
        <div className="text-xs bg-destructive/5 border border-destructive/20 rounded p-2 text-destructive">
          <strong>IA pausada.</strong> Limite de segurança do modo gratuito atingido ({status.threshold_pct}% de {status.limit}).
          Aguarde o próximo mês.
        </div>
      )}

      {warning && !blocked && (
        <div className="text-xs bg-warning/5 border border-warning/20 rounded p-2 text-warning-foreground">
          Próximo do limite. Pausa automática em {(status.threshold - status.current).toLocaleString("pt-BR")} chamadas.
        </div>
      )}

      {isAdmin && (
        <div className="pt-2 border-t flex items-center gap-2">
          {editing ? (
            <>
              <Input
                type="number"
                min={100}
                max={1000}
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="h-8 text-sm w-32"
              />
              <Button size="sm" onClick={saveLimit}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setNewLimit(String(status.limit)); }}>
                Cancelar
              </Button>
            </>
          ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="text-xs">
                <Settings className="h-3 w-3 mr-1" /> Ajustar limite gratuito
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
