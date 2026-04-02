import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Camera, Phone, Mail, Shield, CheckCircle, Clock, Edit2, Save, X, FileText } from "lucide-react";
import { toast } from "sonner";

interface ProfileData {
  user_id: string;
  display_name: string;
  whatsapp: string;
  approved: boolean;
  avatar_url: string;
  status_text: string;
}

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, role: myRole } = useAuth();
  const { strategies } = useDbStrategies();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userRole, setUserRole] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: "", whatsapp: "", status_text: "" });
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = user?.id === userId;
  const isAdmin = myRole === "admin";
  const canEdit = isOwnProfile || isAdmin;
  const canViewHistory = myRole === "admin" || myRole === "strategic";

  useEffect(() => {
    async function fetchProfile() {
      if (!userId) return;
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, whatsapp, approved, avatar_url, status_text, email").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId).single(),
      ]);
      if (profileRes.data) {
        const p = profileRes.data as ProfileData;
        setProfile(p);
        setEditForm({ display_name: p.display_name, whatsapp: p.whatsapp, status_text: p.status_text || "" });
        if ((p as any).email) setUserEmail((p as any).email);
      }
      if (roleRes.data) setUserRole(roleRes.data.role);
      setLoading(false);
    }
    fetchProfile();
  }, [userId]);

  const roleLabel = (role: string) => {
    if (role === "admin") return "Administrador";
    if (role === "strategic") return "Gestor Estratégico";
    if (role === "operational") return "Gestor Operacional";
    return role;
  };

  const handleAvatarUpload = async (file: File) => {
    if (!userId || !canEdit) return;
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Erro ao enviar imagem"); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", userId);
    if (error) { toast.error("Erro ao salvar"); return; }
    setProfile((prev) => prev ? { ...prev, avatar_url: urlData.publicUrl } : prev);
    toast.success("Foto de perfil atualizada!");
  };

  const handleSaveProfile = async () => {
    if (!userId || !canEdit) return;
    const { error } = await supabase.from("profiles").update({
      display_name: editForm.display_name,
      whatsapp: editForm.whatsapp,
      status_text: editForm.status_text,
    }).eq("user_id", userId);
    if (error) { toast.error("Erro ao salvar"); return; }
    setProfile((prev) => prev ? { ...prev, ...editForm } : prev);
    setEditing(false);
    toast.success("Perfil atualizado!");
  };

  // Completed strategies for this user
  const completedStrategies = userId ? strategies.filter((s) => {
    if (s.assigned_to !== userId) return false;
    return s.status === "approved";
  }) : [];

  // Stats
  const managerStats = userId ? (() => {
    const assigned = strategies.filter((s) => s.assigned_to === userId);
    const total = assigned.length;
    let completed = 0, inProgress = 0, pendingApproval = 0;
    assigned.forEach((s) => {
      if (s.status === "approved") { completed++; return; }
      if (s.status === "pending_approval") { pendingApproval++; return; }
      const items = (s.categories as any[]).flatMap((c: any) => c.items);
      if (items.length === 0) return;
      if (items.some((i: any) => i.status === "in_progress" || i.status === "completed")) inProgress++;
    });
    const pending = total - completed - inProgress - pendingApproval;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, pendingApproval, rate };
  })() : null;

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  if (!profile) return <div className="flex items-center justify-center h-64 text-muted-foreground">Perfil não encontrado</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      {/* Profile Card */}
      <Card className="p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-full border-2 border-border bg-muted flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {profile.display_name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            {canEdit && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ""; }} />
              </>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              {editing ? (
                <Input value={editForm.display_name} onChange={(e) => setEditForm(f => ({ ...f, display_name: e.target.value }))} className="h-8 text-lg font-bold" />
              ) : (
                <h1 className="font-heading font-bold text-xl text-foreground truncate">{profile.display_name || "Sem nome"}</h1>
              )}
              {canEdit && !editing && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditing(true)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">{roleLabel(userRole)}</Badge>
              <Badge className={`text-xs ${profile.approved ? "bg-success/20 text-success border-success/30" : "bg-warning/20 text-warning border-warning/30"}`}>
                {profile.approved ? <><CheckCircle className="h-3 w-3 mr-1" /> Aprovado</> : <><Clock className="h-3 w-3 mr-1" /> Pendente</>}
              </Badge>
            </div>

            {/* Status text */}
            {editing ? (
              <Input
                value={editForm.status_text}
                onChange={(e) => setEditForm(f => ({ ...f, status_text: e.target.value }))}
                placeholder="Como está seu dia? Escreva algo..."
                className="h-8 text-sm mb-2"
              />
            ) : (
              profile.status_text && <p className="text-sm text-muted-foreground italic mb-2">"{profile.status_text}"</p>
            )}

            {/* Contact info */}
            <div className="space-y-1.5">
              {editing ? (
                <Input
                  value={editForm.whatsapp}
                  onChange={(e) => setEditForm(f => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="WhatsApp"
                  className="h-8 text-sm"
                />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{profile.whatsapp || "Não informado"}</span>
                  </div>
                  {userEmail && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{userEmail}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {editing && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleSaveProfile}><Save className="h-3.5 w-3.5 mr-1" /> Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditForm({ display_name: profile.display_name, whatsapp: profile.whatsapp, status_text: profile.status_text || "" }); }}><X className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Performance Stats */}
      {managerStats && managerStats.total > 0 && (
        <Card className="p-5 space-y-3">
          <h3 className="font-heading font-semibold text-foreground">Desempenho</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2.5 rounded-lg bg-success/10">
              <p className="font-heading font-bold text-xl text-success">{managerStats.completed}</p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-primary/10">
              <p className="font-heading font-bold text-xl text-primary">{managerStats.inProgress}</p>
              <p className="text-xs text-muted-foreground">Em andamento</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-warning/10">
              <p className="font-heading font-bold text-xl text-warning">{managerStats.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Taxa de conclusão</span>
              <span className="font-medium text-foreground">{managerStats.rate}%</span>
            </div>
            <Progress value={managerStats.rate} className="h-1.5" />
          </div>
        </Card>
      )}

      {/* Completed Strategies History */}
      {canViewHistory && completedStrategies.length > 0 && (
        <Card className="p-5 space-y-3">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-success" /> Estratégias Concluídas ({completedStrategies.length})
          </h3>
          <div className="space-y-2">
            {completedStrategies.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/10 cursor-pointer hover:bg-success/10 transition-colors"
                onClick={() => navigate(`/estrategia/${s.id}`)}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{s.store_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">
                    {(s.categories as any[]).flatMap((c: any) => c.items).length} itens • {new Date(s.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge className="bg-success/20 text-success border-success/30 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" /> Concluída
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {canViewHistory && completedStrategies.length === 0 && (
        <Card className="p-5 text-center text-sm text-muted-foreground">
          Nenhuma estratégia concluída ainda.
        </Card>
      )}
    </div>
  );
}
