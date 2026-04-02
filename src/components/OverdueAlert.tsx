import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DbStrategy } from "@/hooks/useDbStrategies";

interface Props {
  strategies: DbStrategy[];
  isOperational?: boolean;
}

/**
 * Shows stores that are overdue or will be overdue within 1 day (from 12:00 the day before).
 * A strategy is considered "at risk" starting at 12:00 of the day before the deadline.
 * A strategy is "overdue" after the deadline date has passed.
 * Only non-approved strategies count.
 */
export default function OverdueAlert({ strategies, isOperational }: Props) {
  const navigate = useNavigate();

  const { overdue, approaching } = useMemo(() => {
    const now = new Date();
    const overdue: DbStrategy[] = [];
    const approaching: DbStrategy[] = [];

    strategies.forEach((s) => {
      // Skip approved strategies
      if (s.status === "approved") return;
      if (!s.deadline) return;

      // Parse deadline (YYYY-MM-DD)
      const deadlineDate = new Date(s.deadline + "T23:59:59");
      if (isNaN(deadlineDate.getTime())) return;

      // Overdue: deadline has passed
      if (now > deadlineDate) {
        overdue.push(s);
        return;
      }

      // Approaching: 1 day before at 12:00
      const alertDate = new Date(deadlineDate);
      alertDate.setDate(alertDate.getDate() - 1);
      alertDate.setHours(12, 0, 0, 0);

      if (now >= alertDate) {
        approaching.push(s);
      }
    });

    return { overdue, approaching };
  }, [strategies]);

  const total = overdue.length + approaching.length;
  if (total === 0) return null;

  return (
    <Card className="p-4 border-destructive/30 bg-destructive/5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <h3 className="font-heading font-semibold text-foreground text-sm">
          {total} {total === 1 ? "loja" : "lojas"} {isOperational ? "precisam de atenção" : "com prazo crítico"}
        </h3>
      </div>

      {isOperational && (
        <p className="text-xs text-muted-foreground mb-3">
          ⚠️ Atenção! As lojas abaixo estão com prazo vencido ou prestes a vencer. Priorize a execução dessas estratégias.
        </p>
      )}

      {overdue.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-destructive mb-1 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Atrasadas ({overdue.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {overdue.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(isOperational ? `/operacional/${s.id}` : `/estrategia/${s.id}`)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                {s.store_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {approaching.length > 0 && (
        <div>
          <p className="text-xs font-medium text-warning mb-1 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Vencendo em breve ({approaching.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {approaching.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(isOperational ? `/operacional/${s.id}` : `/estrategia/${s.id}`)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
              >
                {s.store_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
