import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The client builds to ONE self-contained HTML file (JS, CSS and fonts inlined),
// because Apps Script's HtmlService serves a single file per page.
export default defineConfig(({ command }) => ({
  plugins: [svelte(), command === 'build' ? viteSingleFile({ removeViteModuleLoader: true }) : null],
  base: './',
  build: {
    outDir: 'dist-gas',
    emptyOutDir: true,
    target: 'es2022',
    reportCompressedSize: false,
    chunkSizeWarningLimit: 4000,
  },
  server: { port: 5173, strictPort: true },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
