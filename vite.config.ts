import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@engine':  path.resolve(__dirname, './src/engine'),
      '@systems': path.resolve(__dirname, './src/systems'),
      '@ui':      path.resolve(__dirname, './src/ui'),
      '@scenes':  path.resolve(__dirname, './src/scenes'),
      '@content': path.resolve(__dirname, './src/content'),
    },
  },
})
