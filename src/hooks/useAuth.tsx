import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Tecnico {
  id: string;
  nome: string;
  telefone: string | null;
}

interface AuthContextType {
  user: User | null;
  tecnico: Tecnico | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tecnico, setTecnico] = useState<Tecnico | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 🚀 DISJUNTOR DE SEGURANÇA: Se o Supabase travar a conexão por qualquer motivo,
    // forçamos o carregamento a terminar em 4 segundos para não travar o app!
    const failSafeTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn("⏳ Supabase demorou muito para responder. Liberando app (Possível modo offline).");
        setLoading(false);
      }
    }, 4000);

    const loadSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await supabase
            .from('tecnicos')
            .select('id, nome, telefone')
            .eq('user_id', session.user.id)
            .maybeSingle(); // <-- TROCADO AQUI: Evita o erro 406 se não achar o técnico
          
          if (mounted && data) setTecnico(data);
        }
      } catch (err) {
        console.error("Erro na verificação de sessão. Iniciando sem usuário.", err);
        if (mounted) {
          setUser(null);
          setTecnico(null);
        }
      } finally {
        // Garantia absoluta de que a bolinha de carregamento vai sumir
        if (mounted) {
          clearTimeout(failSafeTimer);
          setLoading(false);
        }
      }
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      
      if (session?.user) {
        supabase
          .from('tecnicos')
          .select('id, nome, telefone')
          .eq('user_id', session.user.id)
          .maybeSingle() // <-- TROCADO AQUI TAMBÉM: Evita o erro 406
          .then(({ data }) => {
            if (mounted && data) setTecnico(data);
          });
      } else {
        setTecnico(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(failSafeTimer);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, tecnico, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}