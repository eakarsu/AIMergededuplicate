import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: [/src\/.*\.(js|jsx)$/],
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  server: {
    port: parseInt(process.env.FRONTEND_PORT || '3521'),
    strictPort: false,
    proxy: {
      '/api': `http://localhost:${process.env.BACKEND_PORT || 4521}`,
    },
  },
});
