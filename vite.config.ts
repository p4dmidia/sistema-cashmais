import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL || "https://jxupizzwrnivhnaexrmb.supabase.co";
  const anonKey = env.VITE_SUPABASE_ANON_KEY || "";

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'maskable-icon.png'],
        manifest: {
          name: 'CashMais - Ganhe Dinheiro com Cada Compra',
          short_name: 'CashMais',
          description: 'Sistema de cashback inteligente com MLM de até 10 níveis.',
          theme_color: '#001144',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'maskable-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    server: {
      allowedHosts: true,
      proxy: {
        "/api": {
          target: `${supabaseUrl}/functions/v1`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
        },
        "/affiliate": {
          target: `${supabaseUrl}/functions/v1/api`,
          changeOrigin: true,
          secure: false,
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
        },
      },
      hmr: {
        overlay: false,
      },
    },
    base: "/",
    build: {
      outDir: "dist",
      chunkSizeWarningLimit: 5000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
