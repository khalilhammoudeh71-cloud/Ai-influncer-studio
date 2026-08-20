import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig, Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function servePublicStaticAssets(): Plugin {
  return {
    name: 'serve-public-static-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const urlPath = req.url.split('?')[0];
        if (
          urlPath.startsWith('/uploads/') ||
          urlPath.startsWith('/examples/') ||
          urlPath.startsWith('/wardrobe/') ||
          urlPath.startsWith('/demo/')
        ) {
          const publicPath = path.join(__dirname, 'public', urlPath);
          const serverPublicPath = path.join(__dirname, 'server', 'public', urlPath);
          const finalPath = fs.existsSync(publicPath) ? publicPath : (fs.existsSync(serverPublicPath) ? serverPublicPath : null);

          if (finalPath && fs.statSync(finalPath).isFile()) {
            const ext = path.extname(finalPath).toLowerCase();
            const mimeMap: Record<string, string> = {
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.webp': 'image/webp',
              '.gif': 'image/gif',
              '.svg': 'image/svg+xml',
              '.mp3': 'audio/mpeg',
              '.mp4': 'video/mp4',
              '.wav': 'audio/wav',
              '.json': 'application/json',
            };
            res.writeHead(200, {
              'Content-Type': mimeMap[ext] || 'application/octet-stream',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=86400',
            });
            fs.createReadStream(finalPath).pipe(res);
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [
    react(),
    servePublicStaticAssets(),
    ...(command === 'build' ? [viteSingleFile()] : []),
  ],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['localhost', '127.0.0.1', '.localhost'],
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/agent': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
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
        '**/personas_store.json',
        '**/*.json',
        '**/uploads/**',
        '**/*.mp3',
        '**/*.mp4',
        '**/*.wav',
        '**/*.png',
        '**/*.jpg',
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
}));
