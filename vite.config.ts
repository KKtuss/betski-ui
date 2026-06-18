import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { linkPreviewApiPlugin } from './vite-plugins/linkPreviewApi'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), linkPreviewApiPlugin()],
})
