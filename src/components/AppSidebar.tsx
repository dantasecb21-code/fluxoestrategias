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
import { Home, Plus, LogOut, Zap, ClipboardList, Users, AlertTriangle, ShieldCheck, MessageCircleQuestion, BookOpen, Store, Trophy, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const { user, displayName, avatarUrl, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    if (isMobile) setOpenMobile(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const isAdmin = role === "admin";
  const isStrategic = role === "strategic";
  const isOperational = role === "operational";
  const canManage = isAdmin || isStrategic;

  const roleLabel = isAdmin ? "Administrador" : isStrategic ? "Gestor Estratégico" : "Gestor Operacional";

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

              {/* Ranking - operational only */}
              {isOperational && (
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

              {/* Pendentes */}
              {canManage && (
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

              {/* Assistente */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/assistente"
                    onClick={() => handleNav("/assistente")}
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <MessageCircleQuestion className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Assistente</span>}
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
          {user && (
            <div className="mb-2 cursor-pointer hover:opacity-80 flex items-center gap-2" onClick={() => navigate(`/perfil/${user.id}`)}>
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">{displayName?.charAt(0)?.toUpperCase() || "?"}</span>
                )}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  {displayName && <p className="text-xs text-foreground font-medium truncate">{shortName(displayName)}</p>}
                  <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
                  <p className="text-[10px] text-primary">Ver perfil →</p>
                </div>
              )}
            </div>
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
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
