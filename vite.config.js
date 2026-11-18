import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/health': 'http://localhost:3001',
      '/api/experiments': 'http://localhost:3001',
      '/api/summarize': 'http://localhost:3001',
      '/api/quiz': 'http://localhost:3001',
    },
  },
})
