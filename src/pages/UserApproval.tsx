import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserX, ShieldCheck, Clock, Trash2, AlertTriangle } from "lucide-react";
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

interface PendingUser {
  user_id: string;
  display_name: string;
  approved: boolean;
  role: string;
  email?: string;
}

export default function UserApproval() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, approved");

    if (!profiles) { setLoading(false); return; }

    // Get roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const roleMap = new Map<string, string>();
    roles?.forEach((r) => roleMap.set(r.user_id, r.role));

    const mapped: PendingUser[] = profiles.map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      approved: p.approved,
      role: roleMap.get(p.user_id) || "unknown",
    }));

    // Show pending first, then approved
    mapped.sort((a, b) => {
      if (a.approved === b.approved) return 0;
      return a.approved ? 1 : -1;
    });

    setUsers(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approved: true })
      .eq("user_id", userId);

    if (error) {
      toast.error("Erro ao aprovar usuário");
      return;
    }
    toast.success("Usuário aprovado com sucesso!");
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, approved: true } : u));
  };

  const handleReject = async (userId: string) => {
    // Delete role and profile
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);

    if (error) {
      toast.error("Erro ao recusar usuário");
      return;
    }
    toast.success("Usuário recusado e removido");
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
  };

  const handleRevoke = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approved: false })
      .eq("user_id", userId);

    if (error) {
      toast.error("Erro ao revogar acesso");
      return;
    }
    toast.success("Acesso revogado");
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, approved: false } : u));
  };

  const roleLabel = (role: string) => {
    if (role === "admin") return "Gestor Estratégico";
    if (role === "operational") return "Gestor Operacional";
    return role;
  };

  const pendingUsers = users.filter((u) => !u.approved);
  const approvedUsers = users.filter((u) => u.approved);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-foreground">
            Aprovação de <span className="text-primary">Usuários</span>
          </h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie o acesso dos usuários ao sistema. Apenas usuários aprovados podem utilizar a plataforma.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" /> Pendentes de Aprovação ({pendingUsers.length})
            </h2>
            {pendingUsers.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <p className="text-muted-foreground">Nenhum usuário pendente de aprovação.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {pendingUsers.map((u) => (
                  <Card key={u.user_id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.display_name || "Sem nome"}</p>
                        <Badge variant="outline" className="text-xs mt-0.5">{roleLabel(u.role)}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(u.user_id)} className="bg-success hover:bg-success/90 text-success-foreground">
                        <UserCheck className="h-4 w-4 mr-1" /> Aprovar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <UserX className="h-4 w-4 mr-1" /> Recusar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" /> Recusar usuário
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja recusar <strong>{u.display_name}</strong>? O cadastro será removido.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleReject(u.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Recusar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Approved */}
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-success" /> Usuários Aprovados ({approvedUsers.length})
            </h2>
            {approvedUsers.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <p className="text-muted-foreground">Nenhum usuário aprovado ainda.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {approvedUsers.map((u) => (
                  <Card key={u.user_id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.display_name || "Sem nome"}</p>
                        <Badge variant="outline" className="text-xs mt-0.5">{roleLabel(u.role)}</Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleRevoke(u.user_id)} className="text-muted-foreground hover:text-destructive">
                      Revogar acesso
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
