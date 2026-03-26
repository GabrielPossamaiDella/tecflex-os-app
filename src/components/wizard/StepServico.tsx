import { useState } from 'react';
import { createPortal } from 'react-dom'; 
import { Plus, Minus, Trash2, Check, X, Package, Wrench } from 'lucide-react'; // <-- Minus adicionado aqui!
import type { OSFormData, PecaItem } from '@/pages/NovaOS';

interface Props {
  form: OSFormData;
  update: (patch: Partial<OSFormData>) => void;
}

export default function StepServico({ form, update }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [newPeca, setNewPeca] = useState<PecaItem>({ nome: '', valor_unitario: 0, quantidade: 1 });

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

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Serviços e Peças</h2>
      </div>

      <div className="space-y-5">
        
        {/* SERVIÇO EXECUTADO */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
            <Wrench size={14} className="text-indigo-600" />
            Serviço Executado
          </label>
          <textarea
            className="w-full p-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-white text-slate-800 font-medium transition-colors resize-none min-h-[120px]"
            placeholder="Descreva o que foi feito na máquina..."
            value={form.servico_executado}
            onChange={(e) => update({ servico_executado: e.target.value })}
          />
        </div>

        {/* PEÇAS UTILIZADAS */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-indigo-600" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Peças Utilizadas</h3>
            </div>
            {form.pecas.length > 0 && (
              <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
                {form.pecas.length} {form.pecas.length === 1 ? 'item' : 'itens'} — {formatCurrency(totalPecas)}
              </span>
            )}
          </div>

          {form.pecas.length > 0 && (
            <div className="space-y-2 mt-2">
              {form.pecas.map((p, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                  <div>
                    <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{p.nome}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {p.quantidade} un × {formatCurrency(p.valor_unitario)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-slate-900">{formatCurrency(p.valor_unitario * p.quantidade)}</span>
                    <button 
                      onClick={() => removePeca(i)} 
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button 
            onClick={() => setShowModal(true)} 
            className="w-full p-4 mt-2 border-2 border-dashed border-slate-300 rounded-xl text-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-50/50 hover:border-indigo-300 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Plus size={18} /> Adicionar Peça
          </button>
        </div>
      </div>

      {/* MODAL DE ADICIONAR PEÇA (PORTAL) */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
          
          <div className="relative bg-white w-full max-w-[400px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header do Modal */}
            <div className="bg-slate-900 p-6 text-white shrink-0 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Package size={20} className="text-indigo-400" />
                <h3 className="font-black tracking-widest uppercase text-lg">Nova Peça</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 bg-slate-50 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição do Produto *</label>
                <input 
                  className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-white font-bold text-slate-800 transition-colors uppercase placeholder:normal-case" 
                  value={newPeca.nome} 
                  onChange={(e) => setNewPeca({ ...newPeca, nome: e.target.value })} 
                  placeholder="Ex: Óleo de Compressor" 
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Un. (R$)</label>
                  <input 
                    type="number"
                    className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-white font-bold text-slate-800 transition-colors" 
                    value={newPeca.valor_unitario || ''} 
                    onChange={(e) => setNewPeca({ ...newPeca, valor_unitario: parseFloat(e.target.value) || 0 })} 
                    placeholder="0.00" 
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                  <div className="flex items-center bg-white border-2 border-slate-200 rounded-2xl h-14 overflow-hidden">
                    <button 
                      onClick={() => setNewPeca({ ...newPeca, quantidade: Math.max(1, newPeca.quantidade - 1) })} 
                      className="flex-1 h-full flex items-center justify-center text-indigo-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                    >
                      <Minus size={16}/>
                    </button>
                    <span className="font-black text-slate-800 w-10 text-center border-x border-slate-100">{newPeca.quantidade}</span>
                    <button 
                      onClick={() => setNewPeca({ ...newPeca, quantidade: newPeca.quantidade + 1 })} 
                      className="flex-1 h-full flex items-center justify-center text-indigo-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                    >
                      <Plus size={16}/>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-6 bg-white border-t border-slate-100">
              <button 
                onClick={addPeca} 
                className="w-full h-14 rounded-xl font-black bg-indigo-600 text-white flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-600/20 tracking-widest uppercase"
              >
                <Check size={18}/> Salvar Peça
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}