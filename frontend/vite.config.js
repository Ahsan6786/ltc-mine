import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Warn only for extremely large chunks
    chunkSizeWarningLimit: 600,
    // Enable CSS code splitting for more efficient loading
    cssCodeSplit: true,
    // Rollup output options for manual chunk splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core into its own cached chunk
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor'
          }
          // Router into its own chunk
          if (id.includes('node_modules/react-router-dom/') || id.includes('node_modules/react-router/')) {
            return 'router'
          }
          // Icon library into its own chunk (large but shared across all pages)
          if (id.includes('node_modules/lucide-react/')) {
            return 'icons'
          }
          // xlsx and papaparse (only used in admin/batch upload)
          if (id.includes('node_modules/xlsx/') || id.includes('node_modules/papaparse/')) {
            return 'spreadsheet'
          }
          // QR code libraries (used in admin + verify)
          if (id.includes('node_modules/qrcode') || id.includes('node_modules/html5-qrcode')) {
            return 'qr'
          }
        },
      },
    },
  },
  // Speed up dev server startup by pre-bundling known large deps
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
  },
})
