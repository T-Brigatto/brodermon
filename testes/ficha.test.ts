// Ficha dos golpes (catálogo golpes.html): sai inteira do dicionário, sem buraco nem número faltando.

import { describe, expect, it } from 'vitest';
import { prototipo, vale } from '../src/conteudo/pacotes';
import { fichaDoGolpe } from '../src/interface/ficha';

describe('ficha dos golpes', () => {
  for (const [nome, c] of [
    ['vale', vale],
    ['prototipo', prototipo],
  ] as const) {
    it(`todo golpe do ${nome} tem ficha completa, com uma linha por efeito`, () => {
      for (const [id, g] of Object.entries(c.golpes)) {
        const f = fichaDoGolpe(g, c);
        const texto = JSON.stringify(f);
        expect(texto, id).not.toMatch(/undefined|NaN|\[object|null/);
        expect(f.efeitos, id).toHaveLength(g.efeitos.length);
        for (const n of ['Poder', 'Recarga', 'Alcance', 'Conjuração']) expect(f.numeros.some((x) => x.rotulo === n), `${id}: ${n}`).toBe(true);
      }
    });
  }

  it('descreve os números do dicionário e explica os campos e estados citados', () => {
    const lanca = fichaDoGolpe(vale.golpes['lanca-chamas']!, vale);
    expect(lanca.numeros).toContainEqual({ rotulo: 'Recarga', valor: '6 s (guia 4 s)' });
    expect(lanca.efeitos[0]).toBe('Cone de 50 e 70°, canaliza 2 s, pulso de 0,25 s, poder 7, Queimadura: 4/s por 3 s (15%)');

    const bola = fichaDoGolpe(vale.golpes['bola-de-fogo']!, vale);
    expect(bola.numeros).toContainEqual({ rotulo: 'Velocidade', valor: '120/s' });
    expect(bola.glossario.map((x) => x.nome)).toEqual(['Chamas']);
    expect(bola.glossario[0]!.texto).toContain('Fogo é imune');

    const nevasca = fichaDoGolpe(vale.golpes['nevasca']!, vale);
    expect(nevasca.glossario.map((x) => x.nome)).toEqual(['Neblina gelada', 'Neblina', 'Congelado']);
    expect(nevasca.glossario.find((x) => x.nome === 'Congelado')!.texto).toBe('não anda nem age');

    const chamas = fichaDoGolpe(vale.golpes['chamas']!, vale);
    expect(chamas.numeros).toContainEqual({ rotulo: 'Poder', valor: '6 (campo)' });
  });
});
