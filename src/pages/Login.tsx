import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Mail, ShieldCheck } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Tentativa de login no Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
      password 
    });

    if (error) {
      toast.error("Erro no login: " + error.message);
    } else {
      toast.success("Bem-vindo de volta!");
    }
    setLoading(false);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-slate-50">
      
      <div className="relative z-10 w-full max-w-[380px] border border-slate-100 bg-white shadow-xl rounded-2xl mx-4">
        
        {/* CABEÇALHO DA TELA */}
        <div className="space-y-1 pb-6 pt-8 px-6">
          <div className="flex justify-center mb-3">
            <div className="rounded-full bg-indigo-50 p-4 border border-indigo-100">
              <ShieldCheck className="h-7 w-7 text-indigo-600" />
            </div>
          </div>
          
          <h1 className="text-center text-xl font-extrabold tracking-tight text-slate-900">
            POSSAMAI <span className="font-light text-indigo-600">| TECFLEX</span>
          </h1>
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
            Gestão de Assistência
          </p>
        </div>

        {/* FORMULÁRIO */}
        <div className="pb-8 px-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="email" 
                  placeholder="Seu e-mail" 
                  className="w-full h-11 bg-slate-50/50 border border-slate-200 rounded-lg pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all text-sm font-medium"
                  value={email}
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="password" 
                  placeholder="Sua senha" 
                  className="w-full h-11 bg-slate-50/50 border border-slate-200 rounded-lg pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all text-sm font-medium"
                  value={password}
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#1A335B] hover:bg-[#1A335B]/90 text-white font-bold h-11 rounded-lg transition-all active:scale-95 flex items-center justify-center text-sm shadow-md" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Entrando...
                </span>
              ) : (
                "Acessar Aplicativo"
              )}
            </button>
          </form>
        </div>
        
        {/* RODAPÉ */}
        <div className="pb-6 text-center border-t border-slate-100 pt-4 px-6">
          <p className="text-[9px] text-slate-400 font-medium">
            © 2026 Tecflex | Administração Possamai.
          </p>
        </div>
        
      </div>
    </div>
  );
}