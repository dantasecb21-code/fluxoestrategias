import { useEffect, useState } from "react";
import { shortName } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, UserX, ShieldCheck, Clock, AlertTriangle, Eye } from "lucide-react";
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

const AVAILABLE_PLATFORMS = [
  { value: "99food", label: "99Food" },
  { value: "ifood", label: "iFood" },
  { value: "keeta", label: "Keeta" },
];

interface PendingUser {
  user_id: string;
  display_name: string;
  approved: boolean;
  roles: string[];
  email: string;
  whatsapp: string;
  platforms: string[];
}

export default function UserApproval() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, approved, whatsapp, platforms");

    if (!profiles) { setLoading(false); return; }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const roleMap = new Map<string, string[]>();
    const rolePriority: Record<string, number> = { admin: 0, strategic: 1, operational: 2 };
    roles?.forEach((r) => {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) || []), r.role]);
    });
    roleMap.forEach((userRoles, userId) => {
      roleMap.set(userId, [...new Set(userRoles)].sort((a, b) => (rolePriority[a] ?? 99) - (rolePriority[b] ?? 99)));
    });

    const mapped: PendingUser[] = profiles.map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      approved: p.approved,
      roles: roleMap.get(p.user_id) || [],
      email: "",
      whatsapp: p.whatsapp || "",
      platforms: (p as any).platforms || [],
    }));

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

    if (error) { toast.error("Erro ao aprovar usuário"); return; }
    toast.success("Usuário aprovado com sucesso!");
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, approved: true } : u));
  };

  const handleReject = async (userId: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);

    if (error) { toast.error("Erro ao recusar usuário"); return; }
    toast.success("Usuário recusado e removido");
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
  };

  const handleRevoke = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approved: false })
      .eq("user_id", userId);

    if (error) { toast.error("Erro ao revogar acesso"); return; }
    toast.success("Acesso revogado");
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, approved: false } : u));
  };

  const handleRoleToggle = async (userId: string, targetRole: string) => {
    const user = users.find((u) => u.user_id === userId);
    if (!user) return;
    const hasRole = user.roles.includes(targetRole);

    if (hasRole && user.roles.length <= 1) {
      toast.error("O usuário precisa ter pelo menos um cargo");
      return;
    }

    const result = hasRole
      ? await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", targetRole as any)
      : await supabase.from("user_roles").insert({ user_id: userId, role: targetRole as any });

    if (result.error) { toast.error("Erro ao alterar cargos"); return; }

    const newRoles = hasRole ? user.roles.filter((role) => role !== targetRole) : [...user.roles, targetRole];
    toast.success("Cargos atualizados");
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, roles: newRoles } : u));
  };

  const handlePlatformToggle = async (userId: string, platform: string) => {
    const user = users.find((u) => u.user_id === userId);
    if (!user) return;
    const newPlatforms = user.platforms.includes(platform)
      ? user.platforms.filter((p) => p !== platform)
      : [...user.platforms, platform];

    const { error } = await supabase
      .from("profiles")
      .update({ platforms: newPlatforms } as any)
      .eq("user_id", userId);

    if (error) { toast.error("Erro ao alterar plataformas"); return; }
    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, platforms: newPlatforms } : u));
    toast.success("Plataformas atualizadas");
  };

  const roleLabel = (role: string) => {
    if (role === "admin") return "Administrador";
    if (role === "strategic") return "Gestor Estratégico";
    if (role === "operational") return "Gestor Operacional";
    return role;
  };

  const pendingUsers = users.filter((u) => !u.approved);
  const approvedUsers = users.filter((u) => u.approved);

  const UserCard = ({ u, isPending }: { u: PendingUser; isPending: boolean }) => (
    <Card key={u.user_id} className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isPending ? "bg-warning/20" : "bg-success/20"}`}>
            {isPending ? <Clock className="h-5 w-5 text-warning" /> : <UserCheck className="h-5 w-5 text-success" />}
          </div>
          <div>
            <p className="font-medium text-foreground">{shortName(u.display_name) || "Sem nome"}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {u.whatsapp && <span className="text-xs text-muted-foreground">📱 {u.whatsapp}</span>}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(`/perfil/${u.user_id}`)}
          className="text-muted-foreground hover:text-primary"
        >
          <Eye className="h-4 w-4 mr-1" /> Perfil
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Cargos:</span>
          {(["admin", "strategic", "operational"] as const).map((userRole) => {
            const active = u.roles.includes(userRole);
            return (
              <button
                key={userRole}
                type="button"
                onClick={() => handleRoleToggle(u.user_id, userRole)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {roleLabel(userRole)}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Plataformas:</span>
          <div className="flex gap-1.5">
            {AVAILABLE_PLATFORMS.map((p) => {
              const active = u.platforms.includes(p.value);
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePlatformToggle(u.user_id, p.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-3">

        <div className="flex gap-2">
          {isPending ? (
            <>
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
                      Tem certeza que deseja recusar <strong>{shortName(u.display_name)}</strong>? O cadastro será removido.
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
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => handleRevoke(u.user_id)} className="text-muted-foreground hover:text-destructive">
              Revogar acesso
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          Gerencie o acesso e tipo de cada usuário. Apenas usuários aprovados podem utilizar a plataforma.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-6">
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
                {pendingUsers.map((u) => <UserCard key={u.user_id} u={u} isPending />)}
              </div>
            )}
          </div>

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
                {approvedUsers.map((u) => <UserCard key={u.user_id} u={u} isPending={false} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
