import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, LogOut, ClipboardList, 
  CloudOff, Cloud, Search, RefreshCw, Trash2,
  LayoutDashboard, UploadCloud, User, Wrench
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/db'; 
import { useAuth } from '@/hooks/useAuth';
import StatusBadge from '@/components/StatusBadge';
import { toast } from 'sonner';

interface OSItem {
  id: string;
  status: string;
  defeito_reclamado: string | null;
  maquina_descricao: string | null;
  created_at: string;
  cliente_nome: string; 
  sincronizado: boolean;
  pecas?: any[];
  hora_saida?: string | null;
  hora_chegada?: string | null;
  tecnico_id?: string | null;
}

export default function Home() {
  const { user, tecnico, signOut } = useAuth(); 
  const navigate = useNavigate();
  const [ordens, setOrdens] = useState<OSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const activeId = tecnico?.id || user?.id;

  useEffect(() => {
    if (activeId) {
      loadOrdens();
    }
  }, [activeId]);

  const loadOrdens = async () => {
    if (!activeId) return; 
    setLoading(true);
    try {
      let ordensOnline: OSItem[] = [];
      
      // Checa se o usuário é administrador (aceita campo 'role' ou 'is_admin')
      // O 'as any' previne erros visuais no TypeScript
      const isAdmin = (tecnico as any)?.role === 'admin' || (tecnico as any)?.is_admin === true;

      if (navigator.onLine) {
        // 1. Cria a busca base pegando todas as OS
        let query = supabase
          .from('ordens_servico')
          .select('id, status, defeito_reclamado, maquina_descricao, created_at, clientes(nome)')
          .order('created_at', { ascending: false });
        
        // 2. MÁGICA DA HIERARQUIA: Se NÃO for admin, filtra só as dele.
        if (!isAdmin) {
          query = query.eq('tecnico_id', activeId);
        }
        
        const { data, error } = await query;
        
        if (!error && data) {
          ordensOnline = data.map((os: any) => ({
            id: os.id,
            status: os.status,
            defeito_reclamado: os.defeito_reclamado,
            maquina_descricao: os.maquina_descricao,
            created_at: os.created_at,
            cliente_nome: (Array.isArray(os.clientes) ? os.clientes[0]?.nome : os.clientes?.nome) || 'Cliente não identificado',
            sincronizado: true
          }));
        }
      }

      const ordensLocaisRaw = await db.ordens_os.toArray();
      
      // Aplica a mesma regra de admin para as OS salvas no modo offline do celular
      const ordensLocaisFiltradas = isAdmin 
        ? ordensLocaisRaw 
        : ordensLocaisRaw.filter(os => os.tecnico_id === activeId || !os.tecnico_id);
      
      const ordensLocais: OSItem[] = await Promise.all(ordensLocaisFiltradas.map(async (os: any) => {
        let nomeReal = 'Cliente Desconhecido';
        if (os.cliente_id) {
          const clienteLocal = await db.clientes_cache.get(os.cliente_id);
          if (clienteLocal) nomeReal = clienteLocal.nome;
        }

        return {
          id: os.id || '',
          status: os.status,
          defeito_reclamado: os.defeito_reclamado || '',
          maquina_descricao: os.maquina_descricao || '',
          created_at: os.created_at,
          cliente_nome: nomeReal, 
          sincronizado: !!os.sincronizado,
          pecas: os.pecas,
          hora_saida: os.hora_saida,
          hora_chegada: os.hora_chegada,
          tecnico_id: os.tecnico_id
        };
      }));

      const mapResult = new Map<string, OSItem>();
      ordensOnline.forEach(os => mapResult.set(os.id, os));
      ordensLocais.forEach(os => {
        if (!mapResult.has(os.id) || !os.sincronizado) mapResult.set(os.id, os);
      });

      setOrdens(Array.from(mapResult.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (err) {
      toast.error("Erro ao carregar lista");
    } finally {
      setLoading(false);
    }
  };

  const buildTimestamp = (timeStr: string | null | undefined) => {
    if (!timeStr) return null;
    if (timeStr.includes('T')) return timeStr; 
    try {
      const data = new Date();
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        data.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
        return data.toISOString();
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const syncPendingOS = async () => {
    if (!navigator.onLine) {
      toast.error("Conecte-se à internet para sincronizar!");
      return;
    }

    try {
      setIsSyncing(true);
      const ordensPendentes = await db.ordens_os.filter(os => !os.sincronizado).toArray();

      if (ordensPendentes.length === 0) {
        toast.info("Tudo já está sincronizado com a nuvem!");
        return;
      }

      let sucesso = 0;

      for (const os of ordensPendentes) {
        if (os.cliente_id) {
          const clienteLocal = await db.clientes_cache.get(os.cliente_id);
          if (clienteLocal && !clienteLocal.sincronizado) {
            const { error: cliErr } = await supabase.from('clientes').upsert({
              id: clienteLocal.id,
              nome: clienteLocal.nome,
              fone: clienteLocal.fone,
              documento: clienteLocal.documento,
              endereco: clienteLocal.endereco,
              cidade: clienteLocal.cidade
            });
            if (!cliErr) await db.clientes_cache.update(clienteLocal.id, { sincronizado: true });
          }
        }

        const horaInicioFull = buildTimestamp(os.hora_saida);
        const horaFimFull = buildTimestamp(os.hora_chegada);

        const { error: osError } = await supabase.from('ordens_servico').upsert({
          id: os.id,
          cliente_id: os.cliente_id,
          tecnico_id: os.tecnico_id || activeId, 
          defeito_reclamado: os.defeito_reclamado,
          maquina_descricao: os.maquina_descricao,
          hora_saida: horaInicioFull, 
          hora_chegada: horaFimFull,  
          servico_executado: os.servico_executado,
          km_rodado: os.km_rodado,
          assinatura_base64: os.assinatura_base64,
          status: os.status,
          total_pecas: os.total_pecas,
          total_geral: os.total_geral,
          tempo_atendimento_min: os.tempo_atendimento_min,
          valor_deslocamento: os.valor_deslocamento,
        });

        if (!osError) {
          if (os.pecas && os.pecas.length > 0) {
            await supabase.from('pecas_os').insert(
              os.pecas.map((p: any) => ({
                ordem_servico_id: os.id,
                nome: p.nome,
                valor_unitario: p.valor_unitario,
                quantidade: p.quantidade,
                total: p.quantidade * p.valor_unitario
              }))
            );
          }
          await db.ordens_os.update(os.id, { sincronizado: true });
          sucesso++;
        } else {
          console.error("Erro na OS", os.id, osError);
        }
      }

      if (sucesso > 0) {
        toast.success(`${sucesso} Ordens sincronizadas com sucesso!`);
        loadOrdens();
      } else {
        toast.error("Nenhuma OS pôde ser sincronizada.");
      }
    } catch (error) {
      toast.error("Erro durante a sincronização.");
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteIndividualOS = async (e: React.MouseEvent, id: string, isSincronizada: boolean) => {
    e.stopPropagation(); 
    if (!confirm("Excluir esta Ordem de Serviço permanentemente?")) return;

    try {
      setLoading(true);
      await db.ordens_os.delete(id);
      if (isSincronizada && navigator.onLine) {
        await supabase.from('ordens_servico').delete().eq('id', id);
      }
      toast.success("OS removida com sucesso!");
      loadOrdens();
    } catch (err) {
      toast.error("Erro ao deletar OS");
    } finally {
      setLoading(false);
    }
  };

  const filteredOS = ordens.filter(os => 
    os.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = ordens.filter(o => !o.sincronizado).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans selection:bg-indigo-100">
      <header className="bg-slate-900 text-white p-6 sticky top-0 z-50 shadow-2xl shadow-slate-900/20">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/40">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase italic">Tecflex</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-bold">Gestão de Assistência</p>
            </div>
          </div>
          <button onClick={signOut} className="p-2 bg-slate-800 hover:bg-rose-900/40 hover:text-rose-400 rounded-xl transition-all">
            <LogOut size={20} className="text-slate-400 hover:text-rose-400 transition-colors" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        
        {pendingCount > 0 && navigator.onLine && (
          <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
            <div>
              <h3 className="font-black text-amber-800 text-sm uppercase">Sincronização Pendente</h3>
              <p className="text-amber-700/80 text-xs font-medium">Você tem {pendingCount} OS salvas apenas no celular.</p>
            </div>
            <button 
              onClick={syncPendingOS} 
              disabled={isSyncing}
              className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl shadow-lg shadow-amber-500/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {isSyncing ? 'Enviando...' : 'Enviar Agora'}
            </button>
          </div>
        )}

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por cliente ou número..."
            className="w-full bg-white border-2 border-slate-200 focus:border-indigo-600 p-3.5 pl-12 rounded-2xl text-sm font-medium outline-none shadow-sm transition-colors text-slate-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Ordens</p>
            <p className="text-2xl font-black text-slate-900">{ordens.length}</p>
          </div>
          <button onClick={loadOrdens} className="bg-indigo-600 hover:bg-indigo-700 p-4 rounded-2xl shadow-lg shadow-indigo-600/20 text-white flex flex-col items-center justify-center transition-all active:scale-95 group">
            <RefreshCw size={20} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
            <span className="text-[10px] font-black uppercase mt-2 tracking-widest">Atualizar</span>
          </button>
        </div>

        <div className="space-y-4">
          {filteredOS.length === 0 && !loading ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 shadow-sm">
              <ClipboardList className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-lg font-bold text-slate-900">Nenhuma OS encontrada</p>
            </div>
          ) : (
            filteredOS.map((os) => (
              <div
                key={os.id}
                onClick={() => navigate(`/os/${os.id}`)}
                className="w-full bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col gap-3 group cursor-pointer relative"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    #{os.id.slice(0, 6)}
                  </span>
                  <StatusBadge status={os.status} />
                </div>

                <div>
                  <h2 className="font-black text-slate-900 text-lg uppercase tracking-tight group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                    <User size={18} className="text-indigo-400 shrink-0" />
                    <span className="truncate">{os.cliente_nome}</span>
                  </h2>
                  <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-2">
                    <Wrench size={16} className="text-slate-400 shrink-0" />
                    <span className="truncate">{os.maquina_descricao || 'Equipamento não informado'}</span>
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1.5 rounded-md">
                      {new Date(os.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    {os.sincronizado ? (
                      <div title="Sincronizado">
                        <Cloud size={16} className="text-emerald-500" />
                      </div>
                    ) : (
                      <div title="Aguardando Sincronização">
                        <CloudOff size={16} className="text-amber-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={(e) => deleteIndividualOS(e, os.id, os.sincronizado)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Excluir OS"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <button
        onClick={() => navigate('/nova-os')}
        className="fixed bottom-8 right-6 bg-slate-900 text-white h-16 px-8 rounded-2xl shadow-2xl shadow-slate-900/30 flex items-center gap-3 font-black uppercase tracking-widest z-50 hover:scale-105 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6" />
        Nova OS
      </button>
    </div>
  );
} 