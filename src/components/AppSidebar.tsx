import { useNavigate } from "react-router-dom";
import { shortName } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Home, Plus, LogOut, Zap, ClipboardList, Users, AlertTriangle, ShieldCheck, MessageCircleQuestion, BookOpen, Store, Trophy, ListChecks, Calculator, FileText, CalendarDays, AlertCircle, Search, Cpu, RotateCcw, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useDbStrategies } from "@/hooks/useDbStrategies";
import { useMemo } from "react";

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const { user, displayName, avatarUrl, role, roles, setActiveRole, signOut } = useAuth();
  const navigate = useNavigate();
  const { strategies } = useDbStrategies();
  const pendingValidationCount = useMemo(
    () =>
      strategies.filter((s) => {
        if (s.status !== "pending_admin_approval") return false;
        if (role === "strategic" && s.user_id !== user?.id) return false;
        return true;
      }).length,
    [strategies, role, user?.id]
  );
  const returnedCount = useMemo(
    () =>
      strategies.filter((s: any) => {
        if (s.algorithm_adaptation_status !== "returned") return false;
        if (role === "strategic" && s.user_id !== user?.id && s.assigned_to !== user?.id) return false;
        return true;
      }).length,
    [strategies, role, user?.id]
  );

  const handleNav = (path: string) => {
    if (isMobile) setOpenMobile(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const isAdmin = role === "admin";
  const isStrategic = role === "strategic";
  const isStrategicAssistant = role === "strategic_assistant";
  const isOperational = role === "operational";
  const isCompetitorAnalyst = role === "competitor_analyst";
  const isUxLeader = role === "ux_leader";
  const isUxCollaborator = role === "ux_collaborator";
  const canManage = isAdmin || isStrategic;

  const roleLabel = (value: string | null) => {
    if (value === "admin") return "Administrador";
    if (value === "strategic") return "Gestor Estratégico";
    if (value === "strategic_assistant") return "Auxiliar Estratégico";
    if (value === "competitor_analyst") return "Analista de Concorrência";
    if (value === "ux_leader") return "Líder UX";
    if (value === "ux_collaborator") return "Colaborador UX";
    return "Gestor Operacional";
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 mx-auto">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-heading font-bold text-sidebar-foreground text-sm">
                Fluxo de <span className="text-primary">Estratégias</span>
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {isOperational ? "Painel Operacional" : "Navegação"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Início */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    end
                    onClick={() => handleNav("/")}
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    {isOperational ? (
                      <ClipboardList className="mr-2 h-4 w-4" />
                    ) : (
                      <Home className="mr-2 h-4 w-4" />
                    )}
                    {!collapsed && <span>{isOperational ? "Minhas Tarefas" : "Início"}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Ranking - todos os usuários */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/ranking"
                    onClick={() => handleNav("/ranking")}
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <Trophy className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Ranking</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Estudo de Concorrência */}
              {(canManage || isStrategicAssistant || isCompetitorAnalyst) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/estudo-concorrencia" onClick={() => handleNav("/estudo-concorrencia")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium">
                      <Search className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Estudo Concorrência</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Adaptação do Algoritmo - braço direito + admin */}
              {(isAdmin || isStrategicAssistant) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/adaptacao-algoritmo" onClick={() => handleNav("/adaptacao-algoritmo")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium">
                      <Cpu className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Adaptação Algoritmo</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Ranking Estrategistas */}
              {(canManage || isStrategicAssistant) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/ranking-estrategistas" onClick={() => handleNav("/ranking-estrategistas")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium">
                      <Trophy className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Ranking Estrategistas</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Lojas Novas */}
              {canManage && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/lojas-novas"
                      onClick={() => handleNav("/lojas-novas")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <Store className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Lojas Novas</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Solicitações da Base */}
              {(canManage || isStrategicAssistant) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/solicitacoes-base"
                      onClick={() => handleNav("/solicitacoes-base")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <Store className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Solicitações da Base</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Nova Estratégia */}
              {canManage && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/nova"
                      onClick={() => handleNav("/nova")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Nova Estratégia</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Aguardando Validação */}
              {canManage && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/aguardando-validacao"
                      onClick={() => handleNav("/aguardando-validacao")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {!collapsed && (
                        <span className="flex items-center justify-between w-full">
                          <span>Aguardando Validação</span>
                          <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold border border-primary/30">
                            {pendingValidationCount}
                          </span>
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Pendentes */}
              {(canManage || isStrategicAssistant) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/pendentes"
                      onClick={() => handleNav("/pendentes")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Pendentes</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Devolvidas pelo Braço Direito */}
              {canManage && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/devolvidas"
                      onClick={() => handleNav("/devolvidas")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {!collapsed && (
                        <span className="flex items-center justify-between w-full">
                          <span>Devolvidas</span>
                          {returnedCount > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-destructive/20 text-destructive text-[10px] font-semibold border border-destructive/40">
                              {returnedCount}
                            </span>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Atividades Pendentes */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/atividades"
                    onClick={() => handleNav("/atividades")}
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <ListChecks className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Atividades</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Ocorrências */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/ocorrencias"
                    onClick={() => handleNav("/ocorrencias")}
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Ocorrências</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* UX Comunicação */}
              {(isUxLeader || isUxCollaborator) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/ux-comunicacao"
                      onClick={() => handleNav("/ux-comunicacao")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <Palette className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{isUxLeader ? "Setor UX" : "Minhas Tarefas UX"}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Gestores */}
              {canManage && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/gestores"
                      onClick={() => handleNav("/gestores")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Gestores</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Treinamentos */}
              {(canManage || isOperational) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/treinamentos"
                      onClick={() => handleNav("/treinamentos")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Treinamentos</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Precificação */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/precificacao"
                    onClick={() => handleNav("/precificacao")}
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Precificação</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Bloco de Notas */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/notas"
                    onClick={() => handleNav("/notas")}
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Bloco de Notas</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Calendário */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/calendario"
                    onClick={() => handleNav("/calendario")}
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Calendário</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Central de Ajuda */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/ajuda"
                    onClick={() => handleNav("/ajuda")}
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <MessageCircleQuestion className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Central de Ajuda</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Aprovações */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/aprovacoes"
                      onClick={() => handleNav("/aprovacoes")}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Aprovações</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User info + logout */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          {user && !collapsed && (
            <div className="mb-2 cursor-pointer hover:opacity-80 flex items-center gap-2" onClick={() => navigate(`/perfil/${user.id}`)}>
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">{displayName?.charAt(0)?.toUpperCase() || "?"}</span>
                )}
              </div>
              <div className="min-w-0">
                {displayName && <p className="text-xs text-foreground font-medium truncate">{shortName(displayName)}</p>}
                <p className="text-[10px] text-muted-foreground">{roleLabel(role)}</p>
                <p className="text-[10px] text-primary">Ver perfil →</p>
              </div>
            </div>
          )}
          {user && !collapsed && roles.length > 1 && role && (
            <Select value={role} onValueChange={(value) => setActiveRole(value as typeof role)}>
              <SelectTrigger className="mb-2 h-8 text-xs bg-sidebar-accent/40 border-sidebar-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((userRole) => (
                  <SelectItem key={userRole} value={userRole}>{roleLabel(userRole)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={handleLogout}
            className="w-full text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
          <div className="flex justify-center mt-2">
            <ThemeToggle />
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
