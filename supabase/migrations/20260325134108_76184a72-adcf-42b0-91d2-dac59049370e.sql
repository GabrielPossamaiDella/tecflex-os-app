
-- Fix permissive RLS policies on clientes table
-- All authenticated technicians (who have a record in tecnicos) can manage clients
DROP POLICY "Authenticated users can insert clients" ON public.clientes;
DROP POLICY "Authenticated users can update clients" ON public.clientes;

CREATE POLICY "Technicians can insert clients" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tecnicos WHERE user_id = auth.uid()));

CREATE POLICY "Technicians can update clients" ON public.clientes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tecnicos WHERE user_id = auth.uid()));
