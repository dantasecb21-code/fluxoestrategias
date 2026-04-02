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
}): "completed" | "pending_approval" | "in_progress" | "pending" {
  if (strategy.status === "approved") return "completed";

  const allItems = (strategy.categories || []).flatMap((c: any) => c.items || []);
  const hasInProgress = allItems.some(
    (i: any) => i.status === "in_progress" || i.status === "completed"
  );

  if (strategy.status === "pending_approval") {
    // If sent back and items are in progress, treat as in_progress
    return hasInProgress ? "in_progress" : "pending_approval";
  }

  // Normal flow
  if (hasInProgress) return "in_progress";
  return "pending";
}

export function getStatusLabel(status: ReturnType<typeof deriveStrategyDisplayStatus>): string {
  switch (status) {
    case "completed": return "Concluída ✓";
    case "pending_approval": return "Aguardando aprovação";
    case "in_progress": return "Em andamento";
    case "pending": return "Pendente";
  }
}

export function getStatusBadgeProps(status: ReturnType<typeof deriveStrategyDisplayStatus>) {
  switch (status) {
    case "completed":
      return { variant: "default" as const, className: "bg-success/20 text-success border-success/30" };
    case "pending_approval":
      return { variant: "outline" as const, className: "border-blue-500/30 text-blue-400" };
    case "in_progress":
      return { variant: "secondary" as const, className: "" };
    case "pending":
      return { variant: "outline" as const, className: "border-warning/30 text-warning" };
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
      case "in_progress": inProgress++; break;
      // "pending" falls through to be counted as pending below
    }
  });

  const pending = total - completed - inProgress - pendingApproval;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, inProgress, pending, pendingApproval, completionRate };
}
