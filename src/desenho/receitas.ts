// Receitas das animações próprias dos elementos: cada nome do dicionário (`fx.animacoes` em tipos.json, `visual`
// em golpes e campos) vira uma combinação de peças de `animacoes.ts` (labareda, gota, espinho, risco de vento…),
// nas cores do elemento. Há uma receita por papel: a forma que acerta, a zona que dura (um quadro), o terreno ou a
// névoa (um quadro), o impacto, o projétil (rastro e corpo) e o avanço. Os `Record` obrigam a ter receita para todo
// nome que o esquema aceita. É só apresentação: sorteia à vontade.

import type { AnimacaoAvanco, AnimacaoCampo, AnimacaoForma, AnimacaoImpacto, AnimacaoProjetil, Campo } from '../conteudo/esquema';
import type { Geometria, Ponto, Posicao } from '../nucleo';
import { FUMACA, anguloNaTela, areaDaForma, desenharFolhaEm, entre, quebrado, sorte, type Paleta } from './animacoes';
import { projetar } from './arena';
import type { Fx } from './fx';
import { BRANCO, anel, comAlfa, disco, elipseNoChao, linha, trama } from './pixels';

/** Uma forma que acertou: solta as peças de uma vez. */
type ReceitaForma = (fx: Fx, p: Paleta, tipo: string, g: Geometria, z: Posicao) => void;
/** Um quadro de uma zona, terreno ou névoa; `k` é o quadro em 1/60 s (as taxas são por quadro). */
type ReceitaQuadro = (fx: Fx, p: Paleta, tipo: string, g: Geometria, z: Posicao, k: number, chave: object, def?: Campo) => void;
/** Um acerto: `forca` 0 é leve (dano contínuo, disparo), 1 normal, 2 forte (super eficaz). */
type ReceitaImpacto = (fx: Fx, p: Paleta, tipo: string, x: number, y: number, forca: 0 | 1 | 2) => void;
interface ReceitaProjetil {
  rastro(fx: Fx, p: Paleta, tipo: string, q: Ponto, ux: number, uy: number, raio: number, k: number): void;
  desenhar(x: CanvasRenderingContext2D, p: Paleta, q: Ponto, ux: number, uy: number, raio: number, t: number): void;
}
type ReceitaAvanco = (fx: Fx, p: Paleta, tipo: string, pe: Ponto, h: number, ang: number, k: number) => void;

// ---------- Ajudas ----------

const sortear = ([a, b]: [number, number]) => a + sorte() * (b - a);
const limitar = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Quantas peças soltar neste quadro para uma taxa `x` por quadro (a fração vira sorteio). */
const vezes = (x: number) => Math.floor(x) + (sorte() < x - Math.floor(x) ? 1 : 0);
const lado = () => (sorte() < 0.5 ? -1 : 1);
const VOLTA = Math.PI * 2;

/** Raio de uma área, ou `padrao` nas outras formas. */
const raioDe = (g: Geometria, padrao: number) => (g.forma === 'area' ? g.raio : padrao);
/** Até onde a forma vai a partir da origem: o raio da área, o alcance do cone e da linha, meia parede. */
const alcanceDe = (g: Geometria) => (g.forma === 'area' ? g.raio : g.forma === 'parede' ? g.largura / 2 : g.alcance);
/** Abertura da forma em radianos: a do cone, a volta inteira na área e uma fresta na linha. */
const aberturaDe = (g: Geometria) => (g.forma === 'cone' ? (g.angulo * Math.PI) / 180 : g.forma === 'area' ? VOLTA : 0.2);

/**
 * `n` pontos sorteados dentro da forma: `s` na tela, `d` de 0 a 1 (do centro à borda na área e no cone, do começo ao
 * fim na linha, do meio à ponta na parede).
 */
function pontosNa(fx: Fx, g: Geometria, z: Posicao, n: number, cada: (s: Ponto, d: number) => void): void {
  for (let i = 0; i < n; i++) {
    const pt = fx.pontoNa(g, z);
    if (!pt) continue;
    const dx = pt.x - z.x;
    const dy = pt.y - z.y;
    const ao = dx * z.ux + dy * z.uy;
    const d =
      g.forma === 'linha' ? ao / g.alcance : g.forma === 'parede' ? Math.abs(-dx * z.uy + dy * z.ux) / (g.largura / 2) : Math.hypot(dx, dy) / alcanceDe(g);
    cada(projetar(pt.x, pt.y), limitar(d, 0, 1));
  }
}

/** Ponto da tela a `d` unidades da origem da forma, na direção dela. */
const naDirecao = (z: Posicao, d: number) => projetar(z.x + z.ux * d, z.y + z.uy * d);

// ---------- Fogo ----------

/** Labaredas em pontos sorteados da forma; com `onda`, nascem do centro para fora. */
function encher(fx: Fx, p: Paleta, g: Geometria, z: Posicao, n: number, op: { h: [number, number]; vida: [number, number]; w?: [number, number]; onda?: boolean; atraso?: [number, number] }): void {
  pontosNa(fx, g, z, n, (s, d) => {
    const dd = g.forma === 'area' ? d : 0;
    const atraso = op.onda ? dd * 0.15 + sorte() * 0.05 : op.atraso ? sortear(op.atraso) : sorte() * 0.08;
    fx.labareda(p, s.x, s.y, sortear(op.h) * (1 - 0.3 * dd), sortear(op.w ?? [3, 6]), sortear(op.vida), atraso);
  });
}

/** Baforadas subindo de pontos sorteados da forma (fumaça cinza, ou nas `cores` dadas). */
function fumacaNa(fx: Fx, g: Geometria, z: Posicao, n: number, op: { atraso?: [number, number]; r1?: [number, number]; vida?: [number, number]; subida?: [number, number]; cores?: string[]; altura?: [number, number] } = {}): void {
  pontosNa(fx, g, z, n, (s) => {
    fx.baforada(s.x, s.y - sortear(op.altura ?? [4, 10]), {
      r0: 2,
      r1: sortear(op.r1 ?? [5, 8]),
      vx: entre(-4, 4),
      vy: sortear(op.subida ?? [-16, -8]),
      vida: sortear(op.vida ?? [0.9, 1.4]),
      atraso: op.atraso ? sortear(op.atraso) : 0,
      cores: op.cores,
    });
  });
}

/**
 * Jato que sai da boca (a 7 pixels do chão) na direção da forma: bolhas que crescem e esfriam. O de fogo sobe e
 * vira fumaça; o de água (`agua`) cai um pouco e respinga no fim.
 */
function jato(fx: Fx, p: Paleta, g: Geometria, z: Posicao, n: number, atrasoMax: number, agua = false): void {
  const o = projetar(z.x, z.y);
  const base = anguloNaTela(z);
  const alcance = alcanceDe(g);
  const abertura = g.forma === 'cone' ? aberturaDe(g) : agua ? 0.1 : 0.15;
  const r1 = agua ? 1.8 + alcance * 0.015 : 1.5 + alcance * (g.forma === 'cone' ? 0.05 : 0.03);
  for (let i = 0; i < n; i++) {
    const a = base + (sorte() - 0.5) * abertura * 0.8;
    const v = agua ? entre(220, 260) : entre(140, 190);
    const vida = (alcance / v) * entre(0.85, 1.1);
    fx.bolha(p, o.x + Math.cos(a) * 3, o.y - 7 + Math.sin(a) * 2, Math.cos(a) * v, Math.sin(a) * v, 0.8, r1, vida, {
      atraso: sorte() * atrasoMax,
      fumaca: !agua,
      gravidade: agua ? 40 : -12,
    });
  }
}

// ---------- Ar ----------

/** Um risco de vento num ponto da forma: ao longo da parede, ou na direção da forma. */
function ventoUm(fx: Fx, p: Paleta, g: Geometria, z: Posicao): void {
  const pt = fx.pontoNa(g, z);
  if (!pt) return;
  const s = projetar(pt.x, pt.y);
  const ang = anguloNaTela(g.forma === 'parede' ? { ...z, ux: -z.uy, uy: z.ux } : z);
  fx.risco(p, s.x, s.y - entre(2, 12), ang + entre(-0.15, 0.15), entre(180, 240), entre(0.25, 0.4), {
    L: entre(10, 18),
    gira: entre(-0.5, 0.5),
    enrola: sorte() < 0.6 ? lado() * entre(6, 12) : 0,
    grosso: sorte() < 0.3,
  });
}

/** Sucção: riscos que nascem na borda e correm para o centro. */
function succao(fx: Fx, p: Paleta, g: Geometria, z: Posicao, n: number): void {
  const e = elipseNoChao(z.x, z.y, raioDe(g, 20));
  for (let i = 0; i < n; i++) {
    const a = sorte() * VOLTA;
    const vida = entre(0.3, 0.45);
    fx.risco(p, e.x + Math.cos(a) * e.rx, e.y + Math.sin(a) * e.ry - entre(0, 8), a + Math.PI + entre(-0.2, 0.2), (e.rx * 0.9) / vida, vida, { L: entre(5, 9), gira: entre(-1.5, 1.5) });
  }
}

// ---------- Água ----------

/** Gotas que saltam de (x, y) da tela e caem na linha `chao`. */
function borrifo(fx: Fx, p: Paleta, x: number, y: number, chao: number, n: number, forca = 1): void {
  for (let i = 0; i < n; i++) fx.gota(p, x + entre(-2, 2), y, entre(-45, 45) * forca, entre(-150, -70) * forca, chao + entre(-2, 3), { tam: sorte() < 0.3 ? 2 : 1 });
}

/** Ondulação no chão: anéis que se abrem em volta de (x, y) da tela. */
function ondas(fx: Fx, p: Paleta, x: number, y: number, r: number, n: number, intervalo = 0.12, vida = 0.5): void {
  for (let i = 0; i < n; i++) fx.arco(p, x, y, r * 0.15, r * (1 - i * 0.2), { abertura: VOLTA, achatado: 0.5, vida, atraso: i * intervalo, chao: true });
}

// ---------- Terra, Gelo, Mineral, Primordial: o que brota do chão ----------

/** Espinhos que brotam da forma (do centro para fora na área, do começo ao fim na linha), com lascas e poeira. */
function espinhos(fx: Fx, p: Paleta, tipo: string, g: Geometria, z: Posicao, op: { lascas?: boolean } = {}): void {
  const area = areaDaForma(g);
  const linhaReta = g.forma === 'linha' || g.forma === 'parede';
  const n = linhaReta ? limitar(Math.round(alcanceDe(g) / (g.forma === 'parede' ? 3.5 : 7)), 4, 16) : limitar(Math.round(area / 70), 3, 14);
  const h = linhaReta ? 12 : limitar(Math.sqrt(area) / 2.2, 9, 20);
  const c = projetar(z.x, z.y);
  if (g.forma === 'area') fx.espinho(p, c.x, c.y, h * 1.45, h * 0.62, entre(0.75, 0.9));
  pontosNa(fx, g, z, n, (s, d) => {
    const incl = g.forma === 'area' ? limitar((s.x - c.x) / Math.max(1, alcanceDe(g)), -1, 1) * 0.3 : entre(-0.15, 0.15);
    fx.espinho(p, s.x, s.y, h * entre(0.6, 1) * (g.forma === 'area' ? 1 - 0.3 * d : 1), h * entre(0.4, 0.55), entre(0.6, 0.85), { incl, atraso: d * (linhaReta ? 0.25 : 0.12) });
    if (op.lascas !== false && sorte() < 0.5) fx.pedra(p, s.x, s.y - 2, entre(-35, 35), entre(-120, -60), s.y + entre(-1, 2), { tam: sorte() < 0.5 ? 1 : 2, vida: 0.7, atraso: d * 0.15 });
  });
  fumacaNa(fx, g, z, 2 + Math.round(n / 4), { cores: [p.media, p.clara], r1: [4, 7], subida: [-6, -2], altura: [1, 3], vida: [0.6, 0.9] });
  fx.naForma(tipo, g, z, 4, { altura: 6, forca: 0, jeito: 'estrela' });
}

/** Pedras (ou lascas) que saltam de pontos da forma. */
function pedrasNa(fx: Fx, p: Paleta, g: Geometria, z: Posicao, n: number, op: { tam?: [number, number]; atraso?: (d: number) => number } = {}): void {
  pontosNa(fx, g, z, n, (s, d) => {
    fx.pedra(p, s.x, s.y - 1, entre(-40, 40), entre(-160, -80), s.y + entre(-1, 2), { tam: Math.round(sortear(op.tam ?? [2, 3])), vida: entre(0.7, 1), atraso: op.atraso?.(d) ?? sorte() * 0.08 });
  });
}

/** Lascas de cristal (ou de gelo) que saltam de (x, y) da tela e caem a `chao`. */
function lascas(fx: Fx, p: Paleta, x: number, y: number, chao: number, n: number, forca = 1): void {
  for (let i = 0; i < n; i++) {
    const a = sorte() * VOLTA;
    const v = entre(40, 90) * forca;
    fx.pedra(p, x, y, Math.cos(a) * v, Math.sin(a) * v * 0.6 - 40 * forca, chao + entre(-2, 3), { tam: sorte() < 0.6 ? 1 : 2, vida: 0.6 });
  }
}

// ---------- Natureza ----------

/** Raiz que brota de (x, y) da tela, sobe enrolando e se recolhe. */
function raiz(fx: Fx, p: Paleta, x: number, y: number, H: number, vida: number, atraso: number): void {
  const fase = sorte() * 6;
  const incl = entre(-0.25, 0.25);
  const pontos = Array.from({ length: Math.round(H) }, (_, i) => ({ x: x + Math.sin(i * 0.35 + fase) * 2.5 * (i / H) + i * incl, y: y - i }));
  fx.vinha(p, pontos, vida, { grossura: H > 12 ? 2.5 : 1.5, folhas: H > 9 ? [Math.round(H * 0.45), Math.round(H * 0.8)] : [Math.round(H * 0.7)], atraso });
}

// ---------- Receitas das formas ----------

export const FORMAS: Record<AnimacaoForma, ReceitaForma> = {
  labaredas(fx, p, tipo, g, z) {
    const parede = g.forma === 'parede';
    const area = areaDaForma(g);
    const n = parede ? limitar(Math.round(g.largura / 4), 6, 20) : limitar(Math.round(area / 110), 5, 18);
    const h = parede ? 16 : limitar(Math.sqrt(area) / 3, 7, 20);
    encher(fx, p, g, z, n, { h: [h * 0.7, h * 1.2], w: [h * 0.35, h * 0.55], vida: [0.45, 0.8], onda: true });
    if (g.forma === 'area') fx.mancha(p, z.x, z.y, g.raio, 0.9);
    fumacaNa(fx, g, z, Math.ceil(n / 4), { atraso: [0.25, 0.5] });
    fx.naForma(tipo, g, z, Math.min(10, Math.ceil(n / 2)), { altura: 6, forca: 0.6 });
  },
  'jato-de-fogo'(fx, p, _tipo, g, z) {
    jato(fx, p, g, z, 26, 0.12);
  },
  explosao(fx, p, tipo, g, z) {
    const r = raioDe(g, 15);
    const area = areaDaForma(g);
    fx.estouro(tipo, z.x, z.y, r);
    fx.mancha(p, z.x, z.y, r * 1.1, 1.2);
    const n = limitar(Math.round(area / 90), 4, 12);
    const h = limitar(Math.sqrt(area) / 3.5, 6, 16);
    encher(fx, p, g, z, n, { h: [h * 0.7, h * 1.2], w: [h * 0.35, h * 0.55], vida: [0.4, 0.7], atraso: [0.08, 0.22] });
    fumacaNa(fx, g, z, 3 + Math.ceil(n / 4), { atraso: [0.15, 0.35], r1: [6, 11] });
  },
  clarao(fx, p, tipo, g, z) {
    const e = elipseNoChao(z.x, z.y, raioDe(g, 30));
    fx.clarao(p, e.x, e.y, e.rx, 0.5);
    fx.explosao(tipo, e.x, e.y - 8, 10, 1.2);
  },
  fumaca(fx, _p, tipo, g, z) {
    fumacaNa(fx, g, z, limitar(Math.round(areaDaForma(g) / 90), 4, 24), { atraso: [0, 0.3], r1: [7, 11], vida: [1, 1.6] });
    fx.naForma(tipo, g, z, 4, { altura: 4, forca: 0.4 });
  },
  vento(fx, p, _tipo, g, z) {
    // Rajada: riscos que saem da origem dentro da forma e se enrolam no fim, e arcos que se abrem na frente.
    if (g.forma === 'parede') {
      const n = limitar(Math.round(areaDaForma(g) / 90), 8, 20);
      for (let i = 0; i < n; i++) ventoUm(fx, p, g, z);
      return;
    }
    const o = projetar(z.x, z.y);
    const base = anguloNaTela(z);
    const alcance = alcanceDe(g);
    const abertura = aberturaDe(g);
    const n = limitar(Math.round((alcance * abertura) / 3.5), 8, 18);
    for (let i = 0; i < n; i++) {
      const a = base + (sorte() - 0.5) * abertura * 0.9;
      const v = entre(220, 300);
      fx.risco(p, o.x + Math.cos(a) * 4, o.y - entre(2, 14) + Math.sin(a) * 4, a, v, (alcance / v) * entre(0.8, 1.1) + 0.06, {
        L: entre(10, 18),
        gira: (sorte() - 0.5) * 2,
        enrola: lado() * entre(8, 14),
        grosso: sorte() < 0.3,
        atraso: sorte() * 0.06,
      });
    }
    if (g.forma === 'area') return;
    for (const [atraso, f] of [
      [0, 1],
      [0.07, 0.8],
    ] as const) {
      fx.arco(p, o.x, o.y - 8, 6, alcance * f, { ang: base, abertura: abertura * 0.8, achatado: 0.8, vida: 0.24, atraso });
    }
  },
  'onda-de-vento'(fx, p, _tipo, g, z) {
    // Dois anéis tracejados que se abrem no chão, riscos que saem do centro e poeira.
    const e = elipseNoChao(z.x, z.y, raioDe(g, 25));
    const achatado = e.ry / Math.max(1, e.rx);
    fx.arco(p, e.x, e.y, e.rx * 0.25, e.rx * 1.05, { abertura: VOLTA, achatado, tracos: 8, giro: 1, vida: 0.4 });
    fx.arco(p, e.x, e.y, e.rx * 0.15, e.rx * 0.8, { abertura: VOLTA, achatado, tracos: 6, giro: -1, vida: 0.35, atraso: 0.08 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * VOLTA + sorte() * 0.4;
      fx.risco(p, e.x + Math.cos(a) * e.rx * 0.2, e.y + Math.sin(a) * e.ry * 0.2 - entre(1, 6), a, (e.rx / 0.3) * entre(0.8, 1.1), entre(0.28, 0.36), {
        L: entre(6, 10),
        enrola: lado() * entre(8, 12),
      });
    }
    for (let i = 0; i < 3; i++) {
      fx.baforada(e.x + entre(-0.6, 0.6) * e.rx, e.y + entre(-2, 2), { r0: 1.5, r1: 4, vx: entre(-10, 10), vy: -4, vida: 0.6, cores: [FUMACA[2]!, FUMACA[2]!, BRANCO] });
    }
  },
  redemoinho(fx, p, _tipo, g, z) {
    fx.manter({}, 'funil', z.x, z.y, raioDe(g, 15), p, 0.6);
  },
  succao(fx, p, _tipo, g, z) {
    succao(fx, p, g, z, 18);
  },
  respingo(fx, p, _tipo, g, z) {
    // Gotas que saltam da forma, espuma e ondas no chão.
    const e = elipseNoChao(z.x, z.y, raioDe(g, 12));
    const n = limitar(Math.round(areaDaForma(g) / 40), 10, 30);
    pontosNa(fx, g, z, n, (s) => fx.gota(p, s.x, s.y - 2, entre(-40, 40), entre(-160, -80), s.y + entre(-1, 2), { tam: sorte() < 0.3 ? 2 : 1 }));
    for (let i = 0; i < 6; i++) fx.bolha(p, e.x + entre(-3, 3), e.y - 2, entre(-30, 30), entre(-70, -30), 2, 1, 0.35, { fumaca: false, gravidade: 220 });
    ondas(fx, p, e.x, e.y, e.rx * 1.1, 2);
  },
  geiser(fx, p, _tipo, g, z) {
    // Coluna de água que sobe e desaba em gotas, com ondas em volta.
    const c = projetar(z.x, z.y);
    const r = elipseNoChao(z.x, z.y, raioDe(g, 12)).rx;
    for (let i = 0; i < 24; i++) {
      fx.bolha(p, c.x + entre(-3, 3), c.y - 2, entre(-15, 15), entre(-300, -200), 2, 3.5, 0.55, { atraso: sorte() * 0.25, fumaca: false, gravidade: 600 });
    }
    for (let i = 0; i < 16; i++) fx.gota(p, c.x + entre(-4, 4), c.y - 40, entre(-55, 55), entre(-40, 20), c.y + entre(-3, 4), { tam: sorte() < 0.4 ? 2 : 1, atraso: entre(0.2, 0.35) });
    ondas(fx, p, c.x, c.y, r * 1.4, 3, 0.15, 0.6);
    for (let i = 0; i < 3; i++) fx.baforada(c.x + entre(-4, 4), c.y - entre(20, 35), { r0: 2, r1: 6, vx: entre(-6, 6), vy: -6, vida: 0.8, atraso: 0.2, cores: [p.clara, BRANCO] });
  },
  'jato-dagua'(fx, p, _tipo, g, z) {
    // Jato de água em linha reta e, no fim, o respingo.
    jato(fx, p, g, z, 30, 0.1, true);
    const fim = naDirecao(z, alcanceDe(g));
    borrifo(fx, p, fim.x, fim.y - 7, fim.y, 8);
    ondas(fx, p, fim.x, fim.y, 10, 2);
  },
  ondulacao(fx, p, _tipo, g, z) {
    const e = elipseNoChao(z.x, z.y, raioDe(g, 25));
    ondas(fx, p, e.x, e.y, e.rx, 3, 0.15, 0.7);
  },
  onda(fx, p, _tipo, g, z) {
    // Crista de onda ao longo da parede, quebrando para a frente, com espuma e gotas.
    const ang = anguloNaTela(z);
    const n = limitar(Math.round(alcanceDe(g) / 2), 8, 24);
    pontosNa(fx, g, z, n, (s) => {
      fx.bolha(p, s.x, s.y - 2, Math.cos(ang) * entre(40, 80), entre(-130, -90), 2, 3, 0.45, { fumaca: false, gravidade: 380 });
      if (sorte() < 0.4) fx.gota(p, s.x, s.y - 10, Math.cos(ang) * entre(30, 70), entre(-90, -40), s.y + 2);
    });
  },
  espinhos(fx, p, tipo, g, z) {
    espinhos(fx, p, tipo, g, z);
  },
  estalactite(fx, p, tipo, g, z) {
    // Um risco que despenca do alto e, ao chegar, estoura em espinhos, lascas e névoa fria.
    const c = projetar(z.x, z.y);
    const queda = 0.09;
    fx.risco(p, c.x, c.y - 70, Math.PI / 2, 760, queda, { L: 18, grosso: true });
    const h = limitar(raioDe(g, 10) * 1.6, 10, 20);
    fx.espinho(p, c.x, c.y, h, h * 0.55, 0.7, { atraso: queda });
    for (const s of [-1, 1]) fx.espinho(p, c.x + s * 5, c.y + 1, h * 0.6, h * 0.4, 0.6, { incl: s * 0.3, atraso: queda + 0.03 });
    for (let i = 0; i < 8; i++) fx.pedra(p, c.x, c.y - 4, entre(-70, 70), entre(-130, -50), c.y + entre(-2, 3), { tam: sorte() < 0.6 ? 1 : 2, vida: 0.7, atraso: queda });
    fx.arco(p, c.x, c.y, 2, h * 1.4, { abertura: VOLTA, achatado: 0.5, vida: 0.35, atraso: queda, chao: true });
    for (let i = 0; i < 3; i++) fx.baforada(c.x + entre(-6, 6), c.y - 3, { r0: 2, r1: 6, vx: entre(-12, 12), vy: -5, vida: 0.8, atraso: queda, cores: [p.clara, BRANCO] });
    fx.naForma(tipo, g, z, 6, { altura: 10, forca: 0.6 });
  },
  granizo(fx, p, tipo, g, z) {
    // Pedras de gelo que caem do alto e quicam, com um anelzinho de geada.
    const c = projetar(z.x, z.y);
    for (let i = 0; i < 3; i++) fx.pedra(p, c.x + entre(-5, 5), c.y - 45 - i * 7, entre(-10, 10), 320, c.y + entre(-2, 2), { tam: 2, vida: 0.7, quica: 1, atraso: i * 0.04 });
    fx.arco(p, c.x, c.y, 1, raioDe(g, 8), { abertura: VOLTA, achatado: 0.5, vida: 0.3, atraso: 0.12, chao: true });
    fx.naForma(tipo, g, z, 3, { altura: 4, forca: 0.5 });
  },
  sopro(fx, p, tipo, g, z) {
    // Bafo que sai da boca em baforadas na cor do elemento, com as partículas dele.
    const o = projetar(z.x, z.y);
    const base = anguloNaTela(z);
    const alcance = alcanceDe(g);
    const abertura = aberturaDe(g);
    for (let i = 0; i < 14; i++) {
      const a = base + (sorte() - 0.5) * abertura * 0.8;
      const v = entre(90, 130);
      fx.baforada(o.x + Math.cos(a) * 3, o.y - 7, { r0: 2, r1: entre(5, 8), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: alcance / v, atraso: sorte() * 0.15, cores: [p.media, p.clara] });
    }
    fx.naForma(tipo, g, z, 10, { altura: 10, forca: 0.6, sopro: 60 });
  },
  avalanche(fx, p, tipo, g, z) {
    // Neve e blocos de gelo rolando ao longo da parede.
    const ang = anguloNaTela(z);
    pontosNa(fx, g, z, limitar(Math.round(alcanceDe(g) / 5), 10, 30), (s) => {
      fx.baforada(s.x, s.y - entre(2, 8), { r0: 3, r1: entre(8, 12), vx: Math.cos(ang) * 40, vy: -8, vida: entre(0.6, 1), cores: [p.clara, BRANCO] });
      if (sorte() < 0.4) fx.pedra(p, s.x, s.y - 4, Math.cos(ang) * entre(40, 80), entre(-90, -40), s.y + 2, { tam: Math.round(entre(2, 4)), vida: 0.8 });
    });
    fx.naForma(tipo, g, z, 10, { altura: 12, forca: 0.6 });
  },
  relampago(fx, p, tipo, g, z) {
    // Raio que cai do céu no ponto, clarão, marca no chão e faíscas.
    const c = projetar(z.x, z.y);
    const topo = { x: c.x + entre(-8, 8), y: c.y - 110 };
    fx.raio(tipo, topo, { x: c.x, y: c.y - 2 }, 0.3);
    fx.raio(tipo, { x: topo.x + entre(-6, 6), y: topo.y }, { x: c.x + entre(-3, 3), y: c.y - 2 }, 0.2);
    fx.clarao(p, c.x, c.y + 6, 14, 0.25);
    fx.mancha(p, z.x, z.y, raioDe(g, 8), 0.8);
    fx.arco(p, c.x, c.y, 2, raioDe(g, 8) + 6, { abertura: VOLTA, achatado: 0.5, vida: 0.3, chao: true, grossura: 2 });
    for (let i = 0; i < 10; i++) fx.particula(tipo, c.x, c.y - 3);
  },
  descarga(fx, p, tipo, g, z) {
    // Raios que saem do corpo para o chão em volta, um lampejo e um anel.
    const c = projetar(z.x, z.y);
    const r = alcanceDe(g);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * VOLTA + entre(-0.3, 0.3);
      const fim = projetar(z.x + Math.cos(a) * r * entre(0.6, 0.95), z.y + Math.sin(a) * r * entre(0.6, 0.95));
      fx.raio(tipo, { x: c.x, y: c.y - 8 }, fim);
    }
    fx.bolha(p, c.x, c.y - 8, 0, 0, 6, 2, 0.12, { fumaca: false, gravidade: 0 });
    fx.arco(p, c.x, c.y, 3, elipseNoChao(z.x, z.y, r).rx, { abertura: VOLTA, achatado: 0.5, vida: 0.3, chao: true, tracos: 10, giro: 1 });
    for (let i = 0; i < 12; i++) fx.particula(tipo, c.x, c.y - 8);
  },
  'arco-eletrico'(fx, p, tipo, g, z) {
    // Raio da boca até o fim da linha (ou de ponta a ponta da parede), com faíscas e lampejo no fim.
    let a: Ponto;
    let b: Ponto;
    if (g.forma === 'parede') {
      const meia = g.largura / 2;
      const pa = projetar(z.x - z.uy * meia, z.y + z.ux * meia);
      const pb = projetar(z.x + z.uy * meia, z.y - z.ux * meia);
      a = { x: pa.x, y: pa.y - 6 };
      b = { x: pb.x, y: pb.y - 6 };
    } else {
      const o = projetar(z.x, z.y);
      const fim = naDirecao(z, alcanceDe(g));
      a = { x: o.x, y: o.y - 8 };
      b = { x: fim.x, y: fim.y - 8 };
    }
    fx.raio(tipo, a, b, 0.3);
    fx.raio(tipo, a, b, 0.2);
    fx.bolha(p, b.x, b.y, 0, 0, 4, 1.5, 0.12, { fumaca: false, gravidade: 0 });
    for (let i = 0; i < 8; i++) fx.particula(tipo, b.x, b.y);
  },
  tremor(fx, p, _tipo, g, z) {
    // Rachaduras que saem do centro, pedras pulando, um anel de poeira e o chão tremendo.
    const c = projetar(z.x, z.y);
    const r = elipseNoChao(z.x, z.y, raioDe(g, 20)).rx;
    for (let i = 0; i < 6; i++) fx.rachadura(p, c, (i / 6) * VOLTA + entre(-0.3, 0.3), r * entre(0.6, 0.95), 1.1);
    pedrasNa(fx, p, g, z, 10, { atraso: (d) => d * 0.12 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * VOLTA;
      fx.baforada(c.x + Math.cos(a) * r * 0.75, c.y + Math.sin(a) * r * 0.4, { r0: 3, r1: entre(6, 9), vx: Math.cos(a) * 12, vy: -5, vida: 0.9, atraso: 0.05, cores: [p.media, p.clara] });
    }
    fx.arco(p, c.x, c.y, r * 0.3, r, { abertura: VOLTA, achatado: 0.5, vida: 0.35, chao: true, grossura: 2 });
  },
  rachadura(fx, p, _tipo, g, z) {
    // A fenda corre pela linha e o chão se levanta em pedras e estacas atrás dela.
    const o = projetar(z.x, z.y);
    const ang = anguloNaTela(g.forma === 'parede' ? { ...z, ux: -z.uy, uy: z.ux } : z);
    const L = alcanceDe(g);
    fx.rachadura(p, o, ang, L, 1.3);
    for (let s = 6; s < L; s += 8) {
      const pt = naDirecao(z, s);
      const atraso = (s / L) * 0.25;
      fx.pedra(p, pt.x, pt.y - 1, entre(-25, 25), entre(-150, -90), pt.y + 1, { tam: Math.round(entre(2, 3)), vida: 0.8, atraso });
      if (sorte() < 0.5) fx.espinho(p, pt.x + entre(-2, 2), pt.y, entre(6, 9), entre(3, 5), 0.6, { atraso, incl: entre(-0.2, 0.2) });
      if (sorte() < 0.4) fx.baforada(pt.x, pt.y - 2, { r0: 2, r1: 5, vx: 0, vy: -5, vida: 0.7, atraso, cores: [p.media, p.clara] });
    }
  },
  poeira(fx, p, _tipo, g, z) {
    fumacaNa(fx, g, z, limitar(Math.round(areaDaForma(g) / 80), 6, 24), { cores: [p.media, p.clara], r1: [8, 12], subida: [-10, -4], vida: [1, 1.6], altura: [2, 10] });
    const c = projetar(z.x, z.y);
    const r = alcanceDe(g);
    for (let i = 0; i < 8; i++) {
      const a = sorte() * VOLTA;
      fx.risco(p, c.x + Math.cos(a) * r * 0.5, c.y + Math.sin(a) * r * 0.3 - entre(2, 10), a + Math.PI / 2, entre(60, 90), entre(0.4, 0.6), { L: entre(6, 10), gira: lado() * entre(2, 4) });
    }
  },
  prisma(fx, p, tipo, g, z) {
    // Luz branca que se abre em arco-íris até o fim da linha, com brilhos na ponta.
    const o = projetar(z.x, z.y);
    const fim = naDirecao(z, alcanceDe(g));
    fx.tracado(p, { x: o.x, y: o.y - 8 }, { x: fim.x, y: fim.y - 8 }, 'prisma', 0.45);
    fx.bolha(p, o.x, o.y - 8, 0, 0, 3, 1, 0.12, { fumaca: false, gravidade: 0 });
    for (let i = 0; i < 6; i++) fx.particula(tipo, fim.x, fim.y - 8, { jeito: 'estrela', forca: 0.8 });
  },
  corrente(fx, p, tipo, g, z) {
    const o = projetar(z.x, z.y);
    const fim = naDirecao(z, alcanceDe(g));
    fx.tracado(p, { x: o.x, y: o.y - 8 }, { x: fim.x, y: fim.y - 8 }, 'corrente', 0.9);
    for (let i = 0; i < 4; i++) fx.particula(tipo, fim.x, fim.y - 8, { jeito: 'estrela', forca: 0.5 });
  },
  ressonancia(fx, p, tipo, g, z) {
    // Anéis finos que vibram e se abrem, com lascas de cristal e brilhos.
    const e = elipseNoChao(z.x, z.y, raioDe(g, 20));
    const achatado = e.ry / Math.max(1, e.rx);
    for (let i = 0; i < 3; i++) fx.arco(p, e.x, e.y, 3, e.rx * 1.1, { abertura: VOLTA, achatado, tracos: 12, giro: 2 * (i % 2 ? -1 : 1), vida: 0.35, atraso: i * 0.08, chao: true });
    lascas(fx, p, e.x, e.y - 4, e.y, 8);
    fx.naForma(tipo, g, z, 8, { altura: 10, forca: 0.3, jeito: 'estrela' });
  },
  brilhos(fx, p, tipo, g, z) {
    fx.naForma(tipo, g, z, 24, { altura: 16, forca: 0.6, jeito: 'estrela' });
    fumacaNa(fx, g, z, 6, { cores: [p.clara, p.quente], r1: [5, 8], subida: [-6, -2], vida: [0.8, 1.2] });
  },
  raizes(fx, p, tipo, g, z) {
    // Raízes que brotam da forma, sobem enrolando e se recolhem, com folhas soltas.
    const n = limitar(Math.round(areaDaForma(g) / 90), 4, 12);
    pontosNa(fx, g, z, n, (s, d) => raiz(fx, p, s.x, s.y, entre(10, 18), entre(0.8, 1), d * 0.15));
    const c = projetar(z.x, z.y);
    for (let i = 0; i < 4; i++) fx.folha(p, c.x + entre(-8, 8), c.y - entre(4, 10), entre(-40, 40), entre(-60, -20), { vida: entre(0.7, 1), atraso: 0.15 });
    fx.naForma(tipo, g, z, 4, { altura: 6, forca: 0.5 });
  },
  vinha(fx, p, _tipo, g, z) {
    // Vinha que chicoteia da boca até o fim da forma, em curva, e deixa folhas na ponta.
    const L = alcanceDe(g);
    const o = projetar(z.x, z.y);
    const fim = naDirecao(z, L);
    const dx = fim.x - o.x;
    const dy = fim.y - o.y;
    const d = Math.hypot(dx, dy) || 1;
    const fase = sorte() * 6;
    const pontos = Array.from({ length: Math.round(d) }, (_, i) => {
      const s = i / d;
      const onda = Math.sin(s * 9 + fase) * 3 * (1 - s * 0.6);
      return { x: o.x + dx * s - (dy / d) * onda, y: o.y - 6 + dy * s + (dx / d) * onda };
    });
    const folhas = pontos.map((_, i) => i).filter((i) => i > 4 && i % 9 === 0);
    fx.vinha(p, pontos, 0.7, { grossura: 2, folhas });
    for (let i = 0; i < 3; i++) fx.folha(p, fim.x, fim.y - 6, entre(-40, 40), entre(-50, -10), { vida: 0.8, atraso: 0.12 });
  },
  bruma(fx, p, tipo, g, z) {
    fumacaNa(fx, g, z, limitar(Math.round(areaDaForma(g) / 90), 5, 20), { cores: [p.media, p.clara], r1: [8, 12], subida: [-6, -2], vida: [1, 1.6], altura: [2, 12] });
    fx.naForma(tipo, g, z, 6, { altura: 12, forca: 0.5 });
  },
  runas(fx, p, tipo, g, z) {
    // O círculo de runas aparece no chão, runas sobem dele e um anel de luz se abre.
    const r = raioDe(g, 20);
    fx.manter({}, 'circulo', z.x, z.y, r, p, 0.6);
    const e = elipseNoChao(z.x, z.y, r);
    for (let i = 0; i < 5; i++) fx.runa(p, e.x + entre(-0.7, 0.7) * e.rx, e.y + entre(-0.5, 0.5) * e.ry - 4, { vy: -14, vida: 0.9, atraso: i * 0.06 });
    fx.arco(p, e.x, e.y, e.rx, e.rx * 1.25, { abertura: VOLTA, achatado: e.ry / Math.max(1, e.rx), vida: 0.3, chao: true, grossura: 2 });
    fx.naForma(tipo, g, z, 8, { altura: 10, forca: 0.6, jeito: 'estrela' });
  },
  rugido(fx, p, tipo, g, z) {
    // Ondas grossas no chão, ondas de som no ar à frente, poeira e riscos.
    const c = projetar(z.x, z.y);
    const e = elipseNoChao(z.x, z.y, raioDe(g, 30));
    const achatado = e.ry / Math.max(1, e.rx);
    for (let i = 0; i < 3; i++) fx.arco(p, c.x, c.y, e.rx * 0.2, e.rx * 1.1, { abertura: VOLTA, achatado, vida: 0.4, atraso: i * 0.1, chao: true, grossura: 2 });
    const ang = anguloNaTela(z);
    for (let i = 0; i < 3; i++) fx.arco(p, c.x + Math.cos(ang) * 6, c.y - 10, 6, 22 + e.rx * 0.3, { ang, abertura: 1.3, achatado: 1, vida: 0.35, atraso: i * 0.08, grossura: 2 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * VOLTA;
      fx.baforada(c.x + Math.cos(a) * e.rx * 0.8, c.y + Math.sin(a) * e.ry * 0.8, { r0: 2, r1: 6, vx: Math.cos(a) * 15, vy: -4, vida: 0.7, atraso: 0.1, cores: [FUMACA[1]!, FUMACA[2]!] });
    }
    fx.naForma(tipo, g, z, 6, { altura: 8, forca: 0.8 });
  },
  varrida(fx, p, tipo, g, z) {
    // Um golpe largo que varre o cone de um lado ao outro, com poeira no fim.
    const o = projetar(z.x, z.y);
    const ang = anguloNaTela(z);
    const r = alcanceDe(g) * 0.9;
    const abertura = aberturaDe(g);
    fx.arco(p, o.x, o.y - 6, r, r, { ang, abertura, achatado: 0.75, vida: 0.35, varre: true, grossura: 3 });
    fx.arco(p, o.x, o.y - 6, r * 0.75, r * 0.75, { ang, abertura, achatado: 0.75, vida: 0.33, varre: true, grossura: 1, atraso: 0.03 });
    for (let i = 0; i < 4; i++) {
      const a = ang + abertura / 2 - sorte() * 0.4;
      fx.baforada(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r * 0.75, { r0: 2, r1: 5, vx: 0, vy: -5, vida: 0.6, atraso: 0.15, cores: [FUMACA[1]!, FUMACA[2]!] });
    }
    fx.naForma(tipo, g, z, 5, { altura: 8, forca: 0.8 });
  },
};

// ---------- Receitas das zonas que duram (um quadro) ----------

/** Sem receita aqui, a zona usa a do terreno de mesmo nome (labaredas, fumaça, espinhos, bruma, runas…). */
export const ZONAS: Partial<Record<AnimacaoForma, ReceitaQuadro>> = {
  'jato-de-fogo'(fx, p, _tipo, g, z, k) {
    jato(fx, p, g, z, vezes(4 * k), 0);
  },
  'jato-dagua'(fx, p, _tipo, g, z, k) {
    jato(fx, p, g, z, vezes(4 * k), 0, true);
  },
  redemoinho(fx, p, _tipo, g, z, _k, chave) {
    fx.manter(chave, 'funil', z.x, z.y, raioDe(g, 15), p);
  },
  'onda-de-vento'(fx, p, _tipo, g, z, k, chave) {
    const r = raioDe(g, 25);
    fx.manter(chave, 'anel', z.x, z.y, r, p);
    const e = elipseNoChao(z.x, z.y, r);
    for (let i = vezes(1.5 * k); i > 0; i--) {
      const a = sorte() * VOLTA;
      fx.risco(p, e.x + Math.cos(a) * e.rx, e.y + Math.sin(a) * e.ry - entre(1, 5), a, entre(90, 130), entre(0.15, 0.25), { L: entre(5, 9), enrola: lado() * 10 });
    }
  },
  vento(fx, p, _tipo, g, z, k) {
    for (let i = vezes(0.8 * k); i > 0; i--) ventoUm(fx, p, g, z);
  },
  explosao(fx, p, tipo, g, z, k, chave) {
    CAMPOS.labaredas(fx, p, tipo, g, z, k, chave);
  },
  sopro(fx, p, tipo, g, z, k) {
    // Bafo canalizado: baforadas e partículas saindo da boca o tempo todo.
    const o = projetar(z.x, z.y);
    const base = anguloNaTela(z);
    const alcance = alcanceDe(g);
    const abertura = aberturaDe(g);
    for (let i = vezes(1.4 * k); i > 0; i--) {
      const a = base + (sorte() - 0.5) * abertura * 0.8;
      const v = entre(90, 130);
      fx.baforada(o.x + Math.cos(a) * 3, o.y - 7, { r0: 2, r1: entre(5, 8), vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: alcance / v, cores: [p.media, p.clara] });
    }
    if (sorte() < 0.6 * k) fx.naForma(tipo, g, z, 1, { altura: 10, forca: 0.5, sopro: 70 });
  },
  onda(fx, p, _tipo, g, z, k) {
    // A onda que anda: crista de água com espuma ao longo da parede.
    const ang = anguloNaTela(z);
    for (let i = vezes(2.5 * k); i > 0; i--) {
      const pt = fx.pontoNa(g, z);
      if (!pt) continue;
      const s = projetar(pt.x, pt.y);
      fx.bolha(p, s.x, s.y - 2, Math.cos(ang) * entre(40, 90), entre(-120, -80), 2, 3, 0.4, { fumaca: false, gravidade: 380 });
      if (sorte() < 0.3) fx.gota(p, s.x, s.y - 10, Math.cos(ang) * entre(40, 80), entre(-80, -30), s.y + 2);
    }
  },
  avalanche(fx, p, tipo, g, z, k) {
    const ang = anguloNaTela(z);
    for (let i = vezes(2 * k); i > 0; i--) {
      const pt = fx.pontoNa(g, z);
      if (!pt) continue;
      const s = projetar(pt.x, pt.y);
      fx.baforada(s.x, s.y - entre(2, 8), { r0: 3, r1: entre(8, 12), vx: Math.cos(ang) * 40, vy: -8, vida: entre(0.5, 0.8), cores: [p.clara, BRANCO] });
      if (sorte() < 0.3) fx.pedra(p, s.x, s.y - 4, Math.cos(ang) * entre(60, 100), entre(-90, -40), s.y + 2, { tam: Math.round(entre(2, 4)), vida: 0.6 });
    }
    if (sorte() < 0.5 * k) fx.naForma(tipo, g, z, 1, { altura: 12, forca: 0.6 });
  },
  ondulacao(fx, p, _tipo, g, z, k) {
    // Ondas grandes que saem do centro e ondinhas em volta.
    const e = elipseNoChao(z.x, z.y, raioDe(g, 30));
    if (sorte() < 0.04 * k) fx.arco(p, e.x, e.y, 4, e.rx, { abertura: VOLTA, achatado: e.ry / Math.max(1, e.rx), vida: 1, chao: true, grossura: 2 });
    CAMPOS.ondulacao(fx, p, '', g, z, k * 0.12, z);
  },
  tremor(fx, p, _tipo, g, z, k) {
    // A fenda que anda: pedras, poeira e pedaços de rachadura onde ela passa.
    const c = projetar(z.x, z.y);
    if (sorte() < 0.5 * k) fx.pedra(p, c.x + entre(-4, 4), c.y - 1, entre(-40, 40), entre(-140, -80), c.y + 1, { tam: Math.round(entre(2, 3)), vida: 0.7 });
    if (sorte() < 0.3 * k) fx.baforada(c.x, c.y - 2, { r0: 2, r1: 6, vx: 0, vy: -5, vida: 0.7, cores: [p.media, p.clara] });
    if (sorte() < 0.25 * k) fx.rachadura(p, c, sorte() * VOLTA, entre(5, 9), 1);
  },
  succao(fx, p, _tipo, g, z, k) {
    succao(fx, p, g, z, vezes(0.6 * k));
  },
};

// ---------- Receitas dos terrenos e névoas (um quadro) ----------

export const CAMPOS: Record<AnimacaoCampo, ReceitaQuadro> = {
  labaredas(fx, p, _tipo, g, z, k) {
    const parede = g.forma === 'parede';
    const area = areaDaForma(g);
    encher(fx, p, g, z, vezes((area / (parede ? 450 : 600)) * k), { h: parede ? [9, 15] : [5, 10], w: [3, 5], vida: [0.45, 0.8] });
    if (sorte() < (area / 9000) * k) fumacaNa(fx, g, z, 1, { r1: [4, 7] });
  },
  fumaca(fx, _p, tipo, g, z, k) {
    const area = areaDaForma(g);
    fumacaNa(fx, g, z, vezes((area / 7000) * k), { r1: [8, 12], vida: [1.2, 2], subida: [-9, -4] });
    if (sorte() < (area / 6000) * k) fx.naForma(tipo, g, z, 1, { altura: 10, forca: 0.3 });
  },
  vento(fx, p, _tipo, g, z, k, _chave, def) {
    // Na direção do empuxo do campo: de lado (ao longo da faixa) ou para a frente.
    const l = def?.empuxo?.lado ?? 0;
    const dir = l ? { ...z, ux: -z.uy * Math.sign(l), uy: z.ux * Math.sign(l) } : z;
    const ang = anguloNaTela(dir);
    pontosNa(fx, g, z, vezes((areaDaForma(g) / 1800) * k), (s) => {
      fx.risco(p, s.x, s.y - entre(0, 10), ang + entre(-0.15, 0.15), entre(140, 200), entre(0.3, 0.45), {
        L: entre(6, 12),
        gira: entre(-0.8, 0.8),
        enrola: sorte() < 0.4 ? lado() * entre(5, 8) : 0,
      });
    });
  },
  redemoinho(fx, p, _tipo, g, z, k) {
    pontosNa(fx, g, z, vezes((areaDaForma(g) / 3500) * k), (s) => {
      fx.risco(p, s.x, s.y - entre(4, 16), sorte() * VOLTA, entre(50, 70), entre(0.5, 0.8), { L: entre(8, 14), gira: lado() * entre(9, 13) });
    });
  },
  succao(fx, p, _tipo, g, z, k) {
    succao(fx, p, g, z, vezes((areaDaForma(g) / 2500) * k));
  },
  ondulacao(fx, p, tipo, g, z, k) {
    // Poça: ondinhas que se abrem aqui e ali e brilhos parados.
    const area = areaDaForma(g);
    pontosNa(fx, g, z, vezes((area / 7000) * k), (s) => fx.arco(p, s.x, s.y, 1, entre(4, 7), { abertura: VOLTA, achatado: 0.5, vida: 0.6, chao: true }));
    if (tipo && sorte() < (area / 4000) * k) fx.naForma(tipo, g, z, 1, { forca: 0, jeito: 'estrela' });
  },
  chuva(fx, p, _tipo, g, z, k) {
    // Garoa: gotas que caem de cima e fazem ondinhas no chão.
    pontosNa(fx, g, z, vezes((areaDaForma(g) / 1500) * k), (s) => fx.gota(p, s.x, s.y - entre(28, 40), entre(-8, 0), 120, s.y));
    if (sorte() < (areaDaForma(g) / 12000) * k) fumacaNa(fx, g, z, 1, { cores: [p.clara, BRANCO], r1: [6, 9], subida: [-3, -1], vida: [1.2, 1.8] });
  },
  'brilho-de-gelo'(fx, p, tipo, g, z, k) {
    // Chão de gelo: brilhos parados e, de vez em quando, um véu frio rente ao chão.
    const area = areaDaForma(g);
    if (sorte() < (area / 1500) * k) fx.naForma(tipo, g, z, 1, { forca: 0, jeito: 'estrela' });
    if (sorte() < (area / 12000) * k) fumacaNa(fx, g, z, 1, { cores: [p.clara, BRANCO], r1: [5, 8], subida: [-2, 0], altura: [0, 2], vida: [1, 1.4] });
  },
  estatica(fx, _p, tipo, g, z, k) {
    // Estalos: raios curtos entre pontos do campo e faíscas.
    pontosNa(fx, g, z, vezes((areaDaForma(g) / 1200) * k), (s) => {
      const a = sorte() * VOLTA;
      const L = entre(6, 14);
      const de = { x: s.x, y: s.y - entre(0, 4) };
      const ate = { x: de.x + Math.cos(a) * L, y: de.y + Math.sin(a) * L * 0.5 };
      fx.raio(tipo, de, ate, 0.12);
      fx.particula(tipo, ate.x, ate.y, { forca: 0.6 });
    });
  },
  'nuvem-carregada'(fx, p, tipo, g, z, k) {
    // Nuvem escura no alto, que de vez em quando solta um raio no chão.
    const area = areaDaForma(g);
    pontosNa(fx, g, z, vezes((area / 5000) * k), (s) =>
      fx.baforada(s.x, s.y - entre(18, 26), { r0: 4, r1: entre(9, 12), vx: entre(-3, 3), vy: -2, vida: 1.4, cores: [FUMACA[0]!, '#333c57'] }),
    );
    if (sorte() < (area / 200000) * k) {
      pontosNa(fx, g, z, 1, (s) => {
        fx.raio(tipo, { x: s.x + entre(-4, 4), y: s.y - 24 }, { x: s.x, y: s.y }, 0.2);
        fx.clarao(p, s.x, s.y + 6, 10, 0.2);
      });
    }
  },
  rachaduras(fx, p, _tipo, g, z, k) {
    // Chão rachado: fendas que aparecem e somem, pedrinhas e poeira.
    const area = areaDaForma(g);
    pontosNa(fx, g, z, vezes((area / 9000) * k), (s) => fx.rachadura(p, s, sorte() * VOLTA, entre(6, 12), entre(1.2, 1.6)));
    if (sorte() < (area / 12000) * k) pedrasNa(fx, p, g, z, 1, { tam: [1, 2] });
    if (sorte() < (area / 20000) * k) fumacaNa(fx, g, z, 1, { cores: [p.media, p.clara], r1: [4, 6], subida: [-4, -2] });
  },
  poeira(fx, p, _tipo, g, z, k) {
    const area = areaDaForma(g);
    fumacaNa(fx, g, z, vezes((area / 6000) * k), { cores: [p.media, p.clara], r1: [9, 13], subida: [-4, -1], vida: [1.4, 2], altura: [2, 12] });
    pontosNa(fx, g, z, vezes((area / 4000) * k), (s) => fx.risco(p, s.x, s.y - entre(2, 12), entre(-0.3, 0.3), entre(70, 110), entre(0.3, 0.5), { L: entre(6, 10), gira: entre(-1, 1) }));
  },
  espinhos(fx, p, tipo, g, z, k) {
    // Campo de cristais: espinhos que brotam e duram, com brilhos.
    const area = areaDaForma(g);
    pontosNa(fx, g, z, vezes((area / 2500) * k), (s) => fx.espinho(p, s.x, s.y, entre(5, 9), entre(3, 5), entre(1.2, 1.8), { incl: entre(-0.2, 0.2) }));
    if (sorte() < (area / 3000) * k) fx.naForma(tipo, g, z, 1, { altura: 8, forca: 0, jeito: 'estrela' });
  },
  brilhos(fx, p, tipo, g, z, k) {
    const area = areaDaForma(g);
    if (sorte() < (area / 1500) * k) fx.naForma(tipo, g, z, 1, { altura: 20, forca: 0.3, jeito: 'estrela' });
    if (sorte() < (area / 15000) * k) fumacaNa(fx, g, z, 1, { cores: [p.clara, p.quente], r1: [6, 9], subida: [-3, -1], vida: [1.2, 1.6] });
  },
  raizes(fx, p, tipo, g, z, k) {
    // Raízes que brotam, se mexem e se recolhem; uma folha de vez em quando.
    const area = areaDaForma(g);
    pontosNa(fx, g, z, vezes((area / 4000) * k), (s) => raiz(fx, p, s.x, s.y, entre(5, 10), entre(0.8, 1.2), 0));
    if (sorte() < (area / 15000) * k) fx.naForma(tipo, g, z, 1, { altura: 6, forca: 0.4 });
  },
  bruma(fx, p, tipo, g, z, k) {
    const area = areaDaForma(g);
    fumacaNa(fx, g, z, vezes((area / 7000) * k), { cores: [p.media, p.clara], r1: [9, 13], subida: [-4, -1], vida: [1.6, 2.2], altura: [2, 14] });
    if (sorte() < (area / 5000) * k) fx.naForma(tipo, g, z, 1, { altura: 14, forca: 0.3 });
  },
  runas(fx, p, _tipo, g, z, k, chave) {
    // O círculo acompanha a zona; runas sobem dele de vez em quando.
    const r = raioDe(g, 20);
    fx.manter(chave, 'circulo', z.x, z.y, r, p);
    const e = elipseNoChao(z.x, z.y, r);
    if (sorte() < (areaDaForma(g) / 6000) * k) fx.runa(p, e.x + entre(-0.7, 0.7) * e.rx, e.y + entre(-0.5, 0.5) * e.ry - 3, { vy: -10, vida: 1.1 });
  },
  aura(fx, p, tipo, g, z, k) {
    // Território: brasas na cor do elemento subindo e um pulso que corre o chão.
    const area = areaDaForma(g);
    if (sorte() < (area / 3000) * k) fx.naForma(tipo, g, z, 1, { altura: 4, forca: 0.4, jeito: 'brasa' });
    if (sorte() < k / 72) {
      const e = elipseNoChao(z.x, z.y, raioDe(g, 25));
      fx.arco(p, e.x, e.y, e.rx * 0.3, e.rx, { abertura: VOLTA, achatado: e.ry / Math.max(1, e.rx), vida: 0.8, chao: true });
    }
  },
};

// ---------- Receitas dos impactos ----------

export const IMPACTOS: Record<AnimacaoImpacto, ReceitaImpacto> = {
  chamusco(fx, p, tipo, x, y, k) {
    if (k === 0) {
      fx.labareda(p, x + entre(-4, 4), y + entre(2, 5), entre(5, 8), entre(3, 4), entre(0.3, 0.45));
      for (let i = 0; i < 2; i++) fx.bolha(p, x, y, entre(-30, 30), entre(-30, 10), 1, 2, entre(0.12, 0.2), { fumaca: false });
      return;
    }
    // Lampejo, chamas pegando no alvo, respingos de fogo, fumaça e brasas.
    fx.bolha(p, x, y, 0, 0, 3 + k, 1.5, 0.1, { fumaca: false });
    for (let i = 0; i < 1 + 2 * k; i++) fx.labareda(p, x + entre(-6, 6), y + entre(3, 7), entre(7, 11) + k * 2, entre(3, 5), entre(0.35, 0.6), i * 0.04);
    for (let i = 0; i < 4 + 3 * k; i++) {
      const a = sorte() * VOLTA;
      const v = entre(40, 80);
      fx.bolha(p, x, y, Math.cos(a) * v, Math.sin(a) * v * 0.8, 1, 2.5, entre(0.18, 0.3));
    }
    for (let i = 0; i <= k; i++) fx.baforada(x + entre(-4, 4), y - 4, { r0: 2, r1: entre(5, 7), vx: entre(-5, 5), vy: entre(-16, -10), vida: entre(0.8, 1.1), atraso: 0.15 });
    fx.explosao(tipo, x, y, 3 + 3 * k, 0.8);
  },
  lufada(fx, p, _tipo, x, y, k) {
    // Riscos que saem do ponto e se enrolam, e um anel de ar.
    const n = k === 0 ? 4 : 6 + 4 * k;
    for (let i = 0; i < n; i++) {
      const a = sorte() * VOLTA;
      fx.risco(p, x + Math.cos(a) * 2, y + Math.sin(a) * 2, a, entre(110, 170), entre(0.18, 0.3), { L: entre(4, 8), enrola: lado() * entre(10, 14) });
    }
    if (k > 0) {
      fx.arco(p, x, y, 2, 10 + 4 * k, { abertura: VOLTA, achatado: 0.8, tracos: 6, giro: 1, vida: 0.22 });
      fx.arco(p, x, y, 1, 6 + 2 * k, { abertura: VOLTA, achatado: 0.8, tracos: 4, giro: -1, vida: 0.18, atraso: 0.05 });
    }
  },
  respingo(fx, p, _tipo, x, y, k) {
    // Gotas que espirram do alvo, espuma e um anel de água.
    borrifo(fx, p, x, y, y + 12, 3 + 4 * k, 0.8);
    if (k === 0) return;
    for (let i = 0; i < 3 + k; i++) fx.bolha(p, x + entre(-3, 3), y, entre(-40, 40), entre(-60, -20), 2.5, 1, 0.3, { fumaca: false, gravidade: 220 });
    fx.arco(p, x, y, 2, 8 + 3 * k, { abertura: VOLTA, achatado: 0.6, vida: 0.25 });
  },
  geada(fx, p, tipo, x, y, k) {
    // Lampejo frio, lascas de gelo, névoa e flocos.
    if (k > 0) fx.bolha(p, x, y, 0, 0, 3 + k, 1, 0.1, { fumaca: false, gravidade: 0 });
    lascas(fx, p, x, y, y + 12, k === 0 ? 2 : 4 + 3 * k);
    for (let i = 0; i < k; i++) fx.baforada(x + entre(-4, 4), y, { r0: 2, r1: 6, vx: entre(-10, 10), vy: -6, vida: 0.7, cores: [p.clara, BRANCO] });
    fx.explosao(tipo, x, y, 2 + 3 * k, 0.6);
  },
  choque(fx, p, tipo, x, y, k) {
    // Raios curtos saindo do alvo, lampejo e faíscas.
    for (let i = 0; i < (k === 0 ? 1 : 3 + k); i++) {
      const a = sorte() * VOLTA;
      const L = entre(8, 14);
      fx.raio(tipo, { x, y }, { x: x + Math.cos(a) * L, y: y + Math.sin(a) * L }, 0.16);
    }
    if (k > 0) fx.bolha(p, x, y, 0, 0, 3 + k, 1, 0.1, { fumaca: false, gravidade: 0 });
    fx.explosao(tipo, x, y, 2 + 4 * k, 0.8);
  },
  pedrada(fx, p, _tipo, x, y, k) {
    // Pedras que saltam do alvo e poeira.
    for (let i = 0; i < (k === 0 ? 2 : 3 + 3 * k); i++) {
      fx.pedra(p, x, y, entre(-70, 70), entre(-100, -40), y + 12 + entre(-2, 2), { tam: k === 0 ? 1 : Math.round(entre(2, 3)), vida: 0.7 });
    }
    for (let i = 0; i < k; i++) fx.baforada(x + entre(-5, 5), y + 4, { r0: 2, r1: 6, vx: entre(-12, 12), vy: -6, vida: 0.7, cores: [p.media, p.clara] });
  },
  estilhacos(fx, p, tipo, x, y, k) {
    // Lascas de cristal voando, brilhos e um lampejo branco.
    lascas(fx, p, x, y, y + 12, k === 0 ? 2 : 5 + 4 * k, 1.2);
    if (k > 0) fx.bolha(p, x, y, 0, 0, 3, 1, 0.1, { fumaca: false, gravidade: 0 });
    for (let i = 0; i < 2 + 2 * k; i++) fx.particula(tipo, x, y, { jeito: 'estrela', forca: 1 });
  },
  folhas(fx, p, tipo, x, y, k) {
    for (let i = 0; i < (k === 0 ? 1 : 3 + 3 * k); i++) fx.folha(p, x, y, entre(-60, 60), entre(-70, -20), { tam: k === 2 ? 3 : 2, vida: entre(0.6, 0.9) });
    fx.explosao(tipo, x, y, 2 + 2 * k, 0.6);
  },
  estrelas(fx, p, tipo, x, y, k) {
    // Estrelas que se espalham, um anel de luz e uma runa subindo.
    for (let i = 0; i < 4 + 4 * k; i++) fx.particula(tipo, x, y, { jeito: 'estrela', forca: 1.4 });
    if (k === 0) return;
    fx.arco(p, x, y, 2, 9 + 3 * k, { abertura: VOLTA, achatado: 0.8, tracos: 8, giro: 1, vida: 0.25 });
    fx.runa(p, x, y - 6, { vy: -16, vida: 0.7 });
  },
  garras(fx, p, tipo, x, y, k) {
    // Três riscos de garra; o forte cruza com outros três.
    const ang = -0.7 + entre(-0.3, 0.3);
    fx.garra(p, x, y, ang, k === 0 ? 9 : 16 + 4 * k, 0.35);
    if (k === 2) fx.garra(p, x, y, ang + 1.3, 18, 0.35, 0.07);
    fx.explosao(tipo, x, y, 2 + 3 * k, 0.8);
  },
  mordida(fx, p, tipo, x, y, k) {
    if (k === 0) {
      IMPACTOS.garras(fx, p, tipo, x, y, 0);
      return;
    }
    fx.mordida(p, x, y, 0.45);
    fx.explosao(tipo, x, y, 3 + 3 * k, 0.8);
  },
};

// ---------- Receitas dos projéteis ----------

/** Raio na tela de cada projétil, a partir do raio dele no chão. */
const tamanhoDaBola = (raio: number) => limitar(raio * 0.8, 2.5, 9);
const tamanhoDaLua = (raio: number) => limitar(raio * 2, 6, 12);

/** Disco em camadas (contorno, corpo, miolo, núcleo) com o miolo puxado para a frente. */
function esfera(x: CanvasRenderingContext2D, p: Paleta, q: Ponto, ux: number, uy: number, R: number, nucleo = BRANCO): void {
  x.fillStyle = p.contorno;
  disco(x, q.x, q.y, R + 1, R + 1);
  x.fillStyle = p.media;
  disco(x, q.x, q.y, R, R);
  x.fillStyle = p.clara;
  disco(x, q.x + ux * R * 0.15, q.y + uy * R * 0.15, R * 0.65, R * 0.65);
  x.fillStyle = nucleo;
  disco(x, q.x + ux * R * 0.25, q.y + uy * R * 0.25 - R * 0.1, R * 0.3, R * 0.3);
}

export const PROJETEIS: Record<AnimacaoProjetil, ReceitaProjetil> = {
  'bola-de-fogo': {
    rastro(fx, p, tipo, q, ux, uy, raio, k) {
      const R = tamanhoDaBola(raio);
      for (let i = vezes(2.2 * k); i > 0; i--) {
        const v = entre(15, 35);
        fx.bolha(p, q.x - ux * R * 0.8 + entre(-1, 1), q.y - uy * R * 0.8 + entre(-1, 1), -ux * v + entre(-8, 8), -uy * v + entre(-12, 2), R * 0.55, R * 0.9, entre(0.16, 0.28));
      }
      if (sorte() < 0.25 * k) fx.particula(tipo, q.x, q.y, { forca: 0.4 });
    },
    desenhar(x, p, q, ux, uy, raio) {
      const R = tamanhoDaBola(raio);
      const tremor = sorte() * 0.8;
      // Cauda em gota; depois o corpo: contorno vermelho, laranja, miolo amarelo e a frente branca.
      for (const [k, cor] of [
        [2.1, p.escura],
        [1.5, p.media],
        [0.8, p.media],
      ] as const) {
        x.fillStyle = cor;
        disco(x, q.x - ux * R * k, q.y - uy * R * k, R * (1 - k * 0.3), R * (1 - k * 0.3));
      }
      x.fillStyle = p.contorno;
      disco(x, q.x, q.y, R + 1, R + 1);
      x.fillStyle = p.media;
      disco(x, q.x, q.y, R + tremor, R + tremor);
      x.fillStyle = p.clara;
      disco(x, q.x + ux * R * 0.15, q.y + uy * R * 0.15, R * 0.68, R * 0.68);
      x.fillStyle = p.quente;
      disco(x, q.x + ux * R * 0.25, q.y + uy * R * 0.25, R * 0.42, R * 0.42);
      x.fillStyle = BRANCO;
      x.fillRect(Math.round(q.x + ux * R * 0.3), Math.round(q.y + uy * R * 0.3), 1, 1);
    },
  },
  'meia-lua': {
    rastro(fx, p, _tipo, q, ux, uy, raio, k) {
      if (sorte() >= 0.5 * k) return;
      const desvio = entre(-1, 1) * tamanhoDaLua(raio);
      fx.risco(p, q.x - ux * 3 - uy * desvio, q.y - uy * 3 + ux * desvio, Math.atan2(-uy, -ux), 25, 0.16, { L: entre(3, 6) });
    },
    desenhar(x, p, q, ux, uy, raio) {
      // Arco com a barriga para a frente, mais grosso no meio, com contorno e riscos de velocidade atrás.
      const R = tamanhoDaLua(raio);
      const dir = Math.atan2(uy, ux);
      const cx = q.x - ux * R * 0.6;
      const cy = q.y - uy * R * 0.6;
      const n = Math.round(R * 3);
      const ponto = (a: number, r: number) => x.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
      x.fillStyle = p.contorno;
      for (let k = 0; k <= n; k++) ponto(dir - 1.15 + (2.3 * k) / n, R + 1);
      for (let k = 0; k <= n; k++) {
        const a = dir - 1.15 + (2.3 * k) / n;
        const meio = 1 - Math.abs(k / n - 0.5) * 2;
        x.fillStyle = p.quente;
        ponto(a, R);
        if (meio > 0.35) {
          x.fillStyle = p.clara;
          ponto(a, R - 1);
        }
        if (meio > 0.7) {
          x.fillStyle = p.media;
          ponto(a, R - 2);
        }
      }
      comAlfa(x, 0.6, () => {
        x.fillStyle = p.clara;
        for (const a of [dir - 0.9, dir, dir + 0.9]) {
          const px = cx + Math.cos(a) * R * 0.9;
          const py = cy + Math.sin(a) * R * 0.9;
          const L = a === dir ? 9 : 6;
          linha(x, { x: px - ux * 2, y: py - uy * 2 }, { x: px - ux * L, y: py - uy * L }, 1);
        }
      });
    },
  },
  gota: {
    rastro(fx, p, _tipo, q, ux, uy, _raio, k) {
      if (sorte() < 0.4 * k) fx.gota(p, q.x - ux * 4 + entre(-1, 1), q.y - uy * 4, -ux * 10, 0, q.y + entre(10, 16));
    },
    desenhar(x, p, q, ux, uy, raio) {
      // Gota deitada no voo: cauda afinando atrás, corpo redondo e o brilho na frente.
      const R = limitar(raio * 0.9, 2.5, 7);
      for (const [k, f] of [
        [1.6, 0.45],
        [0.9, 0.7],
      ] as const) {
        x.fillStyle = p.contorno;
        disco(x, q.x - ux * R * k, q.y - uy * R * k, R * f + 1, R * f + 1);
        x.fillStyle = p.media;
        disco(x, q.x - ux * R * k, q.y - uy * R * k, R * f, R * f);
      }
      esfera(x, p, q, ux, uy, R);
    },
  },
  bolha: {
    rastro(fx, _p, tipo, q, _ux, _uy, _raio, k) {
      if (sorte() < 0.15 * k) fx.particula(tipo, q.x, q.y, { forca: 0.2 });
    },
    desenhar(x, p, q, _ux, _uy, raio, t) {
      // Bolha de sabão: contorno claro que balança, véu translúcido e o reflexo em cima.
      const R = limitar(raio * 1.2, 3, 8) + Math.sin(t * 9 + q.x * 0.1) * 0.5;
      comAlfa(x, 0.3, () => {
        x.fillStyle = p.media;
        disco(x, q.x, q.y, R, R);
      });
      x.fillStyle = p.contorno;
      anel(x, q.x, q.y + 1, R, R, 1, 0);
      x.fillStyle = p.clara;
      anel(x, q.x, q.y, R, R, 1, 0);
      x.fillStyle = BRANCO;
      x.fillRect(Math.round(q.x - R * 0.45), Math.round(q.y - R * 0.55), 2, 1);
      x.fillRect(Math.round(q.x - R * 0.6), Math.round(q.y - R * 0.3), 1, 1);
    },
  },
  espinho: {
    rastro(fx, _p, tipo, q, _ux, _uy, _raio, k) {
      if (sorte() < 0.25 * k) fx.particula(tipo, q.x, q.y, { forca: 0.2 });
    },
    desenhar(x, p, q, ux, uy, raio) {
      // Losango comprido apontado para a frente: contorno, face clara de um lado, média do outro e a aresta.
      const R = limitar(raio * 1.1, 2.5, 6);
      const frente = R * 2;
      const tras = R * 1.4;
      const nx = -uy;
      const ny = ux;
      for (const camada of [0, 1]) {
        for (let s = -tras; s <= frente; s += 0.5) {
          const W = s > 0 ? R * (1 - s / frente) : R * (1 + s / tras);
          const cx = q.x + ux * s;
          const cy = q.y + uy * s;
          if (camada === 0) {
            x.fillStyle = p.contorno;
            for (let w = -W - 1; w <= W + 1; w += 0.7) x.fillRect(Math.round(cx + nx * w), Math.round(cy + ny * w), 1, 1);
            continue;
          }
          for (let w = -W; w <= W; w += 0.7) {
            x.fillStyle = Math.abs(w) < 0.5 ? p.quente : w < 0 ? p.clara : p.media;
            x.fillRect(Math.round(cx + nx * w), Math.round(cy + ny * w), 1, 1);
          }
        }
      }
    },
  },
  'esfera-eletrica': {
    rastro(fx, _p, tipo, q, _ux, _uy, _raio, k) {
      if (sorte() < 0.6 * k) fx.particula(tipo, q.x, q.y, { forca: 0.5 });
    },
    desenhar(x, p, q, ux, uy, raio, t) {
      // Orbe que pulsa, com um halo e arcos que estalam em volta (mudam a cada quadro).
      const R = limitar(raio, 3, 7) + Math.sin(t * 20) * 0.4;
      comAlfa(x, 0.4, () => trama(x, q.x, q.y, R + 3, R + 3, p.clara, Math.floor(t * 20)));
      esfera(x, p, q, ux * 0.3, uy * 0.3, R);
      for (let i = 0; i < 3; i++) {
        const a = sorte() * VOLTA;
        const L = R + entre(3, 6);
        const { pontos } = quebrado({ x: q.x + Math.cos(a) * R * 0.6, y: q.y + Math.sin(a) * R * 0.6 }, { x: q.x + Math.cos(a) * L, y: q.y + Math.sin(a) * L });
        x.fillStyle = i % 2 ? p.quente : BRANCO;
        for (let j = 1; j < pontos.length; j++) linha(x, pontos[j - 1]!, pontos[j]!, 1);
      }
    },
  },
  rocha: {
    rastro(fx, p, _tipo, q, _ux, _uy, raio, k) {
      const R = limitar(raio * 0.9, 3, 9);
      if (sorte() < 0.3 * k) fx.baforada(q.x + entre(-2, 2), q.y + R, { r0: 2, r1: 5, vx: 0, vy: -4, vida: 0.5, cores: [p.media, p.clara] });
      if (sorte() < 0.08 * k) fx.pedra(p, q.x, q.y + R - 1, entre(-30, 30), entre(-60, -30), q.y + R + 2, { tam: 1, vida: 0.5 });
    },
    desenhar(x, p, q, _ux, _uy, raio, t) {
      // Pedra que rola: contorno, corpo, brilho em cima e duas rachaduras girando.
      const R = limitar(raio * 0.9, 3, 9);
      x.fillStyle = p.contorno;
      disco(x, q.x, q.y, R + 1, R + 1);
      x.fillStyle = p.media;
      disco(x, q.x, q.y, R, R);
      x.fillStyle = p.clara;
      disco(x, q.x - R * 0.3, q.y - R * 0.35, R * 0.45, R * 0.4);
      x.fillStyle = p.escura;
      for (const d of [0, 2.2]) {
        const a = t * 8 + d;
        linha(x, { x: q.x + Math.cos(a) * R * 0.2, y: q.y + Math.sin(a) * R * 0.2 }, { x: q.x + Math.cos(a) * R * 0.8, y: q.y + Math.sin(a) * R * 0.8 }, 1);
      }
    },
  },
  'lamina-giratoria': {
    rastro(fx, _p, tipo, q, _ux, _uy, _raio, k) {
      if (sorte() < 0.2 * k) fx.particula(tipo, q.x, q.y, { jeito: 'estrela', forca: 0 });
    },
    desenhar(x, p, q, _ux, _uy, raio, t) {
      // Lâmina de quatro pontas curvas girando depressa.
      const R = limitar(raio * 1.6, 5, 10);
      const ang = t * 18;
      for (const camada of [0, 1]) {
        for (let b = 0; b < 4; b++) {
          const a0 = ang + (b * Math.PI) / 2;
          for (let s = 1; s <= R; s += 0.5) {
            const a = a0 + (s / R) * 0.6;
            const px = q.x + Math.cos(a) * s;
            const py = q.y + Math.sin(a) * s;
            if (camada === 0) {
              x.fillStyle = p.contorno;
              x.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
            } else {
              x.fillStyle = s > R - 1.5 ? p.quente : s < R * 0.5 ? p.clara : p.media;
              x.fillRect(Math.round(px), Math.round(py), 1, s < R * 0.6 ? 2 : 1);
            }
          }
        }
      }
      x.fillStyle = p.quente;
      x.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
    },
  },
  folha: {
    rastro(fx, p, tipo, q, ux, uy, _raio, k) {
      if (sorte() < 0.3 * k) fx.particula(tipo, q.x, q.y, { forca: 0.3 });
      if (sorte() < 0.05 * k) fx.folha(p, q.x - ux * 4, q.y - uy * 4, -ux * 20, -10, { tam: 1, vida: 0.6 });
    },
    desenhar(x, p, q, _ux, _uy, raio, t) {
      desenharFolhaEm(x, q.x, q.y, t * 14, limitar(raio * 1.2, 3, 6), p);
    },
  },
  orbe: {
    rastro(fx, _p, tipo, q, _ux, _uy, _raio, k) {
      if (sorte() < 0.5 * k) fx.particula(tipo, q.x, q.y, { forca: 0.2 });
    },
    desenhar(x, p, q, ux, uy, raio, t) {
      // Orbe com halo e três estrelinhas girando em volta.
      const R = limitar(raio * 0.9, 2.5, 6);
      comAlfa(x, 0.35, () => trama(x, q.x, q.y, R + 3, R + 3, p.media, Math.floor(t * 16)));
      esfera(x, p, q, ux, uy, R);
      for (let i = 0; i < 3; i++) {
        const a = t * 8 + (i * VOLTA) / 3;
        x.fillStyle = i % 2 ? p.quente : BRANCO;
        const px = Math.round(q.x + Math.cos(a) * (R + 3));
        const py = Math.round(q.y + Math.sin(a) * (R + 3) * 0.7);
        x.fillRect(px, py, 1, 1);
        x.fillRect(px - 1, py, 3, 1);
        x.fillRect(px, py - 1, 1, 3);
      }
    },
  },
};

// ---------- Receitas dos avanços ----------

export const AVANCOS: Record<AnimacaoAvanco, ReceitaAvanco> = {
  'rastro-de-fogo'(fx, p, _tipo, pe, h, ang, k) {
    for (let i = vezes(1.6 * k); i > 0; i--) fx.labareda(p, pe.x + entre(-4, 4), pe.y + entre(-2, 2), entre(6, 11), entre(3, 5), entre(0.3, 0.5));
    for (let i = vezes(1.2 * k); i > 0; i--) fx.bolha(p, pe.x + entre(-3, 3), pe.y - entre(3, h * 0.7), -Math.cos(ang) * 30, -Math.sin(ang) * 30 - 10, 1.5, 3, entre(0.2, 0.3));
  },
  velocidade(fx, p, _tipo, pe, h, ang, k) {
    // Linhas de velocidade que ficam para trás, na altura do corpo.
    for (let i = vezes(3 * k); i > 0; i--) {
      fx.risco(p, pe.x + entre(-4, 4), pe.y - entre(2, h), ang + Math.PI + entre(-0.1, 0.1), entre(40, 80), entre(0.2, 0.3), { L: entre(10, 18), grosso: sorte() < 0.3 });
    }
  },
};
