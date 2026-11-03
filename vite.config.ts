import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// VITE_BASE is set by the GitHub Actions workflow:
//   "/"            for a custom domain (socialmoda.com) or <user>.github.io
//   "/<repo-name>/" for a project page (https://<user>.github.io/<repo-name>/)
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173 },
  build: { sourcemap: false, chunkSizeWarningLimit: 900 },
});
