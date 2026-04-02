import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StrategyCategory } from "@/types/strategy";
import type { Json } from "@/integrations/supabase/types";

export interface DbStrategy {
  id: string;
  user_id: string;
  assigned_to: string | null;
  store_name: string;
  manager_name: string;
  operational_manager: string;
  deadline: string;
  categories: StrategyCategory[];
  status: string;
  store_access_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

function jsonToCategories(json: Json): StrategyCategory[] {
  if (!Array.isArray(json)) return [];
  return json as unknown as StrategyCategory[];
}

function mapRow(s: any): DbStrategy {
  return { ...s, categories: jsonToCategories(s.categories) };
}

export function useDbStrategies() {
  const { user, role } = useAuth();
  const [strategies, setStrategies] = useState<DbStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStrategies = useCallback(async () => {
    if (!user) { setStrategies([]); setLoading(false); return; }

    let query = supabase.from("strategies").select("*");

    if (role === "operational") {
      query = query.eq("assigned_to", user.id);
    }
    // admin and strategic users see ALL strategies (no filter needed, RLS handles access)

    const { data } = await query.order("updated_at", { ascending: false });
    if (data) setStrategies(data.map(mapRow));
    setLoading(false);
  }, [user, role]);

  useEffect(() => { fetchStrategies(); }, [fetchStrategies]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("strategies-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "strategies",
      }, () => {
        fetchStrategies();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchStrategies]);

  const createStrategy = async (params: {
    store_name: string;
    manager_name: string;
    operational_manager: string;
    deadline: string;
    categories: StrategyCategory[];
    assigned_to?: string | null;
  }): Promise<DbStrategy | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("strategies")
      .insert({
        user_id: user.id,
        store_name: params.store_name,
        manager_name: params.manager_name,
        operational_manager: params.operational_manager,
        deadline: params.deadline,
        categories: params.categories as unknown as Json,
        assigned_to: params.assigned_to || null,
      })
      .select()
      .single();

    if (error || !data) return null;
    const mapped = mapRow(data);
    setStrategies((prev) => [mapped, ...prev]);
    return mapped;
  };

  const updateStrategy = async (id: string, params: {
    store_name?: string;
    manager_name?: string;
    operational_manager?: string;
    deadline?: string;
    categories?: StrategyCategory[];
    assigned_to?: string | null;
  }) => {
    const updateData: Record<string, unknown> = { ...params };
    if (params.categories) {
      updateData.categories = params.categories as unknown as Json;
    }
    await supabase.from("strategies").update(updateData).eq("id", id);
    fetchStrategies();
  };

  const deleteStrategy = async (id: string) => {
    await supabase.from("strategies").delete().eq("id", id);
    setStrategies((prev) => prev.filter((s) => s.id !== id));
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
    });
  };

  return { strategies, loading, createStrategy, updateStrategy, deleteStrategy, duplicateStrategy, refetch: fetchStrategies };
}
