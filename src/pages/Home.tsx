import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, LogOut, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import StatusBadge from '@/components/StatusBadge';
import { toast } from 'sonner';

interface OSItem {
  id: string;
  status: string;
  defeito_reclamado: string | null;
  created_at: string;
  clientes: { nome: string } | null;
}

export default function Home() {
  const { tecnico, signOut } = useAuth();
  const navigate = useNavigate();
  const [ordens, setOrdens] = useState<OSItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tecnico) return;
    loadOrdens();
  }, [tecnico]);

  const loadOrdens = async () => {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('id, status, defeito_reclamado, created_at, clientes(nome)')
      .eq('tecnico_id', tecnico!.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar ordens de serviço.');
    } else {
      setOrdens(data ?? []);
    }
    setLoading(false);
  };

  const abertasHoje = ordens.filter((o) => {
    const today = new Date().toISOString().slice(0, 10);
    return o.status === 'aberta' && o.created_at.slice(0, 10) === today;
  }).length;

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-lg font-extrabold tracking-tight">TECFLEX</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm opacity-90">{tecnico?.nome}</span>
            <button onClick={signOut} className="opacity-80 hover:opacity-100 transition-opacity">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Counter */}
        <p className="text-support mb-4">
          {abertasHoje} {abertasHoje === 1 ? 'ordem aberta' : 'ordens abertas'} hoje
        </p>

        {/* OS List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : ordens.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-lg font-semibold text-foreground">Nenhuma OS por aqui ainda</p>
            <p className="text-support mt-1">Toque no botão abaixo para criar uma nova</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ordens.map((os, i) => (
              <button
                key={os.id}
                onClick={() => navigate(`/os/${os.id}`)}
                className="card-tecflex w-full text-left flex items-center gap-3 animate-slide-up hover:shadow-md transition-shadow"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-base text-foreground truncate">
                      {os.clientes?.nome ?? 'Cliente'}
                    </span>
                    <StatusBadge status={os.status} />
                  </div>
                  <p className="text-support truncate">
                    {os.defeito_reclamado || 'Sem descrição'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(os.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/nova-os')}
        className="fixed bottom-6 right-6 btn-primary rounded-2xl shadow-lg shadow-success/30 px-5 z-50"
      >
        <Plus className="w-5 h-5" />
        Nova OS
      </button>
    </div>
  );
}
