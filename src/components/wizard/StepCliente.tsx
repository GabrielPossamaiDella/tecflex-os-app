import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <-- ESSENCIAL PARA O MODAL NÃO CORTAR
import { Search, Plus, User, Phone, MapPin, Check, X, Loader2, WifiOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { db, type ClienteLocal } from '@/lib/db.ts'; 
import { toast } from 'sonner';
import type { OSFormData } from '@/pages/NovaOS';

interface Props {
  form: OSFormData;
  update: (patch: Partial<OSFormData>) => void;
}

export default function StepCliente({ form, update }: Props) {
  const [search, setSearch] = useState('');
  const [clientes, setClientes] = useState<ClienteLocal[]>([]);
  const [selected, setSelected] = useState<ClienteLocal | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const [newCliente, setNewCliente] = useState({ 
    nome: '', fone: '', documento: '', endereco: '', bairro: '', cidade: '' 
  });

  useEffect(() => {
    const handleStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    if (search.length < 2) { setClientes([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (!isOffline) {
          const { data } = await supabase.from('clientes').select('*').ilike('nome', `%${search}%`).limit(10);
          if (data) {
            setClientes(data as ClienteLocal[]);
            data.forEach(c => db.clientes_cache.put(c as ClienteLocal));
          }
        } else {
          const local = await db.clientes_cache.filter(c => c.nome.toLowerCase().includes(search.toLowerCase())).toArray();
          setClientes(local);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, isOffline]);

  const selectCliente = (c: ClienteLocal) => {
    setSelected(c);
    update({ cliente_id: c.id });
    setSearch('');
    setClientes([]);
  };

const handleSaveNew = async () => {
    if (!newCliente.nome.trim()) {
      toast.error('O Nome é obrigatório!');
      setModalStep(1); 
      return;
    }

    const tempId = crypto.randomUUID();
    const enderecoFull = `${newCliente.endereco}${newCliente.bairro ? ' - ' + newCliente.bairro : ''}`;
    
    // Objeto do cliente que será salvo
    const clienteData: ClienteLocal = { 
      id: tempId, nome: newCliente.nome, fone: newCliente.fone, 
      endereco: enderecoFull, cidade: newCliente.cidade, sincronizado: false 
    };

    try {
      if (!isOffline) {
        // Tenta salvar no Supabase
        const { data, error } = await supabase.from('clientes').insert({ 
          nome: newCliente.nome, 
          fone: newCliente.fone, 
          endereco: enderecoFull, 
          cidade: newCliente.cidade 
        }).select().single();

        // SE O SUPABASE BLOQUEAR (Erro 403/RLS), IGNORA E SALVA LOCAL!
        if (error) {
          console.warn("Supabase bloqueou (RLS). Salvando apenas no banco local para o MVP não parar!");
          await db.clientes_cache.add(clienteData);
          selectCliente(clienteData);
          closeModal();
          toast.success('Cliente salvo localmente!');
          return;
        }

        // Se o Supabase aceitar perfeitamente
        if (data) {
          await db.clientes_cache.put(data as ClienteLocal); 
          selectCliente(data as ClienteLocal);
          closeModal();
          toast.success('Cliente cadastrado na nuvem!');
          return;
        }
      }

      // Se estiver offline
      await db.clientes_cache.add(clienteData);
      selectCliente(clienteData);
      closeModal();
      toast.success('Cliente salvo localmente (Offline)!');

    } catch (e: any) { 
      toast.error("Erro inesperado, mas cliente foi salvo no aparelho."); 
      await db.clientes_cache.add(clienteData);
      selectCliente(clienteData);
      closeModal();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalStep(1);
    setNewCliente({ nome: '', fone: '', documento: '', endereco: '', bairro: '', cidade: '' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold uppercase italic tracking-tighter">Quem é o cliente?</h2>
        {isOffline && <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-full border border-amber-200">OFFLINE</span>}
      </div>

      {selected ? (
        <div className="p-4 rounded-2xl border-2 border-green-500/30 bg-green-50 relative text-left animate-fade-in shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-green-600"/><span className="font-bold uppercase text-gray-800">{selected.nome}</span></div>
            <div className="text-sm text-gray-500 flex items-center gap-2"><Phone className="w-3 h-3"/>{selected.fone || 'Não informado'}</div>
            <div className="text-sm text-gray-500 flex items-center gap-2"><MapPin className="w-3 h-3"/>{selected.endereco}, {selected.cidade}</div>
          </div>
          <button onClick={() => { setSelected(null); update({ cliente_id: '' }); }} className="absolute top-4 right-4 text-gray-400 p-1 hover:text-red-500 transition-colors"><X/></button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-gray-100 outline-none focus:border-blue-900 shadow-sm transition-all" placeholder="Buscar cliente cadastrado..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-900" />}
          </div>

          {clientes.length > 0 && (
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {clientes.map((c) => (
                <button key={c.id} onClick={() => selectCliente(c)} className="w-full text-left p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-900 transition-all active:scale-95">
                  <p className="font-bold uppercase text-gray-700">{c.nome}</p>
                  <p className="text-xs text-gray-400">{c.cidade || 'Cidade não informada'}</p>
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setShowModal(true)} className="w-full p-6 border-2 border-dashed border-gray-300 rounded-[2rem] text-blue-900 font-black uppercase tracking-widest hover:bg-blue-50 hover:border-blue-300 flex items-center justify-center gap-2 transition-all active:scale-95">
            <Plus /> NOVO CLIENTE
          </button>
        </div>
      )}

      {/* REACT PORTAL: Tira o modal de dentro da página e joga direto no Body */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div onClick={closeModal} className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />
          
          <div className="relative bg-white w-full max-w-[450px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-[#002b5c] p-6 text-white shrink-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black italic uppercase text-xl">Novo Cliente</h3>
                <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-bold">ETAPA {modalStep} DE 2</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 transition-all duration-500" style={{ width: modalStep === 1 ? '50%' : '100%' }} />
              </div>
            </div>

            {/* Corpo */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 text-left">
              {modalStep === 1 ? (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome / Razão Social *</label>
                    <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-[#002b5c] bg-white font-bold text-slate-800 transition-colors" value={newCliente.nome} onChange={(e) => setNewCliente({ ...newCliente, nome: e.target.value })} placeholder="João da Silva" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">CPF ou CNPJ</label>
                    <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-[#002b5c] bg-white text-slate-800 transition-colors" value={newCliente.documento} onChange={(e) => setNewCliente({ ...newCliente, documento: e.target.value })} placeholder="000.000.000-00" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">WhatsApp</label>
                    <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-[#002b5c] bg-white text-slate-800 transition-colors" value={newCliente.fone} onChange={(e) => setNewCliente({ ...newCliente, fone: e.target.value })} placeholder="(48) 99999-9999" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Endereço (Rua e Nº)</label>
                    <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-[#002b5c] bg-white text-slate-800 transition-colors" value={newCliente.endereco} onChange={(e) => setNewCliente({ ...newCliente, endereco: e.target.value })} placeholder="Rua das Máquinas, 10" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Bairro</label>
                      <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-[#002b5c] bg-white text-slate-800 transition-colors" value={newCliente.bairro} onChange={(e) => setNewCliente({ ...newCliente, bairro: e.target.value })} placeholder="Centro" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Cidade</label>
                      <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-[#002b5c] bg-white text-slate-800 transition-colors" value={newCliente.cidade} onChange={(e) => setNewCliente({ ...newCliente, cidade: e.target.value })} placeholder="Criciúma" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0">
              {modalStep === 1 ? (
                <>
                  <button onClick={closeModal} className="flex-1 h-14 rounded-2xl font-bold bg-slate-100 text-slate-500 uppercase text-xs hover:bg-slate-200 active:scale-95 transition-all">Sair</button>
                  <button onClick={() => setModalStep(2)} className="flex-[2] h-14 rounded-2xl font-black bg-[#002b5c] text-white flex items-center justify-center gap-2 hover:bg-blue-900 active:scale-95 transition-all shadow-lg shadow-blue-900/20">
                    AVANÇAR <ArrowRight size={18}/>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setModalStep(1)} className="flex-1 h-14 rounded-2xl font-bold bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"><ArrowLeft size={18}/></button>
                  <button onClick={handleSaveNew} className="flex-[2] h-14 rounded-2xl font-black bg-green-500 text-white flex items-center justify-center gap-2 hover:bg-green-600 active:scale-95 transition-all shadow-lg shadow-green-500/20">
                    <Check size={18}/> FINALIZAR
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body // <-- A MÁGICA DO PORTAL ACONTECE AQUI
      )}
    </div>
  );
}