export type ItemStatus = "pending" | "in_progress" | "completed";

export interface StrategyItem {
  id: string;
  name: string;
  text: string;
  checked: boolean;
  status?: ItemStatus;
  observation?: string;
}

export interface StrategyCategory {
  id: string;
  name: string;
  items: StrategyItem[];
}

export interface StrategyMeta {
  storeName: string;
  managerName: string;
  operationalManager: string;
  deadline: string;
}

export const STATUS_LABELS: Record<ItemStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluído",
};

export const STATUS_COLORS: Record<ItemStatus, string> = {
  pending: "text-warning",
  in_progress: "text-primary",
  completed: "text-success",
};

export const DEFAULT_CATEGORIES: StrategyCategory[] = [];