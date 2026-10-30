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
  plugins: [
    react(),
    tailwindcss(),
  ],
})
