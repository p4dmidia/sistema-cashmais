import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      allowedHosts: true,
      proxy: {
        "/api": {
          target: "https://jxupizzwrnivhnaexrmb.supabase.co/functions/v1",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
        },
        "/affiliate": {
          target: "https://jxupizzwrnivhnaexrmb.supabase.co/functions/v1/api",
          changeOrigin: true,
          secure: false,
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
