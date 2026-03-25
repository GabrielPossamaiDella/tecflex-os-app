import { useState } from 'react';
import { Clock, Check } from 'lucide-react';
import type { OSFormData } from '@/pages/NovaOS';

interface Props {
  form: OSFormData;
  update: (patch: Partial<OSFormData>) => void;
}

export default function StepDefeito({ form, update }: Props) {
  const [saidaRegistrada, setSaidaRegistrada] = useState(!!form.hora_saida);

  const registrarSaida = () => {
    update({ hora_saida: new Date().toISOString() });
    setSaidaRegistrada(true);
  };

  return (
    <div className="space-y-5">
      <h2 className="section-title">O que está com defeito?</h2>

      <div>
        <label className="field-label block mb-2">Defeito reclamado *</label>
        <textarea
          className="textarea-tecflex"
          placeholder="Descreva o problema relatado pelo cliente..."
          value={form.defeito_reclamado}
          onChange={(e) => update({ defeito_reclamado: e.target.value })}
        />
      </div>

      <div>
        <label className="field-label block mb-2">Descrição da máquina</label>
        <textarea
          className="textarea-tecflex min-h-[80px]"
          placeholder="Ex: Compressor Schulz 10HP"
          value={form.maquina_descricao}
          onChange={(e) => update({ maquina_descricao: e.target.value })}
        />
      </div>

      {/* Registrar saída */}
      <div className="card-tecflex bg-info/5 border border-info/20">
        {saidaRegistrada ? (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Saída registrada</p>
              <p className="text-support">
                {new Date(form.hora_saida!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ) : (
          <button onClick={registrarSaida} className="flex items-center gap-3 w-full text-left">
            <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Registrar Saída Agora</p>
              <p className="text-support">Toque para marcar o horário de saída</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
