/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// The UI calls the API under /api. In development Vite proxies /api to the
// backend (no CORS needed); in Docker, nginx does the same.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxy = {
    "/api": {
      target: env.API_URL ?? "http://localhost:8081",
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, ""),
    },
  };

  return {
    plugins: [react()],
    // Build files go to /static/, not the default /assets/, which is an app route.
    build: { assetsDir: "static" },
    server: { port: 5180, strictPort: true, proxy: apiProxy }, // 5180: avoids clashing with other Vite apps on 5173
    preview: { port: 4173, proxy: apiProxy },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      css: false,
    },
  };
});
