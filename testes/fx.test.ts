// Efeitos especiais: só nos tipos com `fx`, cada estilo se comporta do seu jeito, e tudo some com o tempo.

import { describe, expect, it } from 'vitest';
import { prototipo, vale } from '../src/conteudo/pacotes';
import { projetar } from '../src/desenho/arena';
import { Fx } from '../src/desenho/fx';

describe('efeitos especiais', () => {
  it('a Arena original não tem efeitos; no vale, todo elemento tem, e os estados apontam para eles', () => {
    const fx = new Fx(prototipo);
    for (const t of Object.keys(prototipo.tipos)) {
      expect(fx.de(t)).toBeNull();
      fx.explosao(t, 100, 100, 10);
    }
    expect(fx.particulas).toHaveLength(0);
    for (const t of Object.values(vale.tipos)) expect(t.fx).toBeDefined();
    for (const e of Object.values(vale.estados)) if (e.fx) expect(vale.tipos[e.fx]?.fx).toBeDefined();
  });

  it('brasa sobe, gota cai, e tudo some no fim da vida', () => {
    const fx = new Fx(vale);
    fx.explosao('fogo', 100, 100, 30);
    fx.explosao('agua', 100, 100, 30);
    for (let i = 0; i < 30; i++) fx.atualizar(1 / 60);
    const media = (tipo: string) => {
      const cor = vale.tipos[tipo]!.fx!.cores;
      const ps = fx.particulas.filter((p) => p.cores === cor);
      return ps.reduce((s, p) => s + p.y, 0) / ps.length;
    };
    expect(media('fogo')).toBeLessThan(100);
    expect(media('agua')).toBeGreaterThan(100);
    for (let i = 0; i < 180; i++) fx.atualizar(1 / 60);
    expect(fx.particulas).toHaveLength(0);
  });

  it('as partículas de uma forma nascem dentro dela; as animações (anel, estouro, raio, impacto) passam', () => {
    const fx = new Fx(vale);
    fx.naForma('natureza', { forma: 'area', raio: 20 }, { x: 160, y: 65, ux: 1, uy: 0 }, 30, { forca: 0 });
    const centro = projetar(160, 65);
    const borda = projetar(160 + 20, 65);
    expect(fx.particulas.length).toBeGreaterThan(20);
    for (const p of fx.particulas) expect(Math.abs(p.x - centro.x)).toBeLessThanOrEqual(borda.x - centro.x + 1);

    fx.nova('arcano', 160, 65, 5, 30);
    fx.estouro('explosao', 160, 65, 20);
    fx.raio('eletricidade', { x: 0, y: 0 }, { x: 40, y: 0 });
    fx.impacto('fogo', 10, 10, true);
    expect(fx.anims.map((a) => a.tipo)).toEqual(['nova', 'estouro', 'raio', 'impacto']);
    const raio = fx.anims[2]!;
    expect(raio.tipo === 'raio' && raio.pontos.length).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < 40; i++) fx.atualizar(1 / 60);
    expect(fx.anims).toHaveLength(0);
  });
});
