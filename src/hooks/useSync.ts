import { useEffect } from 'react';
import { db } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSync() {
  useEffect(() => {
    const syncData = async () => {
      if (!navigator.onLine) return;

      // 1. Procurar OS não sincronizadas
      const offlines = await db.ordens_os.where('sincronizado').equals(0).toArray();

      if (offlines.length > 0) {
        toast.info(`A sincronizar ${offlines.length} ordens pendentes...`);
        
        for (const os of offlines) {
          const { error } = await supabase.from('ordens_servico').insert({
            cliente_id: os.cliente_id,
            tecnico_id: os.cliente_id, // Ajusta para o ID do técnico real
            status: os.status,
            defeito_reclamado: os.defeito_reclamado,
            // ... outros campos
          });

          if (!error) {
            await db.ordens_os.update(os.id, { sincronizado: true });
          }
        }
        toast.success("Sincronização concluída!");
      }
    };

    // Tenta sincronizar ao abrir o app e quando a internet volta
    syncData();
    window.addEventListener('online', syncData);
    return () => window.removeEventListener('online', syncData);
  }, []);
}