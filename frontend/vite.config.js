import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Single copy of CodeMirror state so extensions don't break (instanceof checks)
    dedupe: ['@codemirror/state', '@codemirror/view', '@codemirror/language'],
  },
  optimizeDeps: {
    include: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/language',
      '@codemirror/theme-one-dark',
      '@codemirror/lang-javascript',
      '@codemirror/lang-python',
      '@codemirror/lang-cpp',
      '@codemirror/lang-java',
    ],
  },
  server: {
    port: 5173,
    proxy: {
  '/api': {
    target: 'http://localhost:5001',
    changeOrigin: true,
  },
  '/socket.io': {
    target: 'http://localhost:5001',
    ws: true,
    changeOrigin: true,
  },
},
  },
});
