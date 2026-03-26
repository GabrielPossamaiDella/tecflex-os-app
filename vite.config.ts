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
        icons: [{ src: "placeholder.svg", sizes: "192x192", type: "image/svg+xml" }]
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Adicionamos as dependências do PDF aqui para o Vite prepará-las corretamente
    include: [
      '@react-pdf/renderer',
      'base64-js',
      'buffer',
      'queue-microtask'
    ],
  },
  build: {
    commonjsOptions: {
      // Força a compatibilidade de módulos antigos
      include: [/node_modules/],
    },
  },
});