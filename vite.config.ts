import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the same build works on GitHub Pages, any static host,
// and inside Electron (loaded via file://).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'GC Companion',
        short_name: 'GC Companion',
        description: 'Unofficial companion app for Grand Chase Classic',
        theme_color: '#1b1430',
        background_color: '#120d22',
        display: 'standalone',
        start_url: './',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,jpg,json}'],
      },
    }),
  ],
})
