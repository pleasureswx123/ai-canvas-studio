import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    proxy: {
      '/api/generate-image': {
        target: 'http://127.0.0.1:8790',
        changeOrigin: true,
      },
      '/api/generate-video': {
        target: 'http://127.0.0.1:8790',
        changeOrigin: true,
      },
      '/api/video-task': {
        target: 'http://127.0.0.1:8790',
        changeOrigin: true,
      },
      '/api/media-health': {
        target: 'http://127.0.0.1:8790',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
});
