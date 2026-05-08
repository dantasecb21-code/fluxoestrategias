import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, UserCheck } from "lucide-react";
import { formatDateBR, shortName } from "@/lib/utils";
import { PlatformBadge } from "@/components/PlatformBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export default function PendingValidation() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { strategies, loading } = useDbStrategies();
  const isAdmin = role === "admin";
  const isStrategic = role === "strategic";
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStrategist, setFilterStrategist] = useState<string>("all");
  const [strategistNames, setStrategistNames] = useState<Record<string, string>>({});

  const allPending = useMemo(
    () =>
      strategies.filter((s) => {
        if (s.status !== "pending_admin_approval") return false;
        if (isStrategic && s.user_id !== user?.id) return false;
        return true;
      }),
    [strategies, isStrategic, user?.id]
  );

  const strategistIds = useMemo(
    () => [...new Set(allPending.map((s) => s.user_id).filter(Boolean))],
    [allPending]
  );

  useEffect(() => {
    if (strategistIds.length === 0) return;
    supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", strategistIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((p) => { map[p.user_id] = p.display_name; });
          setStrategistNames(map);
        }
      });
  }, [strategistIds]);

  const list = useMemo(
    () =>
      allPending.filter((s) => {
        if (filterPlatform !== "all" && s.platform !== filterPlatform) return false;
        if (filterStrategist !== "all" && s.user_id !== filterStrategist) return false;
        return true;
      }),
    [allPending, filterPlatform, filterStrategist]
  );

  if (!isAdmin && !isStrategic) {
    return <p className="text-muted-foreground">Sem acesso.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Aguardando Validação</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Todas as estratégias enviadas para validação." : "Suas estratégias enviadas para validação."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            <SelectItem value="ifood">iFood</SelectItem>
            <SelectItem value="99food">99Food</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={filterStrategist} onValueChange={setFilterStrategist}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Estrategista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos estrategistas</SelectItem>
              {strategistIds.map((id) => (
                <SelectItem key={id} value={id}>
                  {strategistNames[id] || "Sem nome"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : list.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma estratégia aguardando validação.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((s) => (
            <Card
              key={s.id}
              className="p-5 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/estrategia/${s.id}`)}
            >
              <h3 className="font-heading font-semibold text-foreground text-lg flex items-center gap-2 min-w-0">
                <span className="truncate">{s.store_name || "Sem nome"}</span>
                <Badge className="text-[10px] py-0 px-1.5 h-4 leading-none shrink-0 bg-purple-500/20 text-purple-300 border-purple-500/30">
                  Aguardando validação
                </Badge>
                <PlatformBadge platform={s.platform} />
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                {s.operational_manager && (
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3" /> {shortName(s.operational_manager)}
                  </span>
                )}
                {s.deadline && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Prazo: {formatDateBR(s.deadline)}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
