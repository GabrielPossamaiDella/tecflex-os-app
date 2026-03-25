import { useState } from 'react';
import { Plus, Trash2, Clock, Check, X, Package } from 'lucide-react';
import type { OSFormData, PecaItem } from '@/pages/NovaOS';

interface Props {
  form: OSFormData;
  update: (patch: Partial<OSFormData>) => void;
}

export default function StepServico({ form, update }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [newPeca, setNewPeca] = useState<PecaItem>({ nome: '', valor_unitario: 0, quantidade: 1 });
  const [chegadaRegistrada, setChegadaRegistrada] = useState(!!form.hora_chegada);

  const totalPecas = form.pecas.reduce((s, p) => s + p.valor_unitario * p.quantidade, 0);

  const addPeca = () => {
    if (!newPeca.nome.trim()) return;
    update({ pecas: [...form.pecas, newPeca] });
    setNewPeca({ nome: '', valor_unitario: 0, quantidade: 1 });
    setShowModal(false);
  };

  const removePeca = (i: number) => {
    update({ pecas: form.pecas.filter((_, idx) => idx !== i) });
  };

  const registrarChegada = () => {
    update({ hora_chegada: new Date().toISOString() });
    setChegadaRegistrada(true);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-5">
      <h2 className="section-title">O que foi feito?</h2>

      <div>
        <label className="field-label block mb-2">Serviço executado</label>
        <textarea
          className="textarea-tecflex"
          placeholder="Descreva o serviço realizado..."
          value={form.servico_executado}
          onChange={(e) => update({ servico_executado: e.target.value })}
        />
      </div>

      {/* Peças */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            <span className="field-label">Peças Utilizadas</span>
          </div>
          <span className="text-support">
            {form.pecas.length} {form.pecas.length === 1 ? 'peça' : 'peças'} — {formatCurrency(totalPecas)}
          </span>
        </div>

        {form.pecas.length > 0 && (
          <div className="space-y-2 mb-3">
            {form.pecas.map((p, i) => (
              <div key={i} className="card-tecflex flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-sm">{p.nome}</p>
                  <p className="text-support text-xs">
                    {p.quantidade} × {formatCurrency(p.valor_unitario)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">{formatCurrency(p.valor_unitario * p.quantidade)}</span>
                  <button onClick={() => removePeca(i)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowModal(true)} className="btn-outline w-full">
          <Plus className="w-5 h-5" />
          Adicionar Peça
        </button>
      </div>

      {/* Registrar chegada */}
      <div className="card-tecflex bg-info/5 border border-info/20">
        {chegadaRegistrada ? (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Chegada registrada</p>
              <p className="text-support">
                {new Date(form.hora_chegada!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ) : (
          <button onClick={registrarChegada} className="flex items-center gap-3 w-full text-left">
            <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Registrar Chegada Agora</p>
              <p className="text-support">Toque para marcar o horário de chegada</p>
            </div>
          </button>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-foreground/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="card-tecflex w-full max-w-md space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="section-title text-lg">Nova Peça</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="field-label block mb-1">Nome da peça</label>
              <input
                className="input-tecflex"
                value={newPeca.nome}
                onChange={(e) => setNewPeca({ ...newPeca, nome: e.target.value })}
                placeholder="Ex: Filtro de ar"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  className="input-tecflex"
                  value={newPeca.valor_unitario || ''}
                  onChange={(e) => setNewPeca({ ...newPeca, valor_unitario: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="field-label block mb-1">Quantidade</label>
                <input
                  type="number"
                  className="input-tecflex"
                  value={newPeca.quantidade}
                  onChange={(e) => setNewPeca({ ...newPeca, quantidade: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
            </div>
            <button onClick={addPeca} className="btn-primary w-full">
              <Check className="w-5 h-5" />
              Adicionar peça
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
