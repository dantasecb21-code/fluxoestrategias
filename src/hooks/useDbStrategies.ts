import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StrategyCategory } from "@/types/strategy";
import type { Json } from "@/integrations/supabase/types";
import {
  deriveStatusPrazo,
  deriveStatusOperacional,
  STATUS_PRAZO_LABELS,
  STATUS_OPERACIONAL_LABELS,
} from "@/lib/strategyStatus";

export type StrategyType = "initial" | "alignment" | "retention";

export const STRATEGY_TYPE_LABELS: Record<StrategyType, string> = {
  initial: "Estratégia Inicial",
  alignment: "Estratégia de Alinhamento",
  retention: "Estratégia de Retenção",
};

export interface DbStrategy {
  id: string;
  user_id: string;
  store_request_id?: string | null;
  assigned_to: string | null;
  store_name: string;
  manager_name: string;
  operational_manager: string;
  deadline: string;
  categories: StrategyCategory[];
  status: string;
  strategy_type: StrategyType;
  observation: string;
  store_access_confirmed: boolean;
  returned: boolean;
  platform: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

function jsonToCategories(json: Json): StrategyCategory[] {
  if (!Array.isArray(json)) return [];
  return json as unknown as StrategyCategory[];
}

function mapRow(s: any): DbStrategy {
  return { ...s, categories: jsonToCategories(s.categories) };
}

const STRATEGY_TYPE_DISPLAY: Record<string, string> = {
  initial: "Estratégia Inicial",
  alignment: "Estratégia de Alinhamento",
  retention: "Estratégia de Retenção",
};

const PLATFORM_DISPLAY: Record<string, string> = {
  "99food": "99Food",
  ifood: "iFood",
  keeta: "Keeta",
};

/** Fire-and-forget sync to Google Sheets via Edge Function */
async function syncToSheets(strategy: DbStrategy) {
  try {
    const statusPrazo = deriveStatusPrazo(strategy);
    const statusOp = deriveStatusOperacional(strategy);

    // Calculate execution time in days
    let executionTime = "";
    if (strategy.started_at && strategy.completed_at) {
      const start = new Date(strategy.started_at);
      const end = new Date(strategy.completed_at);
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      executionTime = `${days} dias`;
    }

    await supabase.functions.invoke("sync-to-sheets", {
      body: {
        id: strategy.id,
        created_at: new Date(strategy.created_at).toLocaleDateString("pt-BR"),
        store_name: strategy.store_name,
        platform: PLATFORM_DISPLAY[strategy.platform] || strategy.platform,
        strategy_type: STRATEGY_TYPE_DISPLAY[strategy.strategy_type] || strategy.strategy_type,
        manager_name: strategy.manager_name,
        operational_manager: strategy.operational_manager,
        status_operacional: STATUS_OPERACIONAL_LABELS[statusOp],
        status_prazo: STATUS_PRAZO_LABELS[statusPrazo],
        started_at: strategy.started_at ? new Date(strategy.started_at).toLocaleDateString("pt-BR") : "",
        deadline: strategy.deadline ? new Date(strategy.deadline).toLocaleDateString("pt-BR") : "",
        completed_at: strategy.completed_at ? new Date(strategy.completed_at).toLocaleDateString("pt-BR") : "",
        execution_time: executionTime,
        observation: strategy.observation,
      },
    });
  } catch (err) {
    console.warn("Sync to sheets failed (non-blocking):", err);
  }
}

export function useDbStrategies() {
  const { user, role, platforms } = useAuth();
  const [strategies, setStrategies] = useState<DbStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStrategies = useCallback(async () => {
    if (!user) { setStrategies([]); setLoading(false); return; }

    let query = supabase.from("strategies").select("*").is("deleted_at", null);

    if (role === "operational") {
      query = query.eq("assigned_to", user.id);
    }

    // Filter by user's platforms (admin sees all)
    if (role !== "admin" && platforms.length > 0) {
      query = query.in("platform", platforms);
    }

    const { data } = await query.order("updated_at", { ascending: false });
    if (data) setStrategies(data.map(mapRow));
    setLoading(false);
  }, [user, role, platforms]);

  useEffect(() => { fetchStrategies(); }, [fetchStrategies]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const channelId = `strategies-rt-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelId);
    
    channel
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "strategies",
      }, () => {
        if (!cancelled) fetchStrategies();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, fetchStrategies]);

  const createStrategy = async (params: {
    store_name: string;
    manager_name: string;
    operational_manager: string;
    deadline: string;
    categories: StrategyCategory[];
    assigned_to?: string | null;
    strategy_type?: string;
    observation?: string;
    store_request_id?: string;
    platform?: string;
  }): Promise<DbStrategy | null> => {
    if (!user) return null;
    const insertData: any = {
      user_id: user.id,
      store_name: params.store_name,
      manager_name: params.manager_name,
      operational_manager: params.operational_manager,
      deadline: params.deadline,
      categories: params.categories as unknown as Json,
      assigned_to: params.assigned_to || null,
      strategy_type: params.strategy_type || "initial",
      observation: params.observation || "",
      platform: params.platform || "99food",
    };
    if (params.store_request_id) {
      insertData.store_request_id = params.store_request_id;
    }
    const { data, error } = await supabase
      .from("strategies")
      .insert(insertData)
      .select()
      .single();

    if (error || !data) return null;
    const mapped = mapRow(data);
    setStrategies((prev) => [mapped, ...prev]);
    syncToSheets(mapped);
    return mapped;
  };

  const updateStrategy = async (id: string, params: {
    store_name?: string;
    manager_name?: string;
    operational_manager?: string;
    deadline?: string;
    categories?: StrategyCategory[];
    assigned_to?: string | null;
    status?: string;
    strategy_type?: string;
    observation?: string;
    store_access_confirmed?: boolean;
    returned?: boolean;
    platform?: string;
    started_at?: string;
    completed_at?: string;
  }) => {
    // Track status change in history
    if (params.status && user) {
      const oldStrategy = strategies.find((s) => s.id === id);
      if (oldStrategy && oldStrategy.status !== params.status) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();

        await supabase.from("strategy_history").insert({
          strategy_id: id,
          user_id: user.id,
          user_name: profile?.display_name || user.email || "",
          action: "status_change",
          field_changed: "status",
          old_value: oldStrategy.status || "in_progress",
          new_value: params.status,
        });
      }
    }

    const updateData: Record<string, unknown> = { ...params };
    if (params.categories) {
      updateData.categories = params.categories as unknown as Json;
    }

    // Fetch fresh state from DB to avoid stale closure issues
    const { data: freshStrategy } = await supabase
      .from("strategies")
      .select("started_at, completed_at, status, store_request_id")
      .eq("id", id)
      .single();

    // Auto-fill started_at: when any category item changes to in_progress/completed for the first time
    if (params.categories && freshStrategy && !freshStrategy.started_at) {
      const allItems = params.categories.flatMap((c) => c.items || []);
      const hasActivity = allItems.some((i) => i.status === "in_progress" || i.status === "completed");
      if (hasActivity) {
        updateData.started_at = new Date().toISOString();
      }
    }

    // Auto-fill completed_at: when operacional sends for approval (pending_approval)
    // Also updates if re-sent after being returned
    if (params.status === "pending_approval" && freshStrategy) {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase.from("strategies").update(updateData as any).eq("id", id);
    if (error) {
      console.error("Update strategy error:", error);
    }
    if (!error && freshStrategy?.store_request_id && ["pending_approval", "approved"].includes(params.status || "")) {
      const { error: requestError } = await supabase
        .from("store_requests")
        .update({ status: "completed", store_creation_status: "created" } as any)
        .eq("id", freshStrategy.store_request_id);

      if (requestError) {
        console.error("Update linked store request error:", requestError);
      }
    }
    // Sync to sheets after update
    const localStrategy = strategies.find((s) => s.id === id);
    if (localStrategy) {
      const merged = { ...localStrategy, ...updateData, categories: params.categories || localStrategy.categories } as DbStrategy;
      syncToSheets(merged);
    }
    fetchStrategies();
  };

  const deleteStrategy = async (id: string) => {
    await supabase.from("strategies").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    setStrategies((prev) => prev.filter((s) => s.id !== id));
  };

  const restoreStrategy = async (id: string) => {
    await supabase.from("strategies").update({ deleted_at: null } as any).eq("id", id);
    fetchStrategies();
  };

  const fetchDeletedStrategies = async (): Promise<DbStrategy[]> => {
    if (!user) return [];
    let query = supabase.from("strategies").select("*").not("deleted_at", "is", null);
    if (role === "operational") {
      query = query.eq("assigned_to", user.id);
    }
    if (role !== "admin" && platforms.length > 0) {
      query = query.in("platform", platforms);
    }
    const { data } = await query.order("deleted_at", { ascending: false });
    return data ? data.map(mapRow) : [];
  };

  const permanentDeleteStrategy = async (id: string) => {
    await supabase.from("strategies").delete().eq("id", id);
  };

  const duplicateStrategy = async (id: string): Promise<DbStrategy | null> => {
    const original = strategies.find((s) => s.id === id);
    if (!original || !user) return null;
    return createStrategy({
      store_name: original.store_name + " (Cópia)",
      manager_name: original.manager_name,
      operational_manager: original.operational_manager,
      deadline: original.deadline,
      categories: JSON.parse(JSON.stringify(original.categories)),
      assigned_to: original.assigned_to,
      platform: original.platform,
    });
  };

  return { strategies, loading, createStrategy, updateStrategy, deleteStrategy, duplicateStrategy, restoreStrategy, fetchDeletedStrategies, permanentDeleteStrategy, refetch: fetchStrategies };
}
