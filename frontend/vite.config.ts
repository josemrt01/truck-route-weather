import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Django dev server that /api calls are forwarded to during `npm run dev`; used by the proxy below.
const DJANGO_DEV_SERVER_URL = 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': DJANGO_DEV_SERVER_URL,
    },
  },
})
