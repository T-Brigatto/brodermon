// O núcleo precisa rodar igual no navegador, nos testes e num servidor.
// Este teste barra o que quebraria isso.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pasta = join(import.meta.dirname, '../src/nucleo');
const proibidos = [
  /Math\.random/,
  /Date\.now|new Date/,
  /performance\./,
  /\bwindow\b/,
  /\bdocument\b/,
  /requestAnimationFrame|setTimeout|setInterval/,
  /localStorage/,
  /from ['"](?!\.\/|\.\.\/conteudo\/esquema['"])/, // só importa do próprio núcleo e dos tipos do conteúdo
];

describe('núcleo puro', () => {
  for (const arquivo of readdirSync(pasta)) {
    it(arquivo, () => {
      const texto = readFileSync(join(pasta, arquivo), 'utf8');
      for (const re of proibidos) expect(texto, `${arquivo} usa ${re}`).not.toMatch(re);
    });
  }
});
