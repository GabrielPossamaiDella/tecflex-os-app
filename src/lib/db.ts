import Dexie, { type Table } from 'dexie';

// Interface para o Cache de Clientes
export interface ClienteLocal {
  documento: any;
  id: string;
  nome: string;
  fone: string | null;
  endereco: string | null;
  cidade: string | null;
  sincronizado?: boolean;
}

export interface OrdemServico {
  tempo_atendimento_min: any;
  pecas: any;
  created_at: any;
  id?: string;
  cliente_id?: string;
  tecnico_id?: string;
  status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';
  cliente_nome?: string;
  cliente_fone?: string;
  cliente_endereco?: string;
  cidade?: string;
  defeito_reclamado?: string;
  servico_executado?: string;
  maquina_descricao?: string;
  hora_saida?: string;
  hora_chegada?: string;
  km_rodado: number;
  valor_deslocamento: number;
  total_pecas: number;
  total_geral: number;
  assinatura_base64?: string;
  sincronizado: boolean; 
  updated_at: string;
}

export class TecflexDatabase extends Dexie {
  // DECLARAÇÃO DAS TABELAS (O que resolve o erro vermelho)
  ordens_os!: Table<OrdemServico>;
  clientes_cache!: Table<ClienteLocal>; 

  constructor() {
    super('TecflexOS');
this.version(2).stores({
  ordens_os: 'id, cliente_id, tecnico_id, status, sincronizado, created_at',
  clientes_cache: 'id, nome, fone, documento, bairro, sincronizado',
    });
  }
}

export const db = new TecflexDatabase();