import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import { build as viteBuild } from 'vite';
import manifest from './manifest.json';

/**
 * Custom plugin to build provider_proxy.ts as IIFE
 * and place it in the dist root for web_accessible_resources
 */
function buildProviderProxy() {
  return {
    name: 'build-provider-proxy',
    async closeBundle() {
      await viteBuild({
        configFile: false,
        build: {
          emptyOutDir: false,
          outDir: 'dist',
          lib: {
            entry: resolve(__dirname, 'src/inject/provider_proxy.ts'),
            name: 'aegisProviderProxy',
            formats: ['iife'],
            fileName: () => 'provider_proxy.js',
          },
          rollupOptions: {
            output: {
              // Ensure it's a clean IIFE with no module wrapper
              inlineDynamicImports: true,
            },
          },
          minify: true,
          sourcemap: false,
        },
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
    buildProviderProxy(),
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'index.html',
      },
    },
  },
});
