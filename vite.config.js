import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Set required headers for Nominatim
            proxyReq.setHeader('User-Agent', 'Getaways/1.0 (contact: info@getaways.com)');
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Referer', req.headers.referer || 'http://localhost:5173');
          });
        },
      },
    },
  },
})
