import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "TECFLEX - Ordens de Serviço",
        short_name: "Tecflex OS",
        theme_color: "#1e293b",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        // Atualizado para usar o seu favicon oficial
        icons: [
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any" // 'any' permite que o Android use o ícone sem frescura
          },
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "maskable" // 'maskable' faz o ícone se adaptar ao formato do celular (redondo, quadrado, etc)
          }
        ]
      },
      // CONFIGURAÇÃO DO WORKBOX: Aqui é onde resolvemos o erro do limite de 2MB
      workbox: {
        // Aumentamos para 5MB para garantir que o arquivo de 2.27MB passe tranquilo
        maximumFileSizeToCacheInBytes: 5242880, 
        // Isso garante que o service worker não se perca com arquivos grandes
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Mantendo suas configurações de PDF para evitar erros de renderização
    include: [
      '@react-pdf/renderer',
      'base64-js',
      'buffer',
      'queue-microtask'
    ],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
    // Dica: Aumentando o limite de aviso de chunk para o console ficar limpo
    chunkSizeWarningLimit: 2500,
  },
});