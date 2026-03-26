// Sincronização invisível em segundo plano DESATIVADA.
// O Motor de Sincronização Oficial agora fica na tela Home.tsx (Aviso Laranja),
// que é muito mais seguro, avisa o usuário e sincroniza as peças e clientes na ordem correta,
// além de evitar o erro 400 (Bad Request) de IDs vazios.

export function useSync() {
  return null;
}