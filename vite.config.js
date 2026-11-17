import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/health': 'http://localhost:3000',
      '/api/experiments': 'http://localhost:3000',
      '/api/summarize': 'http://localhost:3000',
      '/api/quiz': 'http://localhost:3000',
    },
  },
})
