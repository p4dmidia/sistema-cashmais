import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { mochaPlugins } from "@getmocha/vite-plugins";

export default defineConfig(({ mode }) => {
  const isNetlify = process.env.NETLIFY === "true";
  const plugins = isNetlify ? [react()] : [...mochaPlugins(process.env as any), react(), cloudflare()];
  return {
    plugins,
    server: {
      allowedHosts: true,
      proxy: {
        "/api": {
          target: "https://hffxmntvtsimwlsapfod.supabase.co/functions/v1",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
        },
        "/affiliate": {
          target: "https://hffxmntvtsimwlsapfod.supabase.co/functions/v1/api",
          changeOrigin: true,
          secure: false,
        },
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
    optimizeDeps: {
      include: ["@getmocha/users-service/react", "react", "react-dom"],
    },
  };
});
