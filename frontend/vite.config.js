import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Any request starting with /api will be sent to your Flask backend
      '/api': {
        target: 'http://localhost:8000', // Change this to your actual Flask port
        changeOrigin: true,
        secure: false,
      }
    }
  }
})  

