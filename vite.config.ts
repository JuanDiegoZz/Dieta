import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['ios >= 12.5', 'Safari >= 12.1'],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
  ],
  build: {
    cssMinify: 'esbuild',
    reportCompressedSize: true,
  },
})
