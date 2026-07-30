import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    ...(command === 'build' ? [viteSingleFile()] : []),
  ],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        proxyTimeout: 600000,
        timeout: 600000,
      },
    },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.replit_integration_files/**',
        '**/server/**',
        '**/.git/**',
        '**/.cache/**',
        '**/.local/**',
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
}));
