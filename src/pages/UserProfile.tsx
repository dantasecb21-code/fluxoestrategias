import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Camera, Upload, Phone, Mail, Shield, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ProfileData {
  user_id: string;
  display_name: string;
  whatsapp: string;
  approved: boolean;
  avatar_url: string;
  cover_url: string;
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
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = user?.id === userId;
  const isAdmin = myRole === "admin";

  useEffect(() => {
    async function fetchProfile() {
      if (!userId) return;
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, whatsapp, approved, avatar_url, cover_url").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId).single(),
      ]);

      if (profileRes.data) setProfile(profileRes.data as ProfileData);
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

  const handleUpload = async (file: File, type: "avatar" | "cover") => {
    if (!userId || (!isOwnProfile && !isAdmin)) return;

    const targetUserId = userId;
    const ext = file.name.split(".").pop();
    const path = `${targetUserId}/${type}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error("Erro ao enviar imagem");
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const updateField = type === "avatar" ? { avatar_url: publicUrl } : { cover_url: publicUrl };

    if (isAdmin) {
      const { error } = await supabase.from("profiles").update(updateField).eq("user_id", targetUserId);
      if (error) { toast.error("Erro ao salvar"); return; }
    } else {
      const { error } = await supabase.from("profiles").update(updateField).eq("user_id", targetUserId);
      if (error) { toast.error("Erro ao salvar"); return; }
    }

    setProfile((prev) => prev ? { ...prev, ...updateField } : prev);
    toast.success(type === "avatar" ? "Foto de perfil atualizada!" : "Foto de capa atualizada!");
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, type);
    e.target.value = "";
  };

  // Stats for operational managers
  const managerStats = userId ? (() => {
    const assigned = strategies.filter((s) => s.assigned_to === userId);
    const total = assigned.length;
    let completed = 0, inProgress = 0;
    assigned.forEach((s) => {
      const items = (s.categories as any[]).flatMap((c: any) => c.items).filter((i: any) => i.checked);
      if (items.length === 0) return;
      if (items.every((i: any) => i.status === "completed")) completed++;
      else inProgress++;
    });
    const pending = total - completed - inProgress;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, rate };
  })() : null;

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  if (!profile) return <div className="flex items-center justify-center h-64 text-muted-foreground">Perfil não encontrado</div>;

  const canEdit = isOwnProfile || isAdmin;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      {/* Cover Photo */}
      <div className="relative rounded-xl overflow-hidden">
        <div
          className="h-48 bg-gradient-to-r from-primary/30 to-primary/10 bg-cover bg-center"
          style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})` } : {}}
        />
        {canEdit && (
          <>
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-3 right-3 opacity-80 hover:opacity-100"
              onClick={() => coverInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-1" /> Alterar capa
            </Button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFileSelect(e, "cover")} />
          </>
        )}

        {/* Avatar */}
        <div className="absolute -bottom-12 left-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full border-4 border-background bg-muted flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-muted-foreground">
                  {profile.display_name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            {canEdit && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFileSelect(e, "avatar")} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <Card className="pt-16 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">{profile.display_name || "Sem nome"}</h1>
            <Badge variant="outline" className="mt-1">{roleLabel(userRole)}</Badge>
          </div>
          <Badge className={profile.approved ? "bg-success/20 text-success border-success/30" : "bg-warning/20 text-warning border-warning/30"}>
            {profile.approved ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Aprovado</>
            ) : (
              <><Clock className="h-3 w-3 mr-1" /> Pendente</>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">WhatsApp</p>
              <p className="text-sm text-foreground font-medium">{profile.whatsapp || "Não informado"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm text-foreground font-medium">{profile.approved ? "Ativo" : "Pendente de aprovação"}</p>
            </div>
          </div>
        </div>

        {/* Stats for managers */}
        {userRole === "operational" && managerStats && managerStats.total > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="font-heading font-semibold text-foreground">Desempenho</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-success/10">
                <p className="font-heading font-bold text-xl text-success">{managerStats.completed}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <p className="font-heading font-bold text-xl text-primary">{managerStats.inProgress}</p>
                <p className="text-xs text-muted-foreground">Em andamento</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-warning/10">
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
          </div>
        )}
      </Card>
    </div>
  );
}
