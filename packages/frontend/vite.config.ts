import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Enable host binding for Docker
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // Enable polling for Docker volumes
    },
  },
})
