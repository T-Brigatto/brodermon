// Efeitos especiais: só nos tipos com `fx`, cada estilo se comporta do seu jeito, e tudo some com o tempo.

import { describe, expect, it } from 'vitest';
import { ANIMACOES_FX, esquemaGolpe, esquemaTipo } from '../src/conteudo/esquema';
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
    // Velocidade vertical aos 20 quadros, antes de qualquer partícula sumir (a vida mínima é 0,35 s).
    for (let i = 0; i < 20; i++) fx.atualizar(1 / 60);
    const media = (tipo: string) => {
      const cor = vale.tipos[tipo]!.fx!.cores;
      const ps = fx.particulas.filter((p) => p.cores === cor);
      expect(ps).toHaveLength(30);
      return ps.reduce((s, p) => s + p.vy, 0) / ps.length;
    };
    expect(media('fogo')).toBeLessThan(0);
    expect(media('agua')).toBeGreaterThan(0);
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
    fx.estouro('fogo', 160, 65, 20);
    fx.raio('eletricidade', { x: 0, y: 0 }, { x: 40, y: 0 });
    fx.impacto('fogo', 10, 10, true);
    expect(fx.anims.map((a) => a.tipo)).toEqual(['nova', 'estouro', 'raio', 'impacto']);
    const raio = fx.anims[2]!;
    expect(raio.tipo === 'raio' && raio.pontos.length).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < 40; i++) fx.atualizar(1 / 60);
    expect(fx.anims).toHaveLength(0);
  });
});

/** Contexto de canvas de mentira: só conta os pixels pintados. */
function contexto() {
  const x = { fillStyle: '', globalAlpha: 1, pixels: 0, fillRect: () => x.pixels++ };
  return x as unknown as CanvasRenderingContext2D & { pixels: number };
}

const rodar = (fx: Fx, s: number) => {
  for (let i = 0; i < Math.round(s * 60); i++) fx.atualizar(1 / 60);
};

/** Tudo o que está no ar: peças das animações próprias, efeitos comuns, partículas e funis. */
const noAr = (fx: Fx) => fx.pecas + fx.anims.length + fx.particulas.length + fx.continuos.size;

describe('animações próprias dos elementos', () => {
  it('cada elemento do vale escolhe uma animação por papel; a Arena original usa o efeito comum', () => {
    const fx = new Fx(vale);
    expect(fx.animacao('lanca-chamas', 'cone')).toBe('jato-de-fogo');
    expect(fx.animacao('pira', 'area')).toBe('labaredas');
    expect(fx.animacao('bola-de-fogo', 'projetil')).toBe('bola-de-fogo');
    expect(fx.animacao('rajada', 'cone')).toBe('vento');
    expect(fx.animacao('corte-de-vento', 'projetil')).toBe('meia-lua');
    expect(fx.animacao('rasante', 'avanco')).toBe('velocidade');
    expect(fx.animacao('jato-dagua', 'linha')).toBe('jato-dagua');
    expect(fx.animacao('arco-voltaico', 'linha')).toBe('arco-eletrico');
    expect(fx.animacao('tremor', 'area')).toBe('tremor');
    expect(fx.animacao('prisma', 'linha')).toBe('prisma');
    expect(fx.animacao('chicote-de-vinha', 'linha')).toBe('vinha');
    expect(fx.animacao('selo', 'area')).toBe('runas');
    expect(fx.animacao('rugido', 'area')).toBe('rugido');
    // Todo elemento tem impacto próprio, e toda forma usada por um golpe tem animação.
    for (const [id, t] of Object.entries(vale.tipos)) expect(t.fx!.animacoes?.impacto, id).toBeDefined();
    for (const [id, g] of Object.entries(vale.golpes)) {
      for (const e of g.efeitos) if (e.efeito === 'area' || e.efeito === 'cone' || e.efeito === 'linha' || e.efeito === 'parede') expect(fx.animacao(id, e.efeito), id).not.toBeNull();
    }
    const original = new Fx(prototipo);
    for (const id of Object.keys(prototipo.golpes)) for (const papel of ['projetil', 'area', 'cone', 'linha', 'impacto'] as const) expect(original.animacao(id, papel)).toBeNull();
  });

  it('um golpe troca a animação do elemento em `visual`, e um campo também', () => {
    const fx = new Fx(vale);
    expect(fx.animacao('bola-de-fogo', 'area')).toBe('explosao');
    expect(fx.animacao('detonacao', 'area')).toBe('explosao');
    expect(fx.animacao('tornado', 'area')).toBe('redemoinho');
    expect(fx.animacao('onda-de-choque', 'area')).toBe('onda-de-vento');
    expect(fx.animacaoDoCampo(vale.campos['chamas']!)).toBe('labaredas');
    expect(fx.animacaoDoCampo(vale.campos['fumaca-quente']!)).toBe('fumaca');
    expect(fx.animacaoDoCampo(vale.campos['vacuo']!)).toBe('succao');
    expect(fx.animacaoDoCampo(vale.campos['poca']!)).toBe('ondulacao');
    expect(fx.animacao('mordida-ancestral', 'impacto')).toBe('mordida');
    expect(fx.animacao('sangue-antigo', 'impacto')).toBe('garras');
    expect(fx.animacao('lamina-bumerangue', 'projetil')).toBe('lamina-giratoria');
    expect(fx.animacaoDoCampo(vale.campos['chao-congelado']!)).toBe('brilho-de-gelo');
    for (const c of Object.values(vale.campos)) expect(fx.animacaoDoCampo(c), c.nome).not.toBeNull();
  });

  it('o dicionário só aceita a animação que o papel sabe fazer', () => {
    const fogo = vale.tipos['fogo']!;
    const com = (animacoes: object) => esquemaTipo.safeParse({ ...fogo, fx: { ...fogo.fx, animacoes } }).success;
    expect(com({ projetil: 'meia-lua', area: 'redemoinho' })).toBe(true);
    expect(com({ projetil: 'labaredas' })).toBe(false);
    expect(com({ impacto: 'vento' })).toBe(false);
    expect(com({ chuva: 'vento' })).toBe(false);
    expect(esquemaGolpe.safeParse({ ...vale.golpes['pira'], visual: { area: 'clarao' } }).success).toBe(true);
    expect(esquemaGolpe.safeParse({ ...vale.golpes['pira'], visual: { terreno: 'labaredas' } }).success).toBe(false);
  });

  it('toda animação de forma, campo, impacto, projétil e avanço solta peças, desenha e some', () => {
    const z = { x: 160, y: 65, ux: 1, uy: 0 };
    const formas = [
      { forma: 'area', raio: 25 },
      { forma: 'cone', alcance: 50, angulo: 70 },
      { forma: 'linha', alcance: 60, largura: 8 },
      { forma: 'parede', largura: 50, espessura: 6 },
    ] as const;
    for (const anim of ANIMACOES_FX.forma) {
      for (const g of formas) {
        const fx = new Fx(vale);
        fx.forma(anim, 'fogo', g, z);
        expect(noAr(fx), `${anim} em ${g.forma}`).toBeGreaterThan(0);
        rodar(fx, 0.2);
        const x = contexto();
        fx.desenharChao(x);
        fx.desenhar(x);
        expect(x.pixels, `${anim} em ${g.forma}`).toBeGreaterThan(0);
        rodar(fx, 3);
        expect(noAr(fx), `${anim} em ${g.forma} sumiu`).toBe(0);
      }
    }
    for (const anim of ANIMACOES_FX.campo) {
      const fx = new Fx(vale);
      for (let i = 0; i < 60; i++) {
        fx.campo(anim, 'fogo', formas[0], z, 1 / 60, vale.campos['corrente-de-vento']);
        fx.atualizar(1 / 60);
      }
      expect(noAr(fx), anim).toBeGreaterThan(0);
      const x = contexto();
      fx.desenharChao(x);
      fx.desenhar(x);
      expect(x.pixels, anim).toBeGreaterThan(0);
      rodar(fx, 3);
      expect(noAr(fx), anim).toBe(0);
    }
    for (const anim of ANIMACOES_FX.impacto) {
      for (const forca of ['leve', 'normal', 'forte'] as const) {
        const fx = new Fx(vale);
        fx.impactoDe(anim, 'fogo', 100, 100, forca);
        expect(noAr(fx), `${anim} ${forca}`).toBeGreaterThan(0);
        rodar(fx, 0.1);
        const x = contexto();
        fx.desenhar(x);
        expect(x.pixels, `${anim} ${forca}`).toBeGreaterThan(0);
        rodar(fx, 3);
        expect(noAr(fx)).toBe(0);
      }
    }
    for (const anim of ANIMACOES_FX.projetil) {
      const fx = new Fx(vale);
      const x = contexto();
      fx.desenharProjetil(x, anim, 'fogo', { x: 100, y: 100 }, 1, 0, 5);
      expect(x.pixels, anim).toBeGreaterThan(0);
      for (let i = 0; i < 120; i++) fx.rastroDoProjetil(anim, 'fogo', { x: 100 + i * 2, y: 100 }, 1, 0, 5, 1 / 60);
      expect(noAr(fx), anim).toBeGreaterThan(0);
    }
    for (const anim of ANIMACOES_FX.avanco) {
      const fx = new Fx(vale);
      for (let i = 0; i < 10; i++) fx.avanco(anim, 'fogo', { x: 100 + i * 4, y: 100 }, 20, 0, 1 / 60);
      expect(fx.pecas, anim).toBeGreaterThan(0);
    }
  });

  it('o funil de uma zona segue a zona enquanto ela existe e some depois', () => {
    const fx = new Fx(vale);
    const zona = { x: 100, y: 60, ux: 1, uy: 0 };
    for (let i = 0; i < 30; i++) {
      zona.x += 1;
      fx.zona('redemoinho', 'ar', { forma: 'area', raio: 20 }, zona, 1 / 60, zona);
      fx.atualizar(1 / 60);
    }
    expect(fx.continuos.size).toBe(1);
    expect(fx.continuos.get(zona)!.x).toBe(130);
    rodar(fx, 0.5);
    expect(fx.continuos.size).toBe(0);
  });

  it('zona sem receita própria usa a do terreno de mesmo nome; a gota que cai no chão vira ondinha', () => {
    const fx = new Fx(vale);
    const z = { x: 160, y: 65, ux: 1, uy: 0 };
    for (let i = 0; i < 120; i++) fx.zona('espinhos', 'mineral', { forma: 'area', raio: 20 }, z, 1 / 60, z);
    expect(fx.espinhos.length).toBeGreaterThan(0);

    const agua = new Fx(vale);
    agua.impactoDe('respingo', 'agua', 100, 100, 'normal');
    expect(agua.gotas.length).toBeGreaterThan(0);
    let ondinhas = 0;
    for (let i = 0; i < 90; i++) {
      agua.atualizar(1 / 60);
      ondinhas = Math.max(ondinhas, agua.arcos.filter((a) => a.chao).length);
    }
    expect(agua.gotas).toHaveLength(0);
    expect(ondinhas).toBeGreaterThan(0);
  });
});
