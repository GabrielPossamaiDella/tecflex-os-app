import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, User, Phone, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from '@/components/StatusBadge';
import { toast } from 'sonner';

interface OSDetail {
  id: string;
  status: string;
  defeito_reclamado: string | null;
  servico_executado: string | null;
  maquina_descricao: string | null;
  hora_saida: string | null;
  hora_chegada: string | null;
  tempo_atendimento_min: number | null;
  km_rodado: number | null;
  valor_deslocamento: number | null;
  valor_hora: number;
  total_pecas: number | null;
  total_geral: number | null;
  assinatura_base64: string | null;
  created_at: string;
  clientes: { nome: string; fone: string | null; endereco: string | null; cidade: string | null } | null;
}

interface Peca {
  id: string;
  nome: string;
  valor_unitario: number;
  quantidade: number;
  total: number;
}

export default function OSDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [os, setOs] = useState<OSDetail | null>(null);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    cliente: true,
    defeito: true,
    servico: false,
    pecas: false,
    financeiro: true,
    assinatura: false,
  });

  useEffect(() => {
    loadOS();
  }, [id]);

  const loadOS = async () => {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*, clientes(nome, fone, endereco, cidade)')
      .eq('id', id!)
      .single();

    if (error || !data) {
      toast.error('Erro ao carregar ordem de serviço');
      navigate('/');
      return;
    }
    setOs(data);

    const { data: pecasData } = await supabase
      .from('pecas_os')
      .select('*')
      .eq('ordem_servico_id', id!);
    setPecas(pecasData ?? []);
    setLoading(false);
  };

  const toggleStatus = async () => {
    if (!os) return;
    const next = os.status === 'aberta' ? 'em_andamento' : os.status === 'em_andamento' ? 'concluida' : 'aberta';
    const { error } = await supabase
      .from('ordens_servico')
      .update({ status: next })
      .eq('id', os.id);
    if (error) { toast.error('Erro ao alterar status'); return; }
    setOs({ ...os, status: next });
    toast.success('Status atualizado!');
  };

  const shareOS = async () => {
    if (!os) return;
    const text = `OS TECFLEX\nCliente: ${os.clientes?.nome}\nDefeito: ${os.defeito_reclamado}\nTotal: R$ ${os.total_geral?.toFixed(2)}`;
    if (navigator.share) {
      await navigator.share({ title: 'Ordem de Serviço', text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado para a área de transferência!');
    }
  };

  const toggle = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const formatCurrency = (v: number | null) =>
    (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-secondary">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!os) return null;

  const tempoH = Math.floor((os.tempo_atendimento_min ?? 0) / 60);
  const tempoM = (os.tempo_atendimento_min ?? 0) % 60;
  const maoDeObra = ((os.tempo_atendimento_min ?? 0) / 60) * os.valor_hora;

  const Section = ({ title, sectionKey, children }: { title: string; sectionKey: string; children: React.ReactNode }) => (
    <div className="card-tecflex">
      <button onClick={() => toggle(sectionKey)} className="flex items-center justify-between w-full">
        <span className="font-bold text-base">{title}</span>
        {openSections[sectionKey] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      {openSections[sectionKey] && <div className="mt-4 space-y-2 animate-fade-in">{children}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background-secondary">
      <header className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="opacity-80 hover:opacity-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Ordem de Serviço</h1>
              <p className="text-xs opacity-80">#{os.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleStatus}>
              <StatusBadge status={os.status} />
            </button>
            <button onClick={shareOS} className="opacity-80 hover:opacity-100">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-fade-in">
        <Section title="Cliente" sectionKey="cliente">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">{os.clientes?.nome}</span>
          </div>
          {os.clientes?.fone && (
            <div className="flex items-center gap-2 text-support">
              <Phone className="w-4 h-4" />
              <span>{os.clientes.fone}</span>
            </div>
          )}
          {os.clientes?.endereco && (
            <div className="flex items-center gap-2 text-support">
              <MapPin className="w-4 h-4" />
              <span>{os.clientes.endereco}{os.clientes.cidade ? `, ${os.clientes.cidade}` : ''}</span>
            </div>
          )}
        </Section>

        <Section title="Defeito e Máquina" sectionKey="defeito">
          <p className="text-support">{os.defeito_reclamado || '—'}</p>
          {os.maquina_descricao && (
            <p className="text-support mt-2">
              <span className="font-semibold text-foreground">Máquina:</span> {os.maquina_descricao}
            </p>
          )}
        </Section>

        <Section title="Serviço Executado" sectionKey="servico">
          <p className="text-support">{os.servico_executado || '—'}</p>
        </Section>

        <Section title={`Peças (${pecas.length})`} sectionKey="pecas">
          {pecas.length === 0 ? (
            <p className="text-support">Nenhuma peça registrada</p>
          ) : (
            pecas.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-semibold text-sm">{p.nome}</p>
                  <p className="text-support text-xs">{p.quantidade} × {formatCurrency(p.valor_unitario)}</p>
                </div>
                <span className="font-semibold text-sm">{formatCurrency(p.total)}</span>
              </div>
            ))
          )}
        </Section>

        <Section title="Financeiro" sectionKey="financeiro">
          <div className="space-y-2">
            <div className="flex justify-between text-support">
              <span>⏱ Tempo</span>
              <span className="font-semibold text-foreground">{tempoH}h {tempoM}min</span>
            </div>
            <div className="flex justify-between text-support">
              <span>🔧 Mão de obra</span>
              <span className="font-semibold text-foreground">{formatCurrency(maoDeObra)}</span>
            </div>
            <div className="flex justify-between text-support">
              <span>📦 Peças</span>
              <span className="font-semibold text-foreground">{formatCurrency(os.total_pecas)}</span>
            </div>
            <div className="flex justify-between text-support">
              <span>🚗 Deslocamento</span>
              <span className="font-semibold text-foreground">{formatCurrency(os.valor_deslocamento)}</span>
            </div>
            <div className="h-[2px] bg-foreground/20 my-2" />
            <div className="flex justify-between">
              <span className="text-lg font-bold">💰 TOTAL</span>
              <span className="text-2xl font-bold text-success">{formatCurrency(os.total_geral)}</span>
            </div>
          </div>
        </Section>

        {os.assinatura_base64 && (
          <Section title="Assinatura" sectionKey="assinatura">
            <div className="border border-border rounded-xl overflow-hidden bg-background">
              <img src={os.assinatura_base64} alt="Assinatura do cliente" className="w-full" />
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}
