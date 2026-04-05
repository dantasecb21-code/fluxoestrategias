import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Crown, Flame, TrendingUp } from "lucide-react";

interface RankedManager {
  user_id: string;
  display_name: string;
  avatar_url: string;
  completed: number;
  waiting: number;
  inProgress: number;
  pending: number;
  total: number;
}

export default function OperationalRanking() {
  const [ranking, setRanking] = useState<RankedManager[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      // Get all operational users
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "operational");

      if (!roles || roles.length === 0) {
        setLoading(false);
        return;
      }

      const userIds = roles.map((r) => r.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds)
        .eq("approved", true);

      // Get strategies assigned to operational managers
      const { data: strategies } = await supabase
        .from("strategies")
        .select("assigned_to, status")
        .in("assigned_to", userIds)
        .is("deleted_at", null);

      // Calculate strategy counts per manager
      const statsMap: Record<string, { completed: number; waiting: number; inProgress: number; pending: number; total: number }> = {};
      userIds.forEach((uid) => {
        statsMap[uid] = { completed: 0, waiting: 0, inProgress: 0, pending: 0, total: 0 };
      });

      (strategies || []).forEach((s: any) => {
        const uid = s.assigned_to;
        if (!uid || !statsMap[uid]) return;
        statsMap[uid].total += 1;
        if (s.status === "completed") statsMap[uid].completed += 1;
        else if (s.status === "waiting") statsMap[uid].waiting += 1;
        else if (s.status === "in_progress") statsMap[uid].inProgress += 1;
        else statsMap[uid].pending += 1;
      });

      const ranked: RankedManager[] = (profiles || [])
        .map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name || "Sem nome",
          avatar_url: p.avatar_url || "",
          ...statsMap[p.user_id] || { completed: 0, waiting: 0, inProgress: 0, pending: 0, total: 0 },
        }))
        .sort((a, b) => 
          b.completed - a.completed || 
          b.waiting - a.waiting || 
          b.inProgress - a.inProgress
        );

      setRanking(ranked);
      setLoading(false);
    }

    fetchRanking();
  }, []);

  const positionStyle = (pos: number) => {
    if (pos === 0) return "from-yellow-500/20 to-yellow-600/5 border-yellow-500/40";
    if (pos === 1) return "from-slate-300/20 to-slate-400/5 border-slate-400/40";
    if (pos === 2) return "from-amber-700/20 to-amber-800/5 border-amber-700/40";
    return "from-muted/30 to-muted/5 border-border";
  };

  const positionIcon = (pos: number) => {
    if (pos === 0) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (pos === 1) return <Medal className="h-6 w-6 text-slate-300" />;
    if (pos === 2) return <Medal className="h-6 w-6 text-amber-700" />;
    return null;
  };

  const positionLabel = (pos: number) => {
    return `${pos + 1}º`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-white" />
          </div>
        </div>
        <h1 className="font-heading font-bold text-3xl text-foreground">
          Ranking <span className="text-primary">Operacional</span>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm flex items-center justify-center gap-1">
          <Flame className="h-4 w-4 text-orange-500" />
          Quem está executando mais? Confira a posição de cada gestor!
        </p>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Carregando ranking...</p>
      ) : ranking.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Nenhum gestor encontrado</h2>
          <p className="text-muted-foreground">Ainda não há dados para o ranking.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {ranking.map((manager, index) => (
            <Card
              key={manager.user_id}
              className={`p-4 border bg-gradient-to-r ${positionStyle(index)} transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-center gap-4">
                {/* Position */}
                <div className="flex flex-col items-center justify-center min-w-[48px]">
                  {positionIcon(index)}
                  <span className={`font-heading font-bold text-lg ${
                    index === 0 ? "text-yellow-500" : 
                    index === 1 ? "text-slate-300" : 
                    index === 2 ? "text-amber-700" : "text-muted-foreground"
                  }`}>
                    {positionLabel(index)}
                  </span>
                </div>

                {/* Avatar */}
                <div className={`h-12 w-12 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${
                  index === 0 ? "ring-2 ring-yellow-500 ring-offset-2 ring-offset-background" : 
                  index === 1 ? "ring-2 ring-slate-300 ring-offset-2 ring-offset-background" :
                  index === 2 ? "ring-2 ring-amber-700 ring-offset-2 ring-offset-background" : ""
                } bg-muted`}>
                  {manager.avatar_url ? (
                    <img src={manager.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {manager.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`font-heading font-semibold truncate ${
                    index === 0 ? "text-yellow-500 text-lg" : "text-foreground"
                  }`}>
                    {manager.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Gestor Operacional</p>
                </div>

                {/* Progress indicator - no numbers, just visual */}
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        index === 0 ? "bg-yellow-500" :
                        index === 1 ? "bg-slate-300" :
                        index === 2 ? "bg-amber-700" : "bg-primary"
                      }`}
                      style={{ width: `${manager.total > 0 ? Math.round((manager.completed / manager.total) * 100) : 0}%` }}
                    />
                  </div>
                  {index < 3 && (
                    <TrendingUp className={`h-4 w-4 ${
                      index === 0 ? "text-yellow-500" :
                      index === 1 ? "text-slate-300" : "text-amber-700"
                    }`} />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
