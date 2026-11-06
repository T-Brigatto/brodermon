import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Caminhos relativos no build: o jogo abre em qualquer subpasta (GitHub Pages em /brodermon/, Render, pasta local servida).
  base: './',
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        jogo: resolve(import.meta.dirname, 'index.html'),
        depuracao: resolve(import.meta.dirname, 'depuracao.html'),
        golpes: resolve(import.meta.dirname, 'golpes.html'),
      },
    },
  },
  test: { include: ['testes/**/*.test.ts'] },
});
