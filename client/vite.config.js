import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config: during development, proxy /api/* requests to the Express server.
// This way the frontend on port 5173 can talk to the backend on port 3001
// without CORS issues. In production, Express serves everything on one port.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
