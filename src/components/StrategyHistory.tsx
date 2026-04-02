import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Clock, User, ArrowRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface HistoryEntry {
  id: string;
  strategy_id: string;
  user_id: string;
  user_name: string;
  action: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  created: "Criou a estratégia",
  status_changed: "Alterou o status",
  field_updated: "Editou campo",
  approved: "Aprovou a estratégia",
  rejected: "Devolveu a estratégia",
  submitted: "Enviou para aprovação",
  revoked: "Removeu aprovação",
  categories_updated: "Atualizou itens/categorias",
  assigned: "Atribuiu gestor operacional",
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "Em andamento",
  pending_approval: "Aguardando aprovação",
  approved: "Aprovada",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function StrategyHistory({ strategyId }: { strategyId: string }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("strategy_history" as any)
        .select("*")
        .eq("strategy_id", strategyId)
        .order("created_at", { ascending: false });
      setHistory((data as any[] || []) as HistoryEntry[]);
      setLoading(false);
    };
    fetch();
  }, [strategyId, open]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full justify-start">
          <Clock className="h-4 w-4" />
          {open ? "Ocultar" : "Ver"} Histórico da Estratégia
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2 p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro de histórico ainda.</p>
          ) : (
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
              
              {history.map((entry, idx) => (
                <div key={entry.id} className="relative flex gap-3 pb-4">
                  {/* Dot */}
                  <div className="relative z-10 mt-1.5">
                    <div className={`h-[10px] w-[10px] rounded-full border-2 ${
                      entry.action === "created" ? "bg-primary border-primary" :
                      entry.action === "approved" ? "bg-success border-success" :
                      entry.action === "rejected" ? "bg-warning border-warning" :
                      entry.action === "status_changed" ? "bg-accent border-accent" :
                      "bg-muted-foreground border-muted-foreground"
                    }`} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                    </div>
                    
                    {entry.field_changed && entry.action === "status_changed" && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                        <span className="text-muted-foreground">{STATUS_LABELS[entry.old_value] || entry.old_value}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-foreground">{STATUS_LABELS[entry.new_value] || entry.new_value}</span>
                      </div>
                    )}

                    {entry.field_changed && entry.action === "field_updated" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.field_changed}: {entry.old_value ? `"${entry.old_value}"` : "(vazio)"} → "{entry.new_value}"
                      </p>
                    )}

                    {entry.action === "assigned" && entry.new_value && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Atribuído para: {entry.new_value}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{entry.user_name || "Usuário"}</span>
                      <span>•</span>
                      <span>{formatDateTime(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
