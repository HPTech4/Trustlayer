import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from 'tailwindcss'
import postCss from 'postcss'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    tsConfigPaths(),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss],
    },
  },
  server: { entry: 'src/server.ts' },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})