import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
            // COEP removed - was blocking Privy wallet/passkey flows
        },
    },
    plugins: [
        react(),
        nodePolyfills({
            protocolImports: true,
        }),
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
            // Stub all Solana packages - Privy's optional Solana dependencies
            // These are not used in this Ethereum-only app
            '@solana/kit': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana-program/encoders': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana-program/token': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana-program/token-2022': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana-program/token-metadata': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana-program/compute-budget': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana-program/address-lookup-table': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana-program/memo': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana-program/system': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/web3.js': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/accounts': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/addresses': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/codecs': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/codecs-core': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/codecs-data-structures': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/codecs-numbers': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/codecs-strings': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/errors': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/functional': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/instructions': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/keys': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/programs': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/rpc': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/rpc-types': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/signers': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/sysvars': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/transactions': path.resolve(__dirname, './src/solana-kit-stub.ts'),
            '@solana/transaction-messages': path.resolve(__dirname, './src/solana-kit-stub.ts'),
        },
    },
    define: {
        global: 'globalThis',
    },
    // XMTP V3 Configuration
    optimizeDeps: {
        exclude: ['@xmtp/wasm-bindings', '@xmtp/browser-sdk'],
    },
    build: {
        target: 'esnext',
        sourcemap: false, // Disable sourcemaps to avoid parsing issues
        commonjsOptions: {
            transformMixedEsModules: true,
            ignoreTryCatch: false,
        },
        rollupOptions: {
            onwarn(warning, warn) {
                // Ignore annotation/comment warnings
                if (warning.code === 'SOURCEMAP_ERROR' ||
                    warning.message?.includes('annotation') ||
                    warning.message?.includes('comment')) {
                    return;
                }
                warn(warning);
            },
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-motion': ['framer-motion'],
                },
            },
        },
        // Use terser instead of esbuild for better comment handling
        minify: 'terser',
        terserOptions: {
            format: {
                comments: false,
            },
        },
    },
});
