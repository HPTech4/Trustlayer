import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from 'tailwindcss'
import postCss from 'postcss'

export default defineConfig({
  plugins: [
    react(),
    tsConfigPaths(),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})