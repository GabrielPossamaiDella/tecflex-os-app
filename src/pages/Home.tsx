import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, LogOut, ClipboardList, CloudOff, Cloud } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/db'; 
import { useAuth } from '@/hooks/useAuth';
import StatusBadge from '@/components/StatusBadge';

interface OSItem {
  id: string;
  status: string;
  defeito_reclamado: string | null;
  created_at: string;
  cliente_nome: string; 
  sincronizado: boolean;
}

export default function Home() {
  const { user, signOut } = useAuth(); 
  const navigate = useNavigate();
  const [ordens, setOrdens] = useState<OSItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadOrdens();
    } else {
      setLoading(false); 
    }
  }, [user]);

  const loadOrdens = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      let ordensOnline: OSItem[] = [];
      
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('ordens_servico')
          .select('id, status, defeito_reclamado, created_at, clientes(nome)')
          .eq('tecnico_id', user.id) 
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          ordensOnline = data.map((os: any) => {
            // TRAVA DE SEGURANÇA: Garante que lê o nome mesmo se o Supabase mandar em formato de Array
            const nomeCliente = Array.isArray(os.clientes) 
              ? os.clientes[0]?.nome 
              : os.clientes?.nome;

            return {
              id: os.id,
              status: os.status,
              defeito_reclamado: os.defeito_reclamado,
              created_at: os.created_at,
              cliente_nome: nomeCliente || 'Cliente não identificado',
              sincronizado: true
            };
          });
        }
      }

      const ordensLocaisRaw = await db.ordens_os.toArray();
      const ordensLocais: OSItem[] = ordensLocaisRaw.map(os => ({
        id: os.id || '',
        status: os.status,
        defeito_reclamado: os.defeito_reclamado || '',
        created_at: os.created_at,
        cliente_nome: os.cliente_nome || 'Cliente Local',
        sincronizado: !!os.sincronizado
      }));

      const mapResult = new Map<string, OSItem>();
      
      ordensOnline.forEach(os => mapResult.set(os.id, os));
      
      ordensLocais.forEach(os => {
        if (!mapResult.has(os.id) || !os.sincronizado) {
          mapResult.set(os.id, os);
        }
      });

      const finalResult = Array.from(mapResult.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setOrdens(finalResult);
    } catch (err) {
      console.error("Erro ao carregar OS na Home:", err);
    } finally {
      setLoading(false);
    }
  };

  const abertasHoje = ordens.filter((o) => {
    try {
        const today = new Date().toLocaleDateString();
        const osDate = new Date(o.created_at).toLocaleDateString();
        return o.status === 'aberta' && osDate === today;
    } catch {
        return false;
    }
  }).length;

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-xl font-black tracking-tighter italic uppercase">Tecflex</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium opacity-90 truncate max-w-[100px]">
               {user?.email?.split('@')[0] || 'Técnico'}
            </span>
            <button onClick={signOut} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Status da Conexão */}
        {!navigator.onLine && (
          <div className="bg-amber-100 text-amber-800 p-3 rounded-xl mb-4 flex items-center gap-2 text-sm font-bold border border-amber-200 animate-pulse">
            <CloudOff className="w-4 h-4" /> Trabalhando Offline
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <p className="text-support font-bold text-sm uppercase tracking-widest">
            {abertasHoje} {abertasHoje === 1 ? 'ordem aberta' : 'ordens abertas'} hoje
          </p>
          <button onClick={loadOrdens} className="text-xs text-primary font-bold">Atualizar</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : ordens.length === 0 ? (
          <div className="text-center py-16 animate-fade-in bg-white rounded-[2rem] border-2 border-dashed border-muted shadow-inner">
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-lg font-bold text-foreground">Sem ordens registradas</p>
            <p className="text-support mt-1 px-8 text-sm">Toque no botão abaixo para iniciar um atendimento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ordens.map((os, i) => (
              <button
                key={os.id}
                onClick={() => navigate(`/os/${os.id}`)}
                className="card-tecflex w-full text-left p-5 bg-white rounded-2xl border-2 border-transparent hover:border-primary/20 flex items-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-lg text-foreground truncate uppercase tracking-tight">
                        {os.cliente_nome}
                      </span>
                      {os.sincronizado ? (
                        <Cloud className="w-4 h-4 text-success" />
                      ) : (
                        <CloudOff className="w-4 h-4 text-amber-500 animate-pulse" />
                      )}
                    </div>
                    <StatusBadge status={os.status} />
                  </div>
                  
                  <p className="text-support truncate text-sm mb-3 font-medium">
                    {os.defeito_reclamado || 'Sem descrição do defeito'}
                  </p>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      {new Date(os.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    {!os.sincronizado && (
                      <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/30" />
              </button>
            ))}
          </div>
        )}
      </main>

      <button
        onClick={() => navigate('/nova-os')}
        className="fixed bottom-8 right-6 bg-primary text-white h-16 px-8 rounded-2xl shadow-2xl shadow-primary/40 flex items-center gap-2 font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all z-50 border-b-4 border-black/20"
      >
        <Plus className="w-6 h-6" />
        Nova OS
      </button>
    </div>
  );
}