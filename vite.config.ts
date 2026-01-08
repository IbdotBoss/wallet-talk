import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [
        react(),
        // NOTE: nodePolyfills removed to match xmtp.chat config
        // The browser-sdk v5 handles its own polyfills internally
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'Wallet Talk',
                short_name: 'Wallet Talk',
                description: 'Secure decentralized messaging powered by XMTP',
                theme_color: '#000000',
                background_color: '#000000',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit for large bundles
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/auth\.privy\.io\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'privy-auth-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24,
                            },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    define: {
        global: 'globalThis',
    },
    optimizeDeps: {
        // XMTP official config from xmtp.chat - only exclude wasm-bindings
        exclude: ['@xmtp/wasm-bindings'],
    },
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-privy': ['@privy-io/react-auth'],
                    'vendor-xmtp': ['@xmtp/browser-sdk'],
                    'vendor-motion': ['framer-motion'],
                },
            },
        },
    },
});
