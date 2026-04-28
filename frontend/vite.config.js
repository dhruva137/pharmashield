import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Cesium is now loaded from CDN as window.Cesium — no define needed
  },
  server: {
    port: 5173,
    proxy: {
      '/api':     { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/healthz': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  optimizeDeps: {
    include: ['recharts'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
        },
      },
      // Tell rollup Cesium is an external global from CDN
      external: ['cesium'],
    },
  },
});
