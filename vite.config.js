import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    svelte(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'SynergySweep — World Cup 2026',
        short_name: 'SynergySweep',
        description:
          'Live tracker for the SynergySuite FIFA World Cup 2026 office sweepstake.',
        theme_color: '#0a0c10',
        background_color: '#0a0c10',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the full app shell (fonts included) so the installed app
        // opens offline; live ESPN/openfootball calls stay network-only — the
        // store already has its own localStorage SWR cache for those.
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        // The 4MB brand logo would blow the precache budget — cache it on
        // first use instead (the header hides it gracefully if it's missing).
        globIgnores: ['**/synergysuite-wc-logo.png'],
        runtimeCaching: [
          {
            urlPattern: /synergysuite-wc-logo\.png$/,
            handler: 'CacheFirst',
            options: { cacheName: 'brand-assets', expiration: { maxEntries: 4 } },
          },
        ],
      },
    }),
  ],
});
