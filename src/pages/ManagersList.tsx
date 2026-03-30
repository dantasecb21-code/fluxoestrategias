import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, UserCheck } from "lucide-react";

interface OperationalManager {
  user_id: string;
  display_name: string;
  email?: string;
}

export default function ManagersList() {
  const [managers, setManagers] = useState<OperationalManager[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchManagers() {
      // Get all users with 'operational' role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "operational");

      if (roles && roles.length > 0) {
        const userIds = roles.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);

        if (profiles) {
          setManagers(profiles.map((p) => ({
            user_id: p.user_id,
            display_name: p.display_name,
          })));
        }
      }
      setLoading(false);
    }
    fetchManagers();
  }, []);

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
          Lista de gestores operacionais cadastrados no sistema.
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
          {managers.map((m) => (
            <Card key={m.user_id} className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{m.display_name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">Gestor Operacional</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
