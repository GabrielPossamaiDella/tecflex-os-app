// AS 4 LINHAS MÁGICAS QUE RESOLVEM A TELA BRANCA DO PDF:
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.global = window;
  window.Buffer = Buffer;
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import NovaOS from "@/pages/NovaOS";
import OSDetalhe from "@/pages/OSDetalhe";
import NotFound from "@/pages/NotFound";
import { useSync } from '@/hooks/useSync';

const queryClient = new QueryClient();

// Componente para gerenciar o Sync sem bloquear a renderização
function SyncHandler() {
  useSync();
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Iniciando TECFLEX...
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/nova-os" element={<ProtectedRoute><NovaOS /></ProtectedRoute>} />
      <Route path="/os/:id" element={<ProtectedRoute><OSDetalhe /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-right" richColors closeButton /> 
      <BrowserRouter>
        <AuthProvider>
          <SyncHandler />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;