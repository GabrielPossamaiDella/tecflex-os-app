import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StepCliente from '@/components/wizard/StepCliente';
import StepDefeito from '@/components/wizard/StepDefeito';
import StepServico from '@/components/wizard/StepServico';
import StepFechamento from '@/components/wizard/StepFechamento';

export interface PecaItem {
  nome: string;
  valor_unitario: number;
  quantidade: number;
}

export interface OSFormData {
  cliente_id: string;
  defeito_reclamado: string;
  maquina_descricao: string;
  hora_saida: string | null;
  servico_executado: string;
  pecas: PecaItem[];
  hora_chegada: string | null;
  km_rodado: number;
  assinatura_base64: string | null;
}

const stepLabels = ['Cliente', 'Defeito', 'Serviço', 'Fechamento'];

export default function NovaOS() {
  const { tecnico } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<OSFormData>({
    cliente_id: '',
    defeito_reclamado: '',
    maquina_descricao: '',
    hora_saida: null,
    servico_executado: '',
    pecas: [],
    hora_chegada: null,
    km_rodado: 0,
    assinatura_base64: null,
  });

  const update = (patch: Partial<OSFormData>) => setForm((f) => ({ ...f, ...patch }));

  const canNext = () => {
    if (step === 0) return !!form.cliente_id;
    if (step === 1) return !!form.defeito_reclamado;
    return true;
  };

  const handleFinish = async () => {
    if (!tecnico) return;
    setSaving(true);

    const totalPecas = form.pecas.reduce((s, p) => s + p.valor_unitario * p.quantidade, 0);

    const { data: os, error } = await supabase
      .from('ordens_servico')
      .insert({
        cliente_id: form.cliente_id,
        tecnico_id: tecnico.id,
        defeito_reclamado: form.defeito_reclamado,
        maquina_descricao: form.maquina_descricao,
        hora_saida: form.hora_saida,
        servico_executado: form.servico_executado,
        hora_chegada: form.hora_chegada,
        km_rodado: form.km_rodado,
        total_pecas: totalPecas,
        assinatura_base64: form.assinatura_base64,
        status: form.hora_chegada ? 'concluida' : 'em_andamento',
      })
      .select('id')
      .single();

    if (error || !os) {
      toast.error('Erro ao salvar a ordem de serviço.');
      setSaving(false);
      return;
    }

    // Insert pecas
    if (form.pecas.length > 0) {
      const { error: pecasError } = await supabase.from('pecas_os').insert(
        form.pecas.map((p) => ({
          ordem_servico_id: os.id,
          nome: p.nome,
          valor_unitario: p.valor_unitario,
          quantidade: p.quantidade,
        }))
      );
      if (pecasError) {
        toast.error('OS salva, mas houve erro ao salvar peças.');
      }
    }

    toast.success('Ordem de serviço criada com sucesso!');
    navigate(`/os/${os.id}`);
  };

  return (
    <div className="min-h-screen bg-background-secondary flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => (step > 0 ? setStep(step - 1) : navigate('/'))} className="opacity-80 hover:opacity-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Nova Ordem de Serviço</h1>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-background sticky top-[60px] z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / 4) * 100}%` }}
            />
          </div>
          <p className="text-support mt-2">
            Passo {step + 1} de 4 — {stepLabels[step]}
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto px-4 py-6 w-full pb-28">
        <div className="animate-fade-in" key={step}>
          {step === 0 && <StepCliente form={form} update={update} />}
          {step === 1 && <StepDefeito form={form} update={update} />}
          {step === 2 && <StepServico form={form} update={update} />}
          {step === 3 && <StepFechamento form={form} update={update} />}
        </div>
      </main>

      {/* Footer buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4 z-50">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={() => (step > 0 ? setStep(step - 1) : navigate('/'))}
            className="btn-secondary flex-1"
          >
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="btn-primary flex-1"
              disabled={!canNext()}
            >
              Próximo
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="btn-primary flex-1"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar e Finalizar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
