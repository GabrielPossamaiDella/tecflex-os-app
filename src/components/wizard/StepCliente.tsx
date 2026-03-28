import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, User, Phone, MapPin, Check, X, Loader2, Edit2, CreditCard, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { db, type ClienteLocal } from '@/lib/db'; 
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { type OSFormData } from '@/pages/NovaOS';

interface Props {
  form: OSFormData;
  update: (patch: Partial<OSFormData>) => void;
}

export default function StepCliente({ form, update }: Props) {
  const { user, tecnico } = useAuth();
  const [search, setSearch] = useState('');
  const [clientes, setClientes] = useState<ClienteLocal[]>([]);
  const [selected, setSelected] = useState<ClienteLocal | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clienteForm, setClienteForm] = useState({ 
    nome: '', fone: '', documento: '', endereco: '', bairro: '', cidade: '' 
  });

  const activeId = tecnico?.id || user?.id;

  // Busca de Clientes - Agora foca no banco local (Dexie) para ser instantâneo
  useEffect(() => {
    const buscarLocal = async () => {
      if (search.length < 2) {
        setClientes([]);
        return;
      }
      
      setLoading(true);
      try {
        // Busca no cache local que a Home sincronizou
        const resultados = await db.clientes_cache
          .filter(c => c.nome.toLowerCase().includes(search.toLowerCase()))
          .limit(10)
          .toArray();
        
        setClientes(resultados);
      } catch (err) {
        console.error("Erro na busca local:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(buscarLocal, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Carrega o cliente selecionado se já houver um ID no form
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

  // Formatações auxiliares
  const formatCPFCNPJ = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, "$1.$2.$3-$4");
    }
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, "$1.$2.$3/$4-$5");
  };

  const formatPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{4})/g, "($1) $2-$3");
    return v.replace(/(\d{2})(\d{4})(\d{4})/g, "($1) $2-$3");
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
      // 1. SEMPRE SALVA NO CELULAR PRIMEIRO (Garante o offline)
      await db.clientes_cache.put(clienteData);
      
      // 2. TENTA SUBIR PARA A NUVEM SE TIVER INTERNET
      if (navigator.onLine) {
        const { error } = await supabase.from('clientes').upsert({
          id: targetId,
          nome: clienteForm.nome,
          fone: clienteForm.fone,
          documento: clienteForm.documento,
          endereco: enderecoFull,
          cidade: clienteForm.cidade
        });

        if (!error) {
          await db.clientes_cache.update(targetId, { sincronizado: true });
        }
      }

      selectCliente(clienteData);
      closeModal();
      toast.success(editingId ? "Dados atualizados!" : "Novo cliente registrado!");

    } catch (e) {
      console.error(e);
      toast.error("Salvo apenas no aparelho por enquanto.");
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
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 italic">Cliente</h2>
        {!navigator.onLine && <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-full border border-amber-200">OFFLINE</span>}
      </div>

      {selected ? (
        <div className="p-5 rounded-2xl border-2 border-indigo-500/20 bg-indigo-50/30 relative text-left animate-in fade-in zoom-in-95 shadow-sm group">
          <div className="space-y-2 pr-16">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600"/>
              <span className="font-black uppercase text-slate-800 tracking-tight">{selected.nome}</span>
            </div>
            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5"/>
              {selected.documento || 'Sem CPF/CNPJ'}
            </div>
            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Phone className="w-3.5 h-3.5"/>
              {selected.fone || 'Sem WhatsApp'}
            </div>
            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5"/>
              <span className="truncate">{selected.endereco}, {selected.cidade}</span>
            </div>
          </div>
          
          <div className="absolute top-4 right-4 flex items-center gap-1">
            <button onClick={() => { setSelected(null); update({ cliente_id: '' }); }} className="text-slate-400 p-2 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
              <X size={20}/>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 shadow-sm transition-all text-slate-800 font-medium" 
              placeholder="Digite o nome para buscar..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
            {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-indigo-600" size={20} />}
          </div>

          {clientes.length > 0 && (
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {clientes.map((c) => (
                <button 
                  key={c.id} 
                  onClick={() => selectCliente(c)} 
                  className="w-full text-left p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-indigo-200 transition-all active:scale-95 group"
                >
                  <p className="font-bold uppercase text-slate-800 group-hover:text-indigo-600 transition-colors">{c.nome}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">{c.cidade || 'Cidade não informada'}</p>
                </button>
              ))}
            </div>
          )}

          <button 
            onClick={() => {
              setClienteForm({ ...clienteForm, nome: search });
              setShowModal(true);
            }} 
            className="w-full p-5 border-2 border-dashed border-slate-300 rounded-[2rem] text-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-50/50 hover:border-indigo-300 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Plus size={20}/> NOVO CLIENTE
          </button>
        </div>
      )}

      {/* MODAL DE CADASTRO (PORTAL) */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div onClick={closeModal} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          
          <div className="relative bg-white w-full max-w-[450px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-6 text-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black tracking-widest uppercase text-lg italic">Cadastro</h3>
                <span className="text-[10px] bg-indigo-500 px-3 py-1 rounded-full font-bold">ETAPA {modalStep} DE 2</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: modalStep === 1 ? '50%' : '100%' }} />
              </div>
            </div>

            <div className="p-6 bg-slate-50 space-y-4">
              {modalStep === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome Completo *</label>
                    <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 outline-none font-bold" value={clienteForm.nome} onChange={(e) => setClienteForm({ ...clienteForm, nome: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">WhatsApp</label>
                    <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 outline-none" placeholder="(48) 99999-9999" value={clienteForm.fone} onChange={(e) => setClienteForm({ ...clienteForm, fone: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Endereço</label>
                    <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 outline-none" value={clienteForm.endereco} onChange={(e) => setClienteForm({ ...clienteForm, endereco: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cidade</label>
                    <input className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 outline-none" value={clienteForm.cidade} onChange={(e) => setClienteForm({ ...clienteForm, cidade: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t flex gap-3">
              {modalStep === 1 ? (
                <button onClick={() => setModalStep(2)} className="w-full h-14 rounded-xl font-black bg-slate-900 text-white flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                  Próximo <ArrowRight size={18}/>
                </button>
              ) : (
                <button onClick={handleSaveCliente} className="w-full h-14 rounded-xl font-black bg-emerald-500 text-white flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                  <Check size={18}/> Salvar Cliente
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}