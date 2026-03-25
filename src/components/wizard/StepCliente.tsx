import { useState, useEffect } from 'react';
import { Search, Plus, User, Phone, MapPin, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { OSFormData } from '@/pages/NovaOS';

interface Props {
  form: OSFormData;
  update: (patch: Partial<OSFormData>) => void;
}

interface Cliente {
  id: string;
  nome: string;
  fone: string | null;
  endereco: string | null;
  cidade: string | null;
}

export default function StepCliente({ form, update }: Props) {
  const [search, setSearch] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newCliente, setNewCliente] = useState({ nome: '', fone: '', endereco: '', cidade: '' });

  useEffect(() => {
    if (search.length < 2) { setClientes([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('clientes')
        .select('id, nome, fone, endereco, cidade')
        .ilike('nome', `%${search}%`)
        .limit(10);
      setClientes(data ?? []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (form.cliente_id && !selected) {
      supabase
        .from('clientes')
        .select('id, nome, fone, endereco, cidade')
        .eq('id', form.cliente_id)
        .single()
        .then(({ data }) => { if (data) setSelected(data); });
    }
  }, []);

  const selectCliente = (c: Cliente) => {
    setSelected(c);
    update({ cliente_id: c.id });
    setSearch('');
    setClientes([]);
  };

  const handleSaveNew = async () => {
    if (!newCliente.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    const { data, error } = await supabase
      .from('clientes')
      .insert({ nome: newCliente.nome, fone: newCliente.fone, endereco: newCliente.endereco, cidade: newCliente.cidade })
      .select()
      .single();
    if (error || !data) { toast.error('Erro ao cadastrar cliente'); return; }
    toast.success('Cliente cadastrado!');
    selectCliente(data);
    setShowModal(false);
    setNewCliente({ nome: '', fone: '', endereco: '', cidade: '' });
  };

  return (
    <div className="space-y-5">
      <h2 className="section-title">Quem é o cliente?</h2>

      {selected ? (
        <div className="card-tecflex border-2 border-success/30 bg-success/5 animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-success" />
                <span className="font-bold">{selected.nome}</span>
              </div>
              {selected.fone && (
                <div className="flex items-center gap-2 text-support">
                  <Phone className="w-4 h-4" />
                  <span>{selected.fone}</span>
                </div>
              )}
              {selected.endereco && (
                <div className="flex items-center gap-2 text-support">
                  <MapPin className="w-4 h-4" />
                  <span>{selected.endereco}{selected.cidade ? `, ${selected.cidade}` : ''}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => { setSelected(null); update({ cliente_id: '' }); }}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              className="input-tecflex pl-12"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
            )}
          </div>

          {clientes.length > 0 && (
            <div className="space-y-2">
              {clientes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCliente(c)}
                  className="card-tecflex w-full text-left hover:shadow-md transition-shadow"
                >
                  <p className="font-semibold">{c.nome}</p>
                  <p className="text-support">{c.cidade ?? ''}</p>
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setShowModal(true)} className="btn-outline w-full">
            <Plus className="w-5 h-5" />
            Cadastrar novo cliente
          </button>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="card-tecflex w-full max-w-md space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="section-title text-lg">Novo Cliente</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="field-label block mb-1">Nome *</label>
              <input className="input-tecflex" value={newCliente.nome} onChange={(e) => setNewCliente({ ...newCliente, nome: e.target.value })} />
            </div>
            <div>
              <label className="field-label block mb-1">Fone</label>
              <input className="input-tecflex" value={newCliente.fone} onChange={(e) => setNewCliente({ ...newCliente, fone: e.target.value })} />
            </div>
            <div>
              <label className="field-label block mb-1">Endereço</label>
              <input className="input-tecflex" value={newCliente.endereco} onChange={(e) => setNewCliente({ ...newCliente, endereco: e.target.value })} />
            </div>
            <div>
              <label className="field-label block mb-1">Cidade</label>
              <input className="input-tecflex" value={newCliente.cidade} onChange={(e) => setNewCliente({ ...newCliente, cidade: e.target.value })} />
            </div>
            <button onClick={handleSaveNew} className="btn-primary w-full">
              <Check className="w-5 h-5" />
              Salvar cliente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
