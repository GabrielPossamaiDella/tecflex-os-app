import { Wrench } from 'lucide-react';

export default function StepDefeito({ form, update }: any) {
  // Lista de defeitos comuns para os botões rápidos
  const defeitosRapidos = [
    "Ponto pulando", "Quebrando agulha", "Linha arrebentando", 
    "Barulho anormal", "Máquina travada", "Vazamento de óleo"
  ];

  // Função que adiciona o texto do botão na caixa de texto
  const adicionarTag = (tag: string) => {
    const atual = form.defeito_reclamado ? form.defeito_reclamado + ", " : "";
    update({ defeito_reclamado: atual + tag });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Equipamento</h2>
        <p className="text-slate-500 text-base">Qual máquina e o que está acontecendo?</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 block">
            Modelo da Máquina
          </label>
          <div className="relative">
            <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
            <input
              type="text"
              placeholder="Ex: Reta Industrial, Overlock..."
              // Aumentei o p-4 e text-lg para o campo ficar bem grande
              className="w-full bg-white border-2 border-slate-200 focus:border-indigo-600 p-4 pl-12 rounded-2xl text-lg font-medium outline-none transition-all placeholder:text-slate-400"
              value={form.maquina_descricao || ''}
              onChange={(e) => update({ maquina_descricao: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 block">
            Defeito Reclamado
          </label>
          
          {/* MÁGICA: BOTÕES RÁPIDOS */}
          <div className="flex flex-wrap gap-2 mb-3">
            {defeitosRapidos.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => adicionarTag(tag)}
                className="bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-600 hover:text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors active:scale-95"
              >
                + {tag}
              </button>
            ))}
          </div>

          <textarea
            placeholder="Descreva o problema ou use os botões acima..."
            className="w-full bg-white border-2 border-slate-200 focus:border-indigo-600 p-4 rounded-2xl text-lg font-medium outline-none transition-all placeholder:text-slate-400 h-32 resize-none"
            value={form.defeito_reclamado || ''}
            onChange={(e) => update({ defeito_reclamado: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}