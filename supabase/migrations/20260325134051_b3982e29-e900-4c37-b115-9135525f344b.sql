
-- Create tables for TECFLEX OS

-- Clientes table
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  fone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view clients" ON public.clientes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clients" ON public.clientes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clients" ON public.clientes
  FOR UPDATE TO authenticated USING (true);

-- Tecnicos table
CREATE TABLE public.tecnicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicians can view all technicians" ON public.tecnicos
  FOR SELECT TO authenticated USING (true);

-- Ordens de Servico table
CREATE TABLE public.ordens_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) NOT NULL,
  tecnico_id UUID REFERENCES public.tecnicos(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'concluida')),
  defeito_reclamado TEXT,
  servico_executado TEXT,
  maquina_descricao TEXT,
  hora_saida TIMESTAMP WITH TIME ZONE,
  hora_chegada TIMESTAMP WITH TIME ZONE,
  tempo_atendimento_min INTEGER GENERATED ALWAYS AS (
    CASE WHEN hora_saida IS NOT NULL AND hora_chegada IS NOT NULL
      THEN EXTRACT(EPOCH FROM (hora_chegada - hora_saida))::integer / 60
      ELSE NULL
    END
  ) STORED,
  km_rodado NUMERIC DEFAULT 0,
  valor_deslocamento NUMERIC GENERATED ALWAYS AS (COALESCE(km_rodado, 0) * 1) STORED,
  valor_hora NUMERIC NOT NULL DEFAULT 120.00,
  total_pecas NUMERIC DEFAULT 0,
  total_geral NUMERIC GENERATED ALWAYS AS (
    COALESCE(
      CASE WHEN hora_saida IS NOT NULL AND hora_chegada IS NOT NULL
        THEN (EXTRACT(EPOCH FROM (hora_chegada - hora_saida))::numeric / 3600) * 120
        ELSE 0
      END, 0
    ) + COALESCE(km_rodado * 1, 0) + COALESCE(total_pecas, 0)
  ) STORED,
  assinatura_base64 TEXT,
  sincronizado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicians can view their own OS" ON public.ordens_servico
  FOR SELECT TO authenticated
  USING (tecnico_id IN (SELECT id FROM public.tecnicos WHERE user_id = auth.uid()));
CREATE POLICY "Technicians can insert OS" ON public.ordens_servico
  FOR INSERT TO authenticated
  WITH CHECK (tecnico_id IN (SELECT id FROM public.tecnicos WHERE user_id = auth.uid()));
CREATE POLICY "Technicians can update their own OS" ON public.ordens_servico
  FOR UPDATE TO authenticated
  USING (tecnico_id IN (SELECT id FROM public.tecnicos WHERE user_id = auth.uid()));

-- Pecas OS table
CREATE TABLE public.pecas_os (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_servico_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  quantidade INTEGER NOT NULL DEFAULT 1,
  total NUMERIC GENERATED ALWAYS AS (valor_unitario * quantidade) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pecas_os ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicians can view parts of their OS" ON public.pecas_os
  FOR SELECT TO authenticated
  USING (ordem_servico_id IN (
    SELECT id FROM public.ordens_servico WHERE tecnico_id IN (
      SELECT id FROM public.tecnicos WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Technicians can insert parts" ON public.pecas_os
  FOR INSERT TO authenticated
  WITH CHECK (ordem_servico_id IN (
    SELECT id FROM public.ordens_servico WHERE tecnico_id IN (
      SELECT id FROM public.tecnicos WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Technicians can update parts" ON public.pecas_os
  FOR UPDATE TO authenticated
  USING (ordem_servico_id IN (
    SELECT id FROM public.ordens_servico WHERE tecnico_id IN (
      SELECT id FROM public.tecnicos WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Technicians can delete parts" ON public.pecas_os
  FOR DELETE TO authenticated
  USING (ordem_servico_id IN (
    SELECT id FROM public.ordens_servico WHERE tecnico_id IN (
      SELECT id FROM public.tecnicos WHERE user_id = auth.uid()
    )
  ));

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ordens_servico_updated_at
  BEFORE UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
