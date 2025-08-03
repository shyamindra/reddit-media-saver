import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON == 'true' ? './' : '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Source map configuration to reduce errors
  css: {
    devSourcemap: false,
  },
  esbuild: {
    sourcemap: false,
  },
  // Handle client-side routing and CORS
  server: {
    port: 5173,
    host: true,
    cors: true,
    proxy: {
      // Proxy Reddit API requests to avoid CORS issues
      '/api/reddit': {
        target: 'https://oauth.reddit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/reddit/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add proper headers for Reddit API
            proxyReq.setHeader('User-Agent', 'RedditSaverApp/1.0.0 (by /u/your_username)');
          });
        },
      },
      // Proxy Reddit OAuth requests
      '/api/oauth': {
        target: 'https://www.reddit.com/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/oauth/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔧 Proxy request:', {
              method: req.method,
              url: req.url,
              headers: proxyReq.getHeaders()
            });
            
            // Set a proper User-Agent for OAuth requests (Reddit requires this)
            proxyReq.setHeader('User-Agent', 'RedditSaverApp/1.0.0 (by /u/your_username)');
            // Add proper content type for OAuth requests
            if (req.method === 'POST') {
              proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
            }
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('🔧 Proxy response:', {
              statusCode: proxyRes.statusCode,
              headers: proxyRes.headers,
              url: req.url
            });
          });
          
          proxy.on('error', (err, req, res) => {
            console.error('🔧 Proxy error:', err);
          });
        },
      },
    },
  },
});
