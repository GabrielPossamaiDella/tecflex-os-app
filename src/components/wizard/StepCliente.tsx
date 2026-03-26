import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, User, Phone, MapPin, Check, X, Loader2, WifiOff, ArrowRight, ArrowLeft, Edit2, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { db, type ClienteLocal } from '@/lib/db'; 
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth'; // <-- Importamos o auth para a trava de segurança
import { type OSFormData } from '@/pages/NovaOS';

interface Props {
  form: OSFormData;
  update: (patch: Partial<OSFormData>) => void;
}

export default function StepCliente({ form, update }: Props) {
  const { user, tecnico } = useAuth(); // <-- Trava de Segurança: Puxa o ID do usuário/técnico
  const [search, setSearch] = useState('');
  const [clientes, setClientes] = useState<ClienteLocal[]>([]);
  const [selected, setSelected] = useState<ClienteLocal | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Controle de Edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clienteForm, setClienteForm] = useState({ 
    nome: '', fone: '', documento: '', endereco: '', bairro: '', cidade: '' 
  });

  const activeId = tecnico?.id || user?.id; // Define quem está usando

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
    
    // TRAVA DE SEGURANÇA: Se não tiver o ID carregado, ele não faz a busca e não gera erro 400
    if (!activeId && !isOffline) return; 

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (!isOffline) {
          // Busca online segura
          const { data } = await supabase.from('clientes').select('*').ilike('nome', `%${search}%`).limit(10);
          if (data) {
            setClientes(data as unknown as ClienteLocal[]);
            data.forEach(c => db.clientes_cache.put(c as unknown as ClienteLocal));
          }
        } else {
          // Busca offline
          const local = await db.clientes_cache.filter(c => c.nome.toLowerCase().includes(search.toLowerCase())).toArray();
          setClientes(local);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, isOffline, activeId]);

  // Puxa o cliente se já estiver no formulário
  useEffect(() => {
    if (form.cliente_id && !selected) {
      db.clientes_cache.get(form.cliente_id).then(c => {
        if (c) setSelected(c);
      });
    }
  }, [form.cliente_id]);

  const selectCliente = (c: ClienteLocal) => {
    setSelected(c);
    update({ cliente_id: c.id });
    setSearch('');
    setClientes([]);
  };

  const formatCPFCNPJ = (v: string) => {
    if (!v) return '';
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      v = v.substring(0, 14);
      v = v.replace(/^(\d{2})(\d)/, "$1.$2");
      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
      v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
      v = v.replace(/(\d{4})(\d)/, "$1-$2");
    }
    return v;
  };

  const formatPhone = (v: string) => {
    if (!v) return '';
    v = v.replace(/\D/g, "");
    v = v.substring(0, 11);
    if (v.length > 2) v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    if (v.length > 9) v = v.replace(/(\d{5})(\d)/, "$1-$2");
    else if (v.length > 8) v = v.replace(/(\d{4})(\d)/, "$1-$2");
    return v;
  };

  const openNewModal = () => {
    setEditingId(null);
    setClienteForm({ nome: '', fone: '', documento: '', endereco: '', bairro: '', cidade: '' });
    setModalStep(1);
    setShowModal(true);
  };

  const openEditModal = () => {
    if (!selected) return;
    setEditingId(selected.id);
    
    let end = selected.endereco || '';
    let brr = '';
    if (end.includes(' - ')) {
      const parts = end.split(' - ');
      brr = parts.pop() || '';
      end = parts.join(' - ');
    }

    setClienteForm({ 
      nome: selected.nome || '', 
      fone: selected.fone || '', 
      documento: selected.documento || '',
      endereco: end, 
      bairro: brr, 
      cidade: selected.cidade || '' 
    });
    setModalStep(1);
    setShowModal(true);
  };

  const handleSaveCliente = async () => {
    if (!clienteForm.nome.trim()) {
      toast.error('O Nome é obrigatório!');
      setModalStep(1); 
      return;
    }

    const targetId = editingId || crypto.randomUUID();
    const enderecoFull = `${clienteForm.endereco}${clienteForm.bairro ? ' - ' + clienteForm.bairro : ''}`;
    
    const clienteData: ClienteLocal = { 
      id: targetId, 
      nome: clienteForm.nome, 
      fone: clienteForm.fone, 
      documento: clienteForm.documento,
      endereco: enderecoFull, 
      cidade: clienteForm.cidade, 
      sincronizado: false 
    };

    try {
      if (!isOffline) {
        let req;
        const dadosSupabase = {
          nome: clienteForm.nome, 
          fone: clienteForm.fone, 
          documento: clienteForm.documento,
          endereco: enderecoFull, 
          cidade: clienteForm.cidade 
        };

        if (editingId) {
          req = supabase.from('clientes').update(dadosSupabase).eq('id', editingId).select().single();
        } else {
          req = supabase.from('clientes').insert({ id: targetId, ...dadosSupabase }).select().single();
        }

        const { data, error } = await req;

        if (error) {
          console.warn("Supabase bloqueou ou falhou. Salvando localmente!");
          await db.clientes_cache.put(clienteData);
          selectCliente(clienteData);
          closeModal();
          toast.success(`Cliente ${editingId ? 'atualizado' : 'salvo'} localmente!`);
          return;
        }

        if (data) {
          await db.clientes_cache.put(data as ClienteLocal); 
          selectCliente(data as ClienteLocal);
          closeModal();
          toast.success(`Cliente ${editingId ? 'atualizado' : 'cadastrado'} na nuvem!`);
          return;
        }
      }

      await db.clientes_cache.put(clienteData);
      selectCliente(clienteData);
      closeModal();
      toast.success(`Cliente ${editingId ? 'atualizado' : 'salvo'} offline!`);

    } catch (e: any) { 
      toast.error("Erro inesperado. Salvo no aparelho."); 
      await db.clientes_cache.put(clienteData);
      selectCliente(clienteData);
      closeModal();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalStep(1);
    setEditingId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Quem é o cliente?</h2>
        {isOffline && <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-full border border-amber-200">OFFLINE</span>}
      </div>

      {selected ? (
        <div className="p-5 rounded-2xl border-2 border-indigo-500/20 bg-indigo-50/30 relative text-left animate-fade-in shadow-sm group">
          <div className="space-y-2 pr-16">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-indigo-600"/><span className="font-black uppercase text-slate-800 tracking-tight">{selected.nome}</span></div>
            <div className="text-sm font-medium text-slate-500 flex items-center gap-2"><CreditCard className="w-3.5 h-3.5"/>{selected.documento || 'CPF/CNPJ não informado'}</div>
            <div className="text-sm font-medium text-slate-500 flex items-center gap-2"><Phone className="w-3.5 h-3.5"/>{selected.fone || 'Telefone não informado'}</div>
            <div className="text-sm font-medium text-slate-500 flex items-center gap-2"><MapPin className="w-3.5 h-3.5"/>{selected.endereco || 'Endereço não informado'}, {selected.cidade}</div>
          </div>
          
          <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button onClick={openEditModal} className="text-indigo-400 p-2 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors" title="Editar Cliente">
              <Edit2 size={18}/>
            </button>
            <button onClick={() => { setSelected(null); update({ cliente_id: '' }); }} className="text-slate-400 p-2 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Remover Seleção">
              <X size={18}/>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 shadow-sm transition-all text-slate-800 font-medium" placeholder="Buscar cliente cadastrado..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-indigo-600" />}
          </div>

          {clientes.length > 0 && (
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {clientes.map((c) => (
                <button key={c.id} onClick={() => selectCliente(c)} className="w-full text-left p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-indigo-200 hover:shadow-md transition-all active:scale-95 group">
                  <p className="font-bold uppercase text-slate-800 group-hover:text-indigo-600 transition-colors">{c.nome}</p>
                  <div className="flex gap-3 mt-1">
                    {c.documento && <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">{c.documento}</span>}
                    <span className="text-[10px] text-slate-400 mt-0.5">{c.cidade || ''}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button onClick={openNewModal} className="w-full p-5 border-2 border-dashed border-slate-300 rounded-[2rem] text-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-50/50 hover:border-indigo-300 flex items-center justify-center gap-2 transition-all active:scale-95">
            <Plus size={20}/> NOVO CLIENTE
          </button>
        </div>
      )}

      {/* REACT PORTAL: Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div onClick={closeModal} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
          
          <div className="relative bg-white w-full max-w-[450px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            <div className="bg-slate-900 p-6 text-white shrink-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black tracking-widest uppercase text-lg">
                  {editingId ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full font-bold tracking-widest">ETAPA {modalStep} DE 2</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: modalStep === 1 ? '50%' : '100%' }} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 text-left">
              {modalStep === 1 ? (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome / Razão Social *</label>
                    <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-white font-bold text-slate-800 transition-colors" value={clienteForm.nome} onChange={(e) => setClienteForm({ ...clienteForm, nome: e.target.value })} placeholder="João da Silva" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF ou CNPJ</label>
                    <input 
                      className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-white text-slate-800 font-medium transition-colors" 
                      value={clienteForm.documento} 
                      onChange={(e) => setClienteForm({ ...clienteForm, documento: formatCPFCNPJ(e.target.value) })} 
                      placeholder="000.000.000-00" 
                      maxLength={18}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input 
                      className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-white text-slate-800 font-medium transition-colors" 
                      value={clienteForm.fone} 
                      onChange={(e) => setClienteForm({ ...clienteForm, fone: formatPhone(e.target.value) })} 
                      placeholder="(00) 00000-0000" 
                      maxLength={15}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço (Rua e Nº)</label>
                    <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-white text-slate-800 font-medium transition-colors" value={clienteForm.endereco} onChange={(e) => setClienteForm({ ...clienteForm, endereco: e.target.value })} placeholder="Rua das Máquinas, 10" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
                      <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-white text-slate-800 font-medium transition-colors" value={clienteForm.bairro} onChange={(e) => setClienteForm({ ...clienteForm, bairro: e.target.value })} placeholder="Centro" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                      <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-white text-slate-800 font-medium transition-colors" value={clienteForm.cidade} onChange={(e) => setClienteForm({ ...clienteForm, cidade: e.target.value })} placeholder="Criciúma" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0">
              {modalStep === 1 ? (
                <>
                  <button onClick={closeModal} className="flex-1 h-14 rounded-xl font-bold bg-slate-100 text-slate-500 uppercase text-xs hover:bg-slate-200 active:scale-95 transition-all">Sair</button>
                  <button onClick={() => setModalStep(2)} className="flex-[2] h-14 rounded-xl font-black bg-indigo-600 text-white flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-600/20">
                    AVANÇAR <ArrowRight size={18}/>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setModalStep(1)} className="flex-1 h-14 rounded-xl font-bold bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"><ArrowLeft size={18}/></button>
                  <button onClick={handleSaveCliente} className="flex-[2] h-14 rounded-xl font-black bg-emerald-500 text-white flex items-center justify-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 tracking-widest uppercase">
                    <Check size={18}/> SALVAR
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}