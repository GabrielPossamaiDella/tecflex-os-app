import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, WifiOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/db'; 
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
  total_pecas?: number;
  total_geral?: number;
  tempo_atendimento_min?: number;
  valor_deslocamento?: number;
}

const stepLabels = ['Cliente', 'Defeito', 'Serviço', 'Fechamento'];

export default function NovaOS() {
  const { user } = useAuth(); 
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

  // Função centralizada e segura para voltar ou cancelar
  const handleBackOrCancel = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      // Se não tem passo para voltar, volta para a Home em segurança!
      navigate('/'); 
    }
  };

  const handleFinish = async () => {
    if (!user) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }
    setSaving(true);

    try {
      const osId = crypto.randomUUID();
      const agora = new Date().toISOString();
      
      const novaOSLocal = {
        ...form,
        id: osId,
        tecnico_id: user.id,
        status: 'concluida' as const,
        sincronizado: false,
        updated_at: agora,
        created_at: agora,
        total_pecas: form.total_pecas || 0,
        total_geral: form.total_geral || 0,
        km_rodado: form.km_rodado || 0,
      };

      // 1. SALVAMENTO OFFLINE GARANTIDO
      await db.ordens_os.add(novaOSLocal as any);
      toast.info("OS salva no celular!");

      // 2. TENTATIVA ONLINE
      if (navigator.onLine) {
        const { error: osError } = await supabase
          .from('ordens_servico')
          .insert({
            id: osId,
            cliente_id: form.cliente_id,
            tecnico_id: user.id,
            defeito_reclamado: form.defeito_reclamado,
            maquina_descricao: form.maquina_descricao,
            hora_saida: form.hora_saida,
            servico_executado: form.servico_executado,
            hora_chegada: form.hora_chegada,
            km_rodado: form.km_rodado,
            // REMOVIDO: total_pecas e total_geral para o Supabase calcular sozinho
            assinatura_base64: form.assinatura_base64,
            status: 'concluida',
          });

        if (!osError) {
          if (form.pecas.length > 0) {
            await supabase.from('pecas_os').insert(
              form.pecas.map((p) => ({
                ordem_servico_id: osId,
                nome: p.nome,
                valor_unitario: p.valor_unitario,
                quantidade: p.quantidade,
              }))
            );
          }
          await db.ordens_os.update(osId, { sincronizado: true });
          toast.success('OS enviada com sucesso!');
        } else {
          console.warn("Erro ao salvar OS online, mantendo offline:", osError);
          toast.warning('Salvo localmente. Sincronização pendente.');
        }
      } else {
        toast.warning('Sem internet. A OS será enviada automaticamente depois.');
      }

      // 3. RETORNO SEGURO
      navigate('/', { replace: true }); // replace impede que o usuário volte para essa tela vazia
    } catch (err) {
      console.error("Erro no fechamento da OS:", err);
      toast.error('Erro crítico ao salvar a OS.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-secondary flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button type="button" onClick={handleBackOrCancel} className="opacity-80 hover:opacity-100 p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Nova Ordem de Serviço</h1>
        </div>
      </header>

      {/* Barra de Progresso */}
      <div className="bg-background sticky top-[60px] z-40 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / 4) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs font-medium text-support">
              Passo {step + 1} de 4 — {stepLabels[step]}
            </p>
            {!navigator.onLine && (
               <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase">
                 <WifiOff className="w-3 h-3" /> Offline
               </span>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo do Form */}
      <main className="flex-1 max-w-lg mx-auto px-4 py-6 w-full pb-28 relative">
        <div className="animate-fade-in" key={step}>
          {step === 0 && <StepCliente form={form} update={update} />}
          {step === 1 && <StepDefeito form={form} update={update} />}
          {step === 2 && <StepServico form={form} update={update} />}
          {step === 3 && <StepFechamento form={form} update={update} />}
        </div>
      </main>

      {/* Botões do Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            type="button"
            onClick={handleBackOrCancel}
            className="btn-secondary flex-1"
            disabled={saving}
          >
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="btn-primary flex-1"
              disabled={!canNext()}
            >
              Próximo
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault(); 
                handleFinish();
              }}
              className="btn-primary flex-1 bg-success hover:bg-success-dark border-none"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finalizar Atendimento'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}