import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { linkPreviewApiPlugin } from './vite-plugins/linkPreviewApi'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), linkPreviewApiPlugin()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? ''
          return name.endsWith('.css') ? 'css/[name]-[hash][extname]' : 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})
