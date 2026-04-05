import { useState, useEffect, useRef } from "react";
import { Bell, AlertTriangle, RotateCcw, Clock, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { useAuth } from "@/hooks/useAuth";
import { deriveStrategyDisplayStatus } from "@/lib/strategyStatus";
import { useNavigate } from "react-router-dom";
import { shortName } from "@/lib/utils";

interface Notification {
  id: string;
  type: "returned" | "overdue" | "expiring" | "assigned";
  title: string;
  subtitle: string;
  strategyId: string;
  timestamp: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { strategies } = useDbStrategies();
  const { role } = useAuth();
  const navigate = useNavigate();

  const isOperational = role === "operational";

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const notifications: Notification[] = [];
  const now = new Date();

  strategies.forEach((s) => {
    const ds = deriveStrategyDisplayStatus(s);

    // Returned strategies
    if (ds === "returned") {
      notifications.push({
        id: `returned-${s.id}`,
        type: "returned",
        title: `Estratégia devolvida`,
        subtitle: s.store_name || "Sem nome",
        strategyId: s.id,
        timestamp: s.updated_at,
      });
    }

    // Overdue
    if (s.deadline && ds !== "completed") {
      const deadline = new Date(s.deadline);
      const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        notifications.push({
          id: `overdue-${s.id}`,
          type: "overdue",
          title: `Prazo vencido há ${Math.abs(diffDays)} dia(s)`,
          subtitle: s.store_name || "Sem nome",
          strategyId: s.id,
          timestamp: s.deadline,
        });
      } else if (diffDays <= 2) {
        notifications.push({
          id: `expiring-${s.id}`,
          type: "expiring",
          title: diffDays === 0 ? "Prazo vence hoje" : `Prazo vence em ${diffDays} dia(s)`,
          subtitle: s.store_name || "Sem nome",
          strategyId: s.id,
          timestamp: s.deadline,
        });
      }
    }
  });

  // Sort: returned first, then overdue, then expiring
  const priority = { returned: 0, overdue: 1, expiring: 2, assigned: 3 };
  notifications.sort((a, b) => priority[a.type] - priority[b.type]);

  const count = notifications.length;

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "returned": return <RotateCcw className="h-4 w-4 text-destructive" />;
      case "overdue": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "expiring": return <Clock className="h-4 w-4 text-warning" />;
      case "assigned": return <ClipboardList className="h-4 w-4 text-primary" />;
    }
  };

  const handleClick = (n: Notification) => {
    setOpen(false);
    if (isOperational) {
      navigate(`/operacional/${n.strategyId}`);
    } else {
      navigate(`/estrategia/${n.strategyId}`);
    }
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl z-50">
          <div className="p-3 border-b border-border">
            <h3 className="font-heading font-semibold text-sm text-foreground">Notificações</h3>
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
