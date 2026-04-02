import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import StrategyBuilderPage from "./pages/StrategyBuilder";
import OperationalDashboard from "./pages/OperationalDashboard";
import OperationalStrategyView from "./pages/OperationalStrategyView";
import UserProfile from "./pages/UserProfile";
import ManagersList from "./pages/ManagersList";
import StrategyNotes from "./pages/StrategyNotes";
import PendingStrategies from "./pages/PendingStrategies";
import UserApproval from "./pages/UserApproval";
import AssistantChat from "./pages/AssistantChat";
import TrainingCourses from "./pages/TrainingCourses";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PendingApprovalScreen() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-warning/20 flex items-center justify-center mx-auto">
          <span className="text-3xl">⏳</span>
        </div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Aguardando Aprovação</h1>
        <p className="text-muted-foreground">
          Seu cadastro foi recebido e está pendente de aprovação pelo administrador. Você receberá acesso assim que for aprovado.
        </p>
        <button onClick={() => signOut()} className="text-sm text-primary hover:underline">Sair</button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading, role, approved } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!approved) return <PendingApprovalScreen />;
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

function HomeRedirect() {
  const { role, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  if (role === "operational") return <OperationalDashboard />;
  return <Dashboard />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
            <Route path="/nova" element={<ProtectedRoute allowedRoles={["admin", "strategic"]}><StrategyBuilderPage /></ProtectedRoute>} />
            <Route path="/estrategia/:id" element={<ProtectedRoute allowedRoles={["admin", "strategic"]}><StrategyBuilderPage /></ProtectedRoute>} />
            <Route path="/gestores" element={<ProtectedRoute allowedRoles={["admin", "strategic"]}><ManagersList /></ProtectedRoute>} />
            <Route path="/pendentes" element={<ProtectedRoute allowedRoles={["admin", "strategic"]}><PendingStrategies /></ProtectedRoute>} />
            <Route path="/notas" element={<ProtectedRoute allowedRoles={["admin", "strategic"]}><StrategyNotes /></ProtectedRoute>} />
            <Route path="/aprovacoes" element={<ProtectedRoute allowedRoles={["admin"]}><UserApproval /></ProtectedRoute>} />
            <Route path="/operacional/:id" element={<ProtectedRoute allowedRoles={["operational"]}><OperationalStrategyView /></ProtectedRoute>} />
            <Route path="/perfil/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/assistente" element={<ProtectedRoute><AssistantChat /></ProtectedRoute>} />
            <Route path="/treinamentos" element={<ProtectedRoute allowedRoles={["admin", "strategic"]}><TrainingCourses /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
