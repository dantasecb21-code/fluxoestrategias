import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type CompetitorStudyStatus = "pending" | "in_progress" | "completed";

export interface CompetitorStudy {
  id: string;
  strategy_id: string;
  store_name: string;
  platform: string;
  strategic_user_id: string;
  assigned_to: string | null;
  status: CompetitorStudyStatus;
  notes: string;
  competitors: string;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  paused: boolean;
  pause_reason: string;
}

export function useCompetitorStudies() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<CompetitorStudy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudies = useCallback(async () => {
    if (!user) { setStudies([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("competitor_studies" as any)
      .select("*")
      .not("store_request_id", "is", null)
      .order("created_at", { ascending: false });
    if (!error && data) setStudies(data as unknown as CompetitorStudy[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStudies(); }, [fetchStudies]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`competitor-studies-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "competitor_studies" }, () => fetchStudies())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchStudies]);

  const updateStudy = async (id: string, patch: Partial<CompetitorStudy>) => {
    const { error } = await supabase.from("competitor_studies" as any).update(patch as any).eq("id", id);
    if (!error) fetchStudies();
    return !error;
  };

  const startStudy = (id: string) =>
    updateStudy(id, { status: "in_progress", started_at: new Date().toISOString() } as any);

  const completeStudy = (id: string, notes?: string) =>
    updateStudy(id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by: user?.id ?? null,
      ...(notes !== undefined ? { notes } : {}),
    } as any);

  const resetToPending = (id: string) =>
    updateStudy(id, {
      status: "pending",
      started_at: null,
      completed_at: null,
      completed_by: null,
    } as any);

  const togglePauseStudy = (id: string, paused: boolean, pause_reason?: string) =>
    updateStudy(id, { paused, pause_reason: paused ? (pause_reason ?? "") : "" } as any);

  return { studies, loading, refetch: fetchStudies, updateStudy, startStudy, completeStudy, resetToPending, togglePauseStudy };
}