import { Car, Clock, Wrench, Package, Navigation, DollarSign } from 'lucide-react';
import type { OSFormData } from '@/pages/NovaOS';
import SignatureCanvas from '@/components/SignatureCanvas';

interface Props {
  form: OSFormData;
  update: (patch: Partial<OSFormData>) => void;
}

export default function StepFechamento({ form, update }: Props) {
  const totalPecas = form.pecas.reduce((s, p) => s + p.valor_unitario * p.quantidade, 0);

  let tempoMin = 0;
  if (form.hora_saida && form.hora_chegada) {
    tempoMin = Math.round(
      (new Date(form.hora_chegada).getTime() - new Date(form.hora_saida).getTime()) / 60000
    );
  }
  const horas = Math.floor(tempoMin / 60);
  const mins = tempoMin % 60;
  const maoDeObra = (tempoMin / 60) * 120;
  const deslocamento = form.km_rodado * 1;
  const total = maoDeObra + totalPecas + deslocamento;

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-5">
      <h2 className="section-title">Resumo e assinatura</h2>

      {/* KM */}
      <div className="card-tecflex flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0">
          <Car className="w-5 h-5 text-info" />
        </div>
        <div className="flex-1">
          <label className="field-label block mb-1">KM rodado (fora de Criciúma)</label>
          <input
            type="number"
            className="input-tecflex"
            value={form.km_rodado || ''}
            onChange={(e) => update({ km_rodado: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            min="0"
          />
          <p className="text-support mt-1">Deixe 0 se o atendimento foi em Criciúma</p>
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="card-tecflex bg-background-secondary space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-support">
            <Clock className="w-4 h-4" />
            <span>Tempo</span>
          </div>
          <span className="font-semibold">{horas}h {mins}min</span>
        </div>

        <div className="h-px bg-border" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-support">
            <Wrench className="w-4 h-4" />
            <span>Mão de obra</span>
          </div>
          <span className="font-semibold">{formatCurrency(maoDeObra)}</span>
        </div>

        <div className="h-px bg-border" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-support">
            <Package className="w-4 h-4" />
            <span>Peças</span>
          </div>
          <span className="font-semibold">{formatCurrency(totalPecas)}</span>
        </div>

        <div className="h-px bg-border" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-support">
            <Navigation className="w-4 h-4" />
            <span>Deslocamento</span>
          </div>
          <span className="font-semibold">{formatCurrency(deslocamento)}</span>
        </div>

        <div className="h-[2px] bg-foreground/20" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            <span className="text-lg font-bold">TOTAL</span>
          </div>
          <span className="text-2xl font-bold text-success">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Assinatura */}
      <SignatureCanvas
        onSave={(base64) => update({ assinatura_base64: base64 })}
        initialValue={form.assinatura_base64}
      />
    </div>
  );
}
