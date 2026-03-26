import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileDown, Loader2, Phone, MapPin, User, 
  Edit3, Save, Trash2, X, Package, Wrench, AlertCircle, 
  Plus, Minus, Receipt, Trash, Share2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
// 1. CORREÇÃO: Removemos a função 'pdf' que quebrava o sistema e trouxemos o 'usePDF' que é seguro!
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image, usePDF } from '@react-pdf/renderer';

// ============================================================================
// ÁREA DO PDF - INTACTA
// ============================================================================
const pdfStyles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#fff', fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#1e293b', borderBottomStyle: 'solid', paddingBottom: 10, marginBottom: 20 },
  logo: { width: 150, height: 60, objectFit: 'contain' },
  headerInfo: { textAlign: 'right' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  osNumber: { fontSize: 16, color: '#dc2626', marginTop: 4 },
  section: { marginBottom: 15, borderWidth: 1, borderColor: '#1e293b', borderStyle: 'solid' },
  sectionTitle: { backgroundColor: '#1e293b', color: '#fff', padding: 4, fontWeight: 'bold', textTransform: 'uppercase', fontSize: 9 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', borderBottomStyle: 'solid' },
  cell: { padding: 8 },
  label: { fontSize: 7, color: '#4b5563', fontWeight: 'bold', marginBottom: 2, textTransform: 'uppercase' },
  value: { fontSize: 10, color: '#000', fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#1e293b', borderBottomStyle: 'solid' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e5e7eb', borderTopStyle: 'solid', paddingTop: 10, textAlign: 'center', fontSize: 8, color: '#9ca3af' },
  signatureContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  signatureBox: { width: '45%', textAlign: 'center' },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: '#000', borderBottomStyle: 'solid', marginBottom: 5, height: 40, justifyContent: 'flex-end', alignItems: 'center' },
  totalBox: { width: '100%', padding: 10, backgroundColor: '#f9fafb' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalFinal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: '#1e293b', borderTopStyle: 'solid' }
});

const OSPdfDocument = ({ os, pecas }: any) => {
  const formatCurrency = (v: number) => `R$ ${v.toFixed(2)}`;
  
  const maoDeObra = ((os?.tempo_atendimento_min || 0) / 60) * (os?.valor_hora || 0);
  const subtotalPecas = pecas.reduce((acc: any, p: any) => acc + (p.total || 0), 0);
  const totalGeral = subtotalPecas + (os?.valor_deslocamento || 0) + maoDeObra;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Image src="/logo.png" style={pdfStyles.logo} />
          <View style={pdfStyles.headerInfo}>
            <Text style={pdfStyles.title}>ORDEM DE SERVIÇO</Text>
            <Text style={pdfStyles.osNumber}>Nº {os.id.slice(0, 8).toUpperCase()}</Text>
            <Text>Data: {new Date(os.created_at).toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>1. Dados do Cliente</Text>
          <View style={pdfStyles.row}>
            <View style={[pdfStyles.cell, { width: '65%', borderRightWidth: 1, borderRightColor: '#e5e7eb', borderRightStyle: 'solid' }]}>
              <Text style={pdfStyles.label}>Nome / Razão Social</Text>
              <Text style={pdfStyles.value}>{os.clientes?.nome || 'N/A'}</Text>
            </View>
            <View style={[pdfStyles.cell, { width: '35%' }]}>
              <Text style={pdfStyles.label}>Telefone</Text>
              <Text style={pdfStyles.value}>{os.clientes?.fone || 'N/A'}</Text>
            </View>
          </View>
          <View style={pdfStyles.cell}>
            <Text style={pdfStyles.label}>Endereço Completo</Text>
            <Text style={pdfStyles.value}>{os.clientes?.endereco} - {os.clientes?.cidade || ''}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>2. Equipamento e Relato</Text>
          <View style={pdfStyles.row}>
            <View style={[pdfStyles.cell, { width: '50%', borderRightWidth: 1, borderRightColor: '#e5e7eb', borderRightStyle: 'solid' }]}>
              <Text style={pdfStyles.label}>Máquina</Text>
              <Text style={pdfStyles.value}>{os.maquina_descricao || 'N/A'}</Text>
            </View>
            <View style={[pdfStyles.cell, { width: '50%' }]}>
              <Text style={pdfStyles.label}>Defeito Reclamado</Text>
              <Text style={pdfStyles.value}>{os.defeito_reclamado || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={[pdfStyles.section, { minHeight: 50 }]}>
          <Text style={pdfStyles.sectionTitle}>3. Serviço Executado</Text>
          <View style={pdfStyles.cell}><Text>{os.servico_executado || 'Nenhum registro.'}</Text></View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>4. Peças Aplicadas</Text>
          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.cell, { width: '60%', fontWeight: 'bold' }]}>Descrição</Text>
            <Text style={[pdfStyles.cell, { width: '15%', textAlign: 'center', fontWeight: 'bold' }]}>Qtd</Text>
            <Text style={[pdfStyles.cell, { width: '25%', textAlign: 'right', fontWeight: 'bold' }]}>Total</Text>
          </View>
          {pecas.map((p: any) => (
            <View key={p.id || Math.random()} style={pdfStyles.row}>
              <Text style={[pdfStyles.cell, { width: '60%' }]}>{p.nome}</Text>
              <Text style={[pdfStyles.cell, { width: '15%', textAlign: 'center' }]}>{p.quantidade}</Text>
              <Text style={[pdfStyles.cell, { width: '25%', textAlign: 'right' }]}>{formatCurrency(p.total)}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <View style={{ width: '50%' }}>
            <View style={pdfStyles.signatureContainer}>
              <View style={pdfStyles.signatureBox}>
                <View style={pdfStyles.signatureLine}>{os.assinatura_base64 && <Image src={os.assinatura_base64} style={{ height: 35, width: 80 }} />}</View>
                <Text style={{ fontWeight: 'bold', fontSize: 8 }}>De Acordo - Cliente</Text>
              </View>
            </View>
            <View style={[pdfStyles.signatureContainer, { marginTop: 15 }]}>
              <View style={pdfStyles.signatureBox}><View style={pdfStyles.signatureLine}></View><Text style={{ fontWeight: 'bold', fontSize: 8 }}>Técnico Responsável</Text></View>
            </View>
          </View>
          <View style={{ width: '45%' }}>
            <View style={pdfStyles.section}>
              <Text style={pdfStyles.sectionTitle}>5. Resumo Financeiro</Text>
              <View style={pdfStyles.totalBox}>
                <View style={pdfStyles.totalRow}><Text style={{ fontSize: 8 }}>Mão de Obra</Text><Text>{formatCurrency(maoDeObra)}</Text></View>
                <View style={pdfStyles.totalRow}><Text style={{ fontSize: 8 }}>Deslocamento</Text><Text>{formatCurrency(os.valor_deslocamento || 0)}</Text></View>
                <View style={pdfStyles.totalFinal}><Text style={{ fontWeight: 'bold', fontSize: 10 }}>TOTAL GERAL</Text><Text style={{ fontWeight: 'bold', fontSize: 12 }}>{formatCurrency(totalGeral)}</Text></View>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
// ============================================================================


export default function OSDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [os, setOs] = useState<any>(null);
  const [pecas, setPecas] = useState<any[]>([]);
  const [pecasDeletadas, setPecasDeletadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // 2. Trava de segurança mantida
  useEffect(() => { 
    if (id && id !== 'undefined' && id !== 'nova-os' && !id.includes('nova-os')) {
      loadData(); 
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadData = async () => {
    if (!id || id === 'undefined' || id === 'nova-os' || id.includes('nova-os')) {
       setLoading(false);
       return; 
    }

    try {
      setLoading(true);
      const { data: osData, error: osError } = await supabase.from('ordens_servico').select('*, clientes(*)').eq('id', id).single();
      if (osError) throw osError;
      
      const { data: pecasData } = await supabase.from('pecas_os').select('*').eq('ordem_servico_id', id);
      setOs(osData);
      setPecas(pecasData || []);
      setPecasDeletadas([]);
    } catch (err) {
      toast.error("Erro ao carregar dados.");
      navigate('/');
    } finally { 
      setLoading(false); 
    }
  };

  const subtotalPecas = pecas.reduce((acc, p) => acc + (p.total || 0), 0);
  const maoDeObra = ((os?.tempo_atendimento_min || 0) / 60) * (os?.valor_hora || 0);
  const totalCalculado = subtotalPecas + (os?.valor_deslocamento || 0) + maoDeObra;

  // 3. NOVO SISTEMA DE GERAR PDF SEGURO EM BACKGROUND (Que não colapsa a app)
  const documentoSeguro = os ? <OSPdfDocument os={os} pecas={pecas} /> : <Document><Page><Text>Carregando...</Text></Page></Document>;
  const [pdfInstance] = usePDF({ document: documentoSeguro });

  const adicionarPeca = () => {
    const novaPeca = { nome: 'Nova Peça', quantidade: 1, valor_unitario: 0, total: 0, ordem_servico_id: id, tempId: Math.random().toString(36).substring(7) };
    setPecas([...pecas, novaPeca]);
  };

  const removerPeca = (index: number) => {
    const pecaParaRemover = pecas[index];
    if (pecaParaRemover.id) setPecasDeletadas([...pecasDeletadas, pecaParaRemover.id]);
    setPecas(pecas.filter((_, i) => i !== index));
  };

  const updatePecaLocal = (index: number, field: string, value: any) => {
    const novasPecas = [...pecas];
    novasPecas[index] = { ...novasPecas[index], [field]: value };
    if (field === 'quantidade' || field === 'valor_unitario') novasPecas[index].total = novasPecas[index].quantidade * novasPecas[index].valor_unitario;
    setPecas(novasPecas);
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const { error: osError } = await supabase.from('ordens_servico').update({
        maquina_descricao: os.maquina_descricao,
        defeito_reclamado: os.defeito_reclamado,
        servico_executado: os.servico_executado,
        total_pecas: subtotalPecas,
        total_geral: totalCalculado
      }).eq('id', id!);
      
      if (osError) throw osError;

      if (pecasDeletadas.length > 0) {
        await supabase.from('pecas_os').delete().in('id', pecasDeletadas);
      }

      for (const p of pecas) {
        if (p.id) {
          await supabase.from('pecas_os').update({ nome: p.nome, quantidade: p.quantidade, valor_unitario: p.valor_unitario, total: p.total }).eq('id', p.id);
        } else {
          const { tempId, ...dados } = p;
          await supabase.from('pecas_os').insert([dados]);
        }
      }

      toast.success('Pente fino concluído! Tudo salvo.');
      setIsEditing(false);
      loadData();
    } catch (err) { toast.error("Erro ao salvar."); }
    finally { setLoading(false); }
  };

  // 4. ENVIO DE PDF ATUALIZADO USANDO O HOOK SEGURO
  const handleSharePDF = async () => {
    if (pdfInstance.loading) {
      toast.info("Aguarde, terminando de preparar o PDF...");
      return;
    }
    if (pdfInstance.error || !pdfInstance.blob) {
      toast.error("Ocorreu um erro ao gerar o documento para envio.");
      return;
    }

    try {
      const fileName = `OS_TECFLEX_${os.id.slice(0, 8)}.pdf`;
      const file = new File([pdfInstance.blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ordem de Serviço - Tecflex`,
          text: `Segue em anexo a Ordem de Serviço de ${os.clientes?.nome} gerada pela Tecflex.`
        });
      } else {
        toast.error("O seu navegador não suporta envio direto. Use o botão branco para baixar.");
      }
    } catch (err) {
      toast.error("Ocorreu um erro ao compartilhar.");
    }
  };

  if (loading || !os) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600 w-12 h-12" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900 overflow-x-hidden">
      <header className="bg-slate-900 text-white p-4 sm:p-5 sticky top-0 z-50 flex items-center justify-between shadow-xl gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/')} className="p-2 shrink-0 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft size={20} /></button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold leading-none uppercase truncate">Ajustes da OS</h1>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-indigo-400 font-bold block truncate">Modo Pente Fino</span>
          </div>
        </div>
        
        <div className="flex gap-2 shrink-0">
          {isEditing ? (
            <>
              <button onClick={handleUpdate} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95"><Save size={16} /><span className="hidden sm:inline">Salvar Tudo</span></button>
              <button onClick={() => { setIsEditing(false); loadData(); }} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"><X size={20} /></button>
            </>
          ) : (
            <>
              <button onClick={handleSharePDF} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg transition-all active:scale-95" title="Compartilhar pelo WhatsApp">
                <Share2 size={16} /> <span className="hidden sm:inline">Enviar</span>
              </button>

              <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-lg text-xs font-bold shadow-lg text-white transition-all active:scale-95"><Edit3 size={16} /> <span className="hidden sm:inline">Editar</span></button>
              
              <PDFDownloadLink document={<OSPdfDocument os={os} pecas={pecas} />} fileName={`OS_TECFLEX_${os.id.slice(0, 8)}.pdf`}>
                {({ loading }) => (
                  <button className="flex items-center gap-2 bg-white text-slate-900 px-3 py-2 rounded-lg text-xs font-bold shadow-lg transition-all active:scale-95" title="Baixar Arquivo">
                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <FileDown size={16} />}
                  </button>
                )}
              </PDFDownloadLink>
            </>
          )}
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-6">
        
        <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-indigo-600">
            <User size={18} />
            <h3 className="text-xs font-black uppercase tracking-widest">Cliente</h3>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{os.clientes?.nome}</h2>
          <p className="text-sm text-slate-500 font-medium">{os.clientes?.fone} | {os.clientes?.endereco}</p>
        </section>

        <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <Wrench size={18} />
            <h3 className="text-xs font-black uppercase tracking-widest">Máquina e Defeito</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Descrição da Máquina</label>
              {isEditing ? (
                <input className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 p-3 rounded-xl text-sm font-bold outline-none" value={os.maquina_descricao || ''} onChange={(e) => setOs({...os, maquina_descricao: e.target.value})} />
              ) : (
                <p className="text-md font-bold text-slate-800">{os.maquina_descricao || '—'}</p>
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Defeito Reclamado</label>
              {isEditing ? (
                <textarea className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 p-3 rounded-xl text-sm outline-none h-20 resize-none" value={os.defeito_reclamado || ''} onChange={(e) => setOs({...os, defeito_reclamado: e.target.value})} />
              ) : (
                <p className="text-sm text-slate-600 leading-relaxed">{os.defeito_reclamado || '—'}</p>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <Package size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest">Peças e Materiais</h3>
            </div>
            {isEditing && (
              <button onClick={adicionarPeca} className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black hover:bg-indigo-100 transition-colors">
                <Plus size={12} /> ADICIONAR ITEM
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {pecas.map((p, index) => (
              <div key={p.id || p.tempId} className={`p-4 rounded-2xl border transition-all ${isEditing ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-50 bg-slate-50/50'}`}>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input className="flex-1 bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold outline-none" value={p.nome} onChange={(e) => updatePecaLocal(index, 'nome', e.target.value)} />
                      <button onClick={() => removerPeca(index)} className="self-end sm:self-auto p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash size={18} /></button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1">
                        <button onClick={() => updatePecaLocal(index, 'quantidade', Math.max(1, p.quantidade - 1))} className="p-1 text-indigo-600"><Minus size={14}/></button>
                        <span className="text-sm font-black w-6 text-center">{p.quantidade}</span>
                        <button onClick={() => updatePecaLocal(index, 'quantidade', p.quantidade + 1)} className="p-1 text-indigo-600"><Plus size={14}/></button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">R$</span>
                        <input type="number" className="w-20 bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold text-right" value={p.valor_unitario} onChange={(e) => updatePecaLocal(index, 'valor_unitario', Number(e.target.value))} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-sm font-bold text-slate-700 break-words">{p.quantidade}x {p.nome}</span>
                    <span className="text-sm font-black text-slate-900 shrink-0">R$ {p.total.toFixed(2)}</span>
                  </div>
                )}
              </div>
            ))}
            {pecas.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma peça aplicada.</p>}
          </div>
        </section>

        <section className="bg-[#0f172a] rounded-3xl p-5 shadow-2xl text-white relative overflow-hidden">
          <Receipt className="absolute -right-4 -bottom-4 text-white/5 w-32 h-32 pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-indigo-400 mb-5">Resumo Financeiro</h3>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-5">
              <div className="space-y-2.5 text-xs sm:text-sm font-medium text-slate-300 w-full sm:w-auto flex-1 pr-0 sm:pr-8">
                <div className="flex justify-between sm:justify-start sm:gap-4">
                  <span>Mão de obra:</span>
                  <span>R$ {maoDeObra.toFixed(2)}</span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-4">
                  <span>Deslocamento:</span>
                  <span>R$ {(os?.valor_deslocamento || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-4 text-white font-bold">
                  <span>Total de Peças:</span>
                  <span>R$ {subtotalPecas.toFixed(2)}</span>
                </div>
              </div>

              <div className="w-full sm:w-auto text-right border-t border-slate-700/80 pt-4 sm:border-0 sm:pt-0 shrink-0">
                <p className="text-[11px] font-black text-indigo-400 uppercase mb-1 tracking-widest">Total Geral</p>
                <p className="text-4xl font-black text-[#4ade80] tracking-tighter">
                  R$ {totalCalculado.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}