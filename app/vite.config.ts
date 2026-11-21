import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
  server: { proxy: { '/api': 'https://nutriplan-asesoria.vercel.app' } },
});
