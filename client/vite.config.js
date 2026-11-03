import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Fail fast instead of silently hopping to 5174 when another dev server is
  // already running. A second instance otherwise serves stale code on a
  // different origin, which breaks cookies/CORS and HMR in confusing ways.
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // Code splitting: separate vendor libraries from application code
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.replaceAll('\\', '/');
          if (/\/node_modules\/(react|react-dom|react-router-dom)\//.test(moduleId)) {
            return 'react';
          }
          if (moduleId.includes('/node_modules/@tanstack/react-query/')) {
            return 'tanstack';
          }
          if (moduleId.includes('/node_modules/axios/')) {
            return 'axios';
          }
        },
      },
    },
    // Only enable sourcemaps if explicitly requested via environment variable
    sourcemap: process.env.VITE_SOURCEMAP === 'true',
    // Compress CSS and JS
    minify: 'esbuild',
    // Report chunk sizes > 500kb
    chunkSizeWarningLimit: 500,
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
