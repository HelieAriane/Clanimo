/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement selon le mode (dev / production)
  const env = loadEnv(mode, process.cwd(), '')

  // Choisit la bonne API selon le mode
  const apiTarget =
    mode === 'development'
      ? env.VITE_API_LOCAL
      : env.VITE_API_PROD

  return {
    plugins: [vue(), legacy()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 8100,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (p) => p,
        },
      },
    },
    preview: {
      port: 8100,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (p) => p,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
  }
})
