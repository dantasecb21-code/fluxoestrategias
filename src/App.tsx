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
import ManagersList from "./pages/ManagersList";
import PendingStrategies from "./pages/PendingStrategies";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading, role } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
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
            <Route path="/nova" element={<ProtectedRoute allowedRoles={["admin"]}><StrategyBuilderPage /></ProtectedRoute>} />
            <Route path="/estrategia/:id" element={<ProtectedRoute allowedRoles={["admin"]}><StrategyBuilderPage /></ProtectedRoute>} />
            <Route path="/gestores" element={<ProtectedRoute allowedRoles={["admin"]}><ManagersList /></ProtectedRoute>} />
            <Route path="/operacional/:id" element={<ProtectedRoute allowedRoles={["operational"]}><OperationalStrategyView /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
