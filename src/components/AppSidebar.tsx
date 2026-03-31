import { useNavigate } from "react-router-dom";
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
import { Home, Plus, LogOut, Zap, ClipboardList, Users, AlertTriangle, ShieldCheck, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const { user, displayName, role, signOut } = useAuth();
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
                Gestor de <span className="text-primary">Estratégias</span>
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
              {canManage && (
                <>
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
                </>
              )}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/aprovacoes"
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Aprovações</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/assistente"
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-primary font-medium"
                  >
                    <MessageCircleQuestion className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Assistente</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User info + logout */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          {!collapsed && user && (
            <div className="mb-2 cursor-pointer hover:opacity-80" onClick={() => navigate(`/perfil/${user.id}`)}>
              {displayName && <p className="text-xs text-foreground font-medium truncate">{displayName}</p>}
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
              <p className="text-xs text-primary mt-0.5">Ver perfil →</p>
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={handleLogout}
            className="w-full text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
