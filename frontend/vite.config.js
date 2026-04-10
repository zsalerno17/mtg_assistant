import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true, // fail fast if 5173 is taken — prevents silent port drift
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
