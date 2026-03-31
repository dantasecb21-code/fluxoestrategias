import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Zap, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

type UserType = "admin" | "operational";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [userType, setUserType] = useState<UserType>("admin");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Check approval status
        const { data: { user: loggedUser } } = await supabase.auth.getUser();
        if (loggedUser) {
          const { data: profile } = await supabase.from("profiles").select("approved").eq("user_id", loggedUser.id).single();
          if (profile && !profile.approved) {
            toast.info("Seu cadastro está pendente de aprovação pelo administrador.");
          } else {
            toast.success("Login realizado com sucesso!");
          }
        }
        navigate("/");
      } else {
        const { error, data: signUpData } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name, role: userType },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        // Save whatsapp to profile
        if (signUpData?.user) {
          await supabase.from("profiles").update({ whatsapp: whatsapp.trim() }).eq("user_id", signUpData.user.id);
        }
        if (error) throw error;
        toast.success("Conta criada! Aguarde aprovação do administrador para acessar o sistema.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 border-border bg-card">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-2xl text-foreground">
            Gestor de <span className="text-primary">Estratégias</span>
          </h1>
        </div>

        <h2 className="font-heading font-semibold text-xl text-foreground text-center mb-6">
          {isLogin ? "Entrar na sua conta" : "Criar nova conta"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Nome</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Tipo de acesso</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUserType("admin")}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      userType === "admin"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    Administrador
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType("operational")}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      userType === "operational"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    Gestor Operacional
                  </button>
                </div>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="bg-background"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : isLogin ? (
              <><LogIn className="h-4 w-4 mr-2" /> Entrar</>
            ) : (
              <><UserPlus className="h-4 w-4 mr-2" /> Criar conta</>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline font-medium"
          >
            {isLogin ? "Criar conta" : "Fazer login"}
          </button>
        </p>
      </Card>
    </div>
  );
}
