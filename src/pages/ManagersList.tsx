import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, UserCheck, Trophy, Trash2, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OperationalManager {
  user_id: string;
  display_name: string;
  whatsapp: string;
  avatar_url: string;
}

function calcManagerStats(strategies: any[], managerId: string) {
  const assigned = strategies.filter((s) => s.assigned_to === managerId);
  const total = assigned.length;
  let completed = 0;
  let inProgress = 0;

  assigned.forEach((s) => {
    const allItems = s.categories.flatMap((c: any) => c.items);
    if (allItems.length === 0) return;
    const allCompleted = allItems.every((i: any) => i.status === "completed");
    const hasStarted = allItems.some((i: any) => i.status === "in_progress" || i.status === "completed");
    if (allCompleted) completed++;
    else if (hasStarted) inProgress++;
  });

  const pending = total - completed - inProgress;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, inProgress, pending, completionRate };
}

export default function ManagersList() {
  const [managers, setManagers] = useState<OperationalManager[]>([]);
  const [loading, setLoading] = useState(true);
  const { strategies } = useDbStrategies();
  const navigate = useNavigate();

  const fetchManagers = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "operational");

    if (roles && roles.length > 0) {
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, whatsapp, avatar_url")
        .in("user_id", userIds);

      if (profiles) {
        setManagers(profiles.map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name,
          whatsapp: p.whatsapp || "",
          avatar_url: p.avatar_url || "",
        })));
      }
    } else {
      setManagers([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchManagers(); }, []);

  const handleDeleteManager = async (managerId: string) => {
    // Remove the operational role (user can no longer access operational panel)
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", managerId)
      .eq("role", "operational");

    if (error) {
      toast.error("Erro ao remover gestor");
      return;
    }

    toast.success("Acesso do gestor removido com sucesso");
    setManagers((prev) => prev.filter((m) => m.user_id !== managerId));
  };

  // Sort by completion rate descending (ranking)
  const sortedManagers = [...managers].sort((a, b) => {
    const statsA = calcManagerStats(strategies, a.user_id);
    const statsB = calcManagerStats(strategies, b.user_id);
    return statsB.completed - statsA.completed || statsB.completionRate - statsA.completionRate;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Users className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Gestores <span className="text-primary">Operacionais</span>
          </h1>
        </div>
        <p className="text-muted-foreground">
          Ranking de desempenho e gestão de acessos dos gestores operacionais.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : managers.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-heading font-semibold text-xl text-foreground mb-2">Nenhum gestor cadastrado</h2>
          <p className="text-muted-foreground">Os gestores operacionais precisam criar conta selecionando "Gestor Operacional" no cadastro.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedManagers.map((m, index) => {
            const stats = calcManagerStats(strategies, m.user_id);
            return (
              <Card key={m.user_id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                      index === 1 ? "bg-gray-400/20 text-gray-400" :
                      index === 2 ? "bg-amber-700/20 text-amber-700" :
                      "bg-primary/10 text-primary"
                    }`}>
                      {index < 3 ? <Trophy className="h-5 w-5" /> : `#${index + 1}`}
                    </div>
                     <div>
                       <p className="font-heading font-semibold text-foreground">{m.display_name || "Sem nome"}</p>
                       <p className="text-xs text-muted-foreground">Gestor Operacional</p>
                       {m.whatsapp && <p className="text-xs text-muted-foreground">📱 {m.whatsapp}</p>}
                       <button onClick={() => navigate(`/perfil/${m.user_id}`)} className="text-xs text-primary hover:underline mt-0.5">Ver perfil →</button>
                     </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" /> Remover acesso
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover o acesso operacional de <strong>{m.display_name}</strong>? 
                          O gestor não poderá mais acessar o painel operacional.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteManager(m.user_id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center p-2 rounded-lg bg-success/10">
                    <p className="font-heading font-bold text-lg text-success">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-primary/10">
                    <p className="font-heading font-bold text-lg text-primary">{stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground">Em andamento</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-warning/10">
                    <p className="font-heading font-bold text-lg text-warning">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Taxa de conclusão</span>
                    <span className="font-medium text-foreground">{stats.completionRate}%</span>
                  </div>
                  <Progress value={stats.completionRate} className="h-1.5" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
