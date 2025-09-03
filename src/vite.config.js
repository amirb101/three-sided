import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public/new',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Ensure assets are properly referenced from /new/ path
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      }
    }
  },
  base: '/new/',
  server: {
    port: 3000
  }
})
