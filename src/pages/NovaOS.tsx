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

const stepLabels = ['Cliente', 'Equipamento', 'Serviço', 'Fechamento'];

export default function NovaOS() {
  const { user, tecnico } = useAuth(); 
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
    if (step === 1) return !!form.maquina_descricao;
    return true;
  };

  const handleBackOrCancel = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      navigate('/'); 
    }
  };

  const buildTimestamp = (timeStr: string | null) => {
    if (!timeStr) return null;
    if (timeStr.includes('T')) return timeStr; 
    const data = new Date();
    const [h, m] = timeStr.split(':');
    data.setHours(Number(h), Number(m), 0, 0);
    return data.toISOString();
  };

  const handleFinish = async () => {
    if (!user || !tecnico) {
      toast.error("Sessão expirada ou técnico não cadastrado.");
      return;
    }
    setSaving(true);

    try {
      const osId = crypto.randomUUID();
      const agora = new Date().toISOString();
      
      const horaInicioFull = buildTimestamp(form.hora_saida);
      const horaFimFull = buildTimestamp(form.hora_chegada);
      
      const assinaturaSegura = form.assinatura_base64 && form.assinatura_base64.startsWith('data:image') 
        ? form.assinatura_base64 
        : null;

      const novaOSLocal = {
        ...form,
        id: osId,
        tecnico_id: tecnico.id, 
        status: 'concluida' as const,
        sincronizado: false,
        updated_at: agora,
        created_at: agora,
        hora_saida: horaInicioFull,
        hora_chegada: horaFimFull,
        assinatura_base64: assinaturaSegura,
        total_pecas: form.total_pecas || 0,
        total_geral: form.total_geral || 0,
        tempo_atendimento_min: form.tempo_atendimento_min || 0,
        valor_deslocamento: form.valor_deslocamento || 0,
      };

      // 1. SALVA OFFLINE
      await db.ordens_os.add(novaOSLocal as any);
      toast.info("OS salva no celular!");

      // 2. TENTA ONLINE
      if (navigator.onLine) {
        const { error: osError } = await supabase
          .from('ordens_servico')
          .insert({
            id: osId,
            cliente_id: form.cliente_id,
            tecnico_id: tecnico.id, 
            defeito_reclamado: form.defeito_reclamado,
            maquina_descricao: form.maquina_descricao,
            hora_saida: horaInicioFull,
            servico_executado: form.servico_executado,
            hora_chegada: horaFimFull,
            km_rodado: form.km_rodado,
            assinatura_base64: assinaturaSegura,
            status: 'concluida',
            total_pecas: form.total_pecas || 0,
            total_geral: form.total_geral || 0,
            tempo_atendimento_min: form.tempo_atendimento_min || 0,
            valor_deslocamento: form.valor_deslocamento || 0,
          });

        if (!osError) {
          if (form.pecas.length > 0) {
            await supabase.from('pecas_os').insert(
              form.pecas.map((p) => ({
                ordem_servico_id: osId,
                nome: p.nome,
                valor_unitario: p.valor_unitario,
                quantidade: p.quantidade,
                total: p.quantidade * p.valor_unitario 
              }))
            );
          }
          await db.ordens_os.update(osId, { sincronizado: true });
          toast.success('OS enviada com sucesso!');
        } else {
          console.warn("Erro ao salvar OS online:", osError);
          toast.warning('Salvo localmente. Sincronização pendente.');
        }
      } else {
        toast.warning('Sem internet. A OS será enviada depois.');
      }

      // ====================================================================
      // MÁGICA AQUI: Em vez de ir para '/', ele vai direto para a OS recém criada!
      // ====================================================================
      navigate(`/os/${osId}`, { replace: true });
      
    } catch (err) {
      console.error("Erro no fechamento da OS:", err);
      toast.error('Erro crítico ao salvar a OS.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100">
      <header className="bg-slate-900 text-white px-5 py-5 sticky top-0 z-50 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4 max-w-2xl mx-auto w-full">
          <button type="button" onClick={handleBackOrCancel} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-none uppercase italic">Tecflex</h1>
            <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Criação de Atendimento</span>
          </div>
        </div>
      </header>

      <div className="bg-white sticky top-[72px] z-40 shadow-sm border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Passo {step + 1} de 4 <span className="text-indigo-500">— {stepLabels[step]}</span>
            </p>
            {!navigator.onLine && (
              <span className="flex items-center gap-1 text-[9px] bg-amber-50 text-amber-600 px-2 py-1 rounded-md font-black uppercase tracking-widest border border-amber-100">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            )}
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full pb-32 relative">
        <div className="animate-fade-in" key={step}>
          {step === 0 && <StepCliente form={form} update={update} />}
          {step === 1 && <StepDefeito form={form} update={update} />}
          {step === 2 && <StepServico form={form} update={update} />}
          {step === 3 && <StepFechamento form={form} update={update} />}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={handleBackOrCancel}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl py-3.5 text-sm uppercase tracking-wide transition-colors"
            disabled={saving}
          >
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>
          
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-3.5 text-sm uppercase tracking-wide shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              disabled={!canNext()}
            >
              Próximo
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault(); 
                handleFinish();
              }}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl py-3.5 text-sm uppercase tracking-wide shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finalizar OS'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}