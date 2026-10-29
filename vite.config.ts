import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/app/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes("node_modules") ? "vendor" : undefined),
      },
    },
  },
  server: {
    port: 5173,
    /* запросы /app/api уходят локальному моку (npm run mock); адрес боевого
       сервиса дев-сервер не знает и знать не должен */
    proxy: { "/app/api": { target: "http://127.0.0.1:8091", changeOrigin: true } },
  },
});
