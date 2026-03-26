import { useEffect } from 'react';
import { Car, Clock, Wrench, Package, Navigation, DollarSign, Receipt, PenTool } from 'lucide-react';
import type { OSFormData } from '@/pages/NovaOS';
import SignatureCanvas from '@/components/SignatureCanvas';

interface Props {
  form: OSFormData;
  update: (patch: Partial<OSFormData>) => void;
}

export default function StepFechamento({ form, update }: Props) {
  // 1. Cálculos de Base
  const totalPecas = form.pecas.reduce((s, p) => s + p.valor_unitario * p.quantidade, 0);

  // CORREÇÃO DO BUG "NaN": Lógica segura para calcular minutos de strings como "14:30"
  let tempoMin = 0;
  if (form.hora_saida && form.hora_chegada) {
    const [h1, m1] = form.hora_saida.split(':').map(Number);
    const [h2, m2] = form.hora_chegada.split(':').map(Number);
    
    let mins1 = (h1 * 60) + (m1 || 0);
    let mins2 = (h2 * 60) + (m2 || 0);
    
    // Prevenção caso vire a meia noite (ex: começou 23:00 e acabou 01:00)
    if (mins2 < mins1) mins2 += 24 * 60;
    
    tempoMin = mins2 - mins1;
  }

  const horas = Math.floor(tempoMin / 60);
  const mins = tempoMin % 60;
  
  // Regras da Tecflex
  const maoDeObra = (tempoMin / 60) * 120; // R$ 120/h
  const deslocamento = (form.km_rodado || 0) * 1; // R$ 1 por km
  const totalGeral = maoDeObra + totalPecas + deslocamento;

  // 2. Persistência: Atualiza a OS principal em tempo real
  useEffect(() => {
    update({
      total_pecas: totalPecas,
      total_geral: totalGeral,
      tempo_atendimento_min: tempoMin,
      valor_deslocamento: deslocamento
    });
  }, [totalPecas, totalGeral, tempoMin, deslocamento]);

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Fechamento da OS</h2>
      </div>

      {/* KM - COM NOVO VISUAL PREMIUM */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Car className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
            KM Rodado (Fora de Criciúma)
          </label>
          <input
            type="number"
            className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-slate-50 font-black text-slate-800 transition-colors"
            value={form.km_rodado || ''}
            onChange={(e) => update({ km_rodado: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            min="0"
          />
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">
            * Isento para atendimentos locais
          </p>
        </div>
      </div>

      {/* RESUMO FINANCEIRO - FUNDO ESCURO PROFISSIONAL */}
      <section className="bg-slate-900 rounded-3xl p-6 shadow-2xl text-white relative overflow-hidden">
        <Receipt className="absolute -right-4 -bottom-4 text-white/5 w-32 h-32 pointer-events-none" />
        
        <div className="relative z-10">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-5">Resumo Financeiro</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-medium text-slate-300">
              <div className="flex items-center gap-2"><Clock size={16} className="text-indigo-400"/> Tempo de Atendimento</div>
              <span className="text-white font-bold">{horas}h {mins}m</span>
            </div>
            
            <div className="flex items-center justify-between text-sm font-medium text-slate-300">
              <div className="flex items-center gap-2"><Wrench size={16} className="text-indigo-400"/> Mão de Obra (R$ 120/h)</div>
              <span className="text-white font-bold">{formatCurrency(maoDeObra)}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm font-medium text-slate-300">
              <div className="flex items-center gap-2"><Package size={16} className="text-indigo-400"/> Peças Substituídas</div>
              <span className="text-white font-bold">{formatCurrency(totalPecas)}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm font-medium text-slate-300">
              <div className="flex items-center gap-2"><Navigation size={16} className="text-indigo-400"/> Deslocamento</div>
              <span className="text-white font-bold">{formatCurrency(deslocamento)}</span>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-800 flex justify-between items-end">
            <div className="flex items-center gap-2 text-[#4ade80]">
              <DollarSign size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Total Geral</span>
            </div>
            <span className="text-4xl font-black text-[#4ade80] tracking-tighter">
              {formatCurrency(totalGeral)}
            </span>
          </div>
        </div>
      </section>

      {/* ASSINATURA */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm space-y-3">
        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          <PenTool size={14} className="text-indigo-600" />
          Assinatura do Cliente
        </label>
        <div className="rounded-xl overflow-hidden border-2 border-slate-200">
          <SignatureCanvas
            onSave={(base64) => update({ assinatura_base64: base64 })}
            initialValue={form.assinatura_base64}
          />
        </div>
      </div>

    </div>
  );
}