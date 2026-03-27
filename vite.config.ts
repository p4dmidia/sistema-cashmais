import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL || "https://jxupizzwrnivhnaexrmb.supabase.co";
  const anonKey = env.VITE_SUPABASE_ANON_KEY || "";

  return {
    plugins: [react()],
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
