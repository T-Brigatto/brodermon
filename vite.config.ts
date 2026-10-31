import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        jogo: resolve(import.meta.dirname, 'index.html'),
        depuracao: resolve(import.meta.dirname, 'depuracao.html'),
      },
    },
  },
  test: { include: ['testes/**/*.test.ts'] },
});
