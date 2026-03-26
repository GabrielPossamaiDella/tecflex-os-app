import { Wrench, AlertCircle, Clock } from 'lucide-react';
import type { OSFormData } from '@/pages/NovaOS';

interface Props {
  form: OSFormData;
  update: (patch: Partial<OSFormData>) => void;
}

export default function StepDefeito({ form, update }: Props) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Equipamento</h2>
      </div>

      <div className="space-y-5">
        
        {/* DESCRIÇÃO DA MÁQUINA (NOVA PRIORIDADE) */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
            <Wrench size={14} className="text-indigo-600" />
            Máquina / Equipamento *
          </label>
          <input
            className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-white font-bold text-slate-800 transition-colors"
            placeholder="Ex: Máquina Reta Tecflex, Compressor..."
            value={form.maquina_descricao}
            onChange={(e) => update({ maquina_descricao: e.target.value })}
          />
        </div>

        {/* HORÁRIOS MANUAIS (SIMPLES E DIRETO) */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-indigo-600" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Horário do Atendimento</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center">Início</label>
              <input
                type="time"
                className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-slate-50 font-black text-slate-800 transition-colors text-center"
                value={form.hora_saida || ''}
                onChange={(e) => update({ hora_saida: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center">Término</label>
              <input
                type="time"
                className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-slate-50 font-black text-slate-800 transition-colors text-center"
                value={form.hora_chegada || ''}
                onChange={(e) => update({ hora_chegada: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* DEFEITO RECLAMADO (AGORA COMO SECUNDÁRIO) */}
        <div className="flex flex-col gap-2 pt-2">
          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
            <AlertCircle size={14} className="text-amber-500" />
            Defeito Relatado / Observação
          </label>
          <textarea
            className="w-full p-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-600 bg-white text-slate-800 font-medium transition-colors resize-none min-h-[100px]"
            placeholder="Qual o problema? (Opcional)"
            value={form.defeito_reclamado}
            onChange={(e) => update({ defeito_reclamado: e.target.value })}
          />
        </div>

      </div>
    </div>
  );
}