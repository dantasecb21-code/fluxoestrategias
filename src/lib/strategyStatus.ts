/**
 * Derives the effective display status of a strategy based on:
 * 1. approved → "completed"
 * 2. pending_approval BUT any item is in_progress → "in_progress" (sent back)
 * 3. pending_approval → "pending_approval"
 * 4. any item in_progress or completed → "in_progress"
 * 5. all items pending → "pending"
 */
export function deriveStrategyDisplayStatus(strategy: {
  status: string;
  categories: any[];
  returned?: boolean;
  admin_approved?: boolean;
}): "completed" | "pending_approval" | "pending_admin_approval" | "in_progress" | "pending" | "returned" {
  if (strategy.status === "approved") return "completed";
  if (strategy.status === "pending_admin_approval") return "pending_admin_approval";
  if (strategy.returned && strategy.status === "in_progress") return "returned";

  const allItems = (strategy.categories || []).flatMap((c: any) => c.items || []);
  const hasInProgress = allItems.some(
    (i: any) => i.status === "in_progress" || i.status === "completed"
  );

  if (strategy.status === "pending_approval") {
    return "pending_approval";
  }

  // Normal flow
  if (hasInProgress) return "in_progress";
  return "pending";
}

export function getStatusLabel(status: ReturnType<typeof deriveStrategyDisplayStatus>): string {
  switch (status) {
    case "completed": return "Concluída ✓";
    case "pending_approval": return "Aguardando aprovação";
    case "pending_admin_approval": return "Aguardando admin";
    case "in_progress": return "Em andamento";
    case "pending": return "Pendente";
    case "returned": return "Devolvida";
  }
}

export function getStatusBadgeProps(status: ReturnType<typeof deriveStrategyDisplayStatus>) {
  switch (status) {
    case "completed":
      return { variant: "default" as const, className: "bg-success/20 text-success border-success/30" };
    case "pending_approval":
      return { variant: "outline" as const, className: "border-blue-500/30 text-blue-400" };
    case "pending_admin_approval":
      return { variant: "outline" as const, className: "border-purple-500/30 text-purple-400" };
    case "in_progress":
      return { variant: "secondary" as const, className: "bg-info/20 text-info border-info/30" };
    case "pending":
      return { variant: "outline" as const, className: "border-warning/30 text-warning" };
    case "returned":
      return { variant: "destructive" as const, className: "bg-destructive/20 text-destructive border-destructive/30" };
  }
}

export interface ManagerStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  pendingApproval: number;
  completionRate: number;
}

export function calcManagerStats(strategies: any[], managerId: string): ManagerStats {
  const assigned = strategies.filter((s) => s.assigned_to === managerId);
  const total = assigned.length;
  let completed = 0, inProgress = 0, pendingApproval = 0;

  assigned.forEach((s) => {
    const displayStatus = deriveStrategyDisplayStatus(s);
    switch (displayStatus) {
      case "completed": completed++; break;
      case "pending_approval": pendingApproval++; break;
      case "pending_admin_approval": pendingApproval++; break;
      case "in_progress": inProgress++; break;
      case "returned": inProgress++; break;
      // "pending" falls through to be counted as pending below
    }
  });

  const pending = total - completed - inProgress - pendingApproval;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, inProgress, pending, pendingApproval, completionRate };
}

// ── Derived statuses for dashboard/Google Sheets ──

export type StatusPrazo =
  | "no_prazo"
  | "atrasada"
  | "vencendo_em_breve"
  | "finalizada_no_prazo"
  | "finalizada_atrasada";

export const STATUS_PRAZO_LABELS: Record<StatusPrazo, string> = {
  no_prazo: "No Prazo",
  atrasada: "Atrasada",
  vencendo_em_breve: "Vencendo em breve",
  finalizada_no_prazo: "Finalizada no prazo",
  finalizada_atrasada: "Finalizada atrasada",
};

export const STATUS_PRAZO_COLORS: Record<StatusPrazo, string> = {
  no_prazo: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  atrasada: "bg-destructive/20 text-destructive border-destructive/30",
  vencendo_em_breve: "bg-warning/20 text-warning border-warning/30",
  finalizada_no_prazo: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  finalizada_atrasada: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

/**
 * Derives status_prazo based on deadline, completion, and current date.
 */
export function deriveStatusPrazo(strategy: {
  status: string;
  deadline: string;
  completed_at?: string | null;
}): StatusPrazo {
  const now = new Date();
  const deadline = strategy.deadline ? new Date(strategy.deadline + "T23:59:59") : null;
  const isFinished = strategy.status === "approved";

  if (isFinished && deadline) {
    const completedAt = strategy.completed_at ? new Date(strategy.completed_at) : now;
    return completedAt <= deadline ? "finalizada_no_prazo" : "finalizada_atrasada";
  }

  if (!deadline) return "no_prazo";

  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffMs < 0) return "atrasada";
  if (diffDays <= 2) return "vencendo_em_breve";
  return "no_prazo";
}

export type StatusOperacional = "pendente" | "em_otimizacao" | "concluida";

export const STATUS_OPERACIONAL_LABELS: Record<StatusOperacional, string> = {
  pendente: "Pendente",
  em_otimizacao: "Em otimização",
  concluida: "Concluída",
};

export const STATUS_OPERACIONAL_COLORS: Record<StatusOperacional, string> = {
  pendente: "bg-warning/20 text-warning border-warning/30",
  em_otimizacao: "bg-primary/20 text-primary border-primary/30",
  concluida: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

/**
 * Derives status_operacional from strategy status + item states.
 */
export function deriveStatusOperacional(strategy: {
  status: string;
  categories: any[];
}): StatusOperacional {
  if (strategy.status === "approved") return "concluida";

  const allItems = (strategy.categories || []).flatMap((c: any) => c.items || []);
  const hasActivity = allItems.some(
    (i: any) => i.status === "in_progress" || i.status === "completed"
  );

  return hasActivity ? "em_otimizacao" : "pendente";
}
