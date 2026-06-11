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
import PendingValidation from "./pages/PendingValidation";
import UserApproval from "./pages/UserApproval";
import HelpCenter from "./pages/HelpCenter";
import TrainingCourses from "./pages/TrainingCourses";
import StoreRequests from "./pages/StoreRequests";
import BaseStrategyRequests from "./pages/BaseStrategyRequests";
import ResetPassword from "./pages/ResetPassword";
import OperationalRanking from "./pages/OperationalRanking";
import PendingActivities from "./pages/PendingActivities";
import Occurrences from "./pages/Occurrences";
import PricingCalculator from "./pages/PricingCalculator";
import StrategyCalendar from "./pages/StrategyCalendar";
import CompetitorStudies from "./pages/CompetitorStudies";
import AlgorithmAdaptation from "./pages/AlgorithmAdaptation";
import StrategistRanking from "./pages/StrategistRanking";
import ReturnedStrategies from "./pages/ReturnedStrategies";
import UxComunicacao from "./pages/UxComunicacao";
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
  if (role === "competitor_analyst") return <CompetitorStudies />;
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
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
            <Route path="/nova" element={<ProtectedRoute allowedRoles={["admin", "strategic"]}><StrategyBuilderPage /></ProtectedRoute>} />
            <Route path="/estrategia/:id" element={<ProtectedRoute allowedRoles={["admin", "strategic", "strategic_assistant"]}><StrategyBuilderPage /></ProtectedRoute>} />
            <Route path="/gestores" element={<ProtectedRoute allowedRoles={["admin", "strategic"]}><ManagersList /></ProtectedRoute>} />
            <Route path="/pendentes" element={<ProtectedRoute allowedRoles={["admin", "strategic", "strategic_assistant"]}><PendingStrategies /></ProtectedRoute>} />
            <Route path="/aguardando-validacao" element={<ProtectedRoute allowedRoles={["admin", "strategic"]}><PendingValidation /></ProtectedRoute>} />
            <Route path="/notas" element={<ProtectedRoute><StrategyNotes /></ProtectedRoute>} />
            <Route path="/aprovacoes" element={<ProtectedRoute allowedRoles={["admin"]}><UserApproval /></ProtectedRoute>} />
            <Route path="/operacional/:id" element={<ProtectedRoute allowedRoles={["operational"]}><OperationalStrategyView /></ProtectedRoute>} />
            <Route path="/ranking" element={<ProtectedRoute><OperationalRanking /></ProtectedRoute>} />
            <Route path="/perfil/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/ajuda" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
            <Route path="/treinamentos" element={<ProtectedRoute allowedRoles={["admin", "strategic", "operational"]}><TrainingCourses /></ProtectedRoute>} />
            <Route path="/lojas-novas" element={<ProtectedRoute allowedRoles={["admin", "strategic"]}><StoreRequests /></ProtectedRoute>} />
            <Route path="/solicitacoes-base" element={<ProtectedRoute allowedRoles={["admin", "strategic", "strategic_assistant"]}><BaseStrategyRequests /></ProtectedRoute>} />
            <Route path="/atividades" element={<ProtectedRoute><PendingActivities /></ProtectedRoute>} />
            <Route path="/ocorrencias" element={<ProtectedRoute><Occurrences /></ProtectedRoute>} />
            <Route path="/precificacao" element={<ProtectedRoute><PricingCalculator /></ProtectedRoute>} />
            <Route path="/calendario" element={<ProtectedRoute><StrategyCalendar /></ProtectedRoute>} />
            <Route path="/estudo-concorrencia" element={<ProtectedRoute allowedRoles={["admin", "strategic", "strategic_assistant", "competitor_analyst"]}><CompetitorStudies /></ProtectedRoute>} />
            <Route path="/adaptacao-algoritmo" element={<ProtectedRoute allowedRoles={["admin", "strategic_assistant"]}><AlgorithmAdaptation /></ProtectedRoute>} />
            <Route path="/ranking-estrategistas" element={<ProtectedRoute allowedRoles={["admin", "strategic", "strategic_assistant"]}><StrategistRanking /></ProtectedRoute>} />
            <Route path="/devolvidas" element={<ProtectedRoute allowedRoles={["admin", "strategic"]}><ReturnedStrategies /></ProtectedRoute>} />
            <Route path="/ux-comunicacao" element={<ProtectedRoute allowedRoles={["admin", "ux_leader", "ux_collaborator"]}><UxComunicacao /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
