// Peças das animações dos elementos: labareda, baforada, bolha (de fogo ou de água), risco de vento, arco, mancha,
// clarão, gota, espinho (estaca ou cristal que brota do chão), pedra, rachadura, folha, vinha, runa, garra, mordida,
// traçado (prisma ou corrente) e os efeitos que acompanham uma zona (funil, anel e círculo de runas). Cada peça nasce,
// anda e se desenha sozinha, em pixels do cenário; as receitas (`receitas.ts`) combinam as peças em cada animação, e
// o `Fx` guarda, passa o tempo e desenha. É só apresentação: sorteia à vontade.

import type { Geometria, Ponto, Posicao } from '../nucleo';
import { projetar } from './arena';
import { BRANCO, comAlfa, disco, elipseNoChao, faixa, linha, trama } from './pixels';

/** Fumaça: corpo, brilho e o tom mais claro (paleta Sweetie 16). */
export const FUMACA = ['#566c86', '#94b0c2', '#f4f4f4'];

export const sorte = Math.random;
export const entre = (a: number, b: number) => a + sorte() * (b - a);

/**
 * Cores de um elemento (`fx.cores`): contorno, escura, média, clara e quente (a mais clara de todas). Com 5 tons, o
 * 1º é só do contorno; com 4 ou menos, o contorno usa o tom escuro.
 */
export interface Paleta {
  contorno: string;
  escura: string;
  media: string;
  clara: string;
  quente: string;
}

export function paleta(c: string[]): Paleta {
  if (c.length >= 5) return { contorno: c[0]!, escura: c[1]!, media: c[2]!, clara: c[3]!, quente: c[4]! };
  const ultima = c[c.length - 1]!;
  return { contorno: c[0]!, escura: c[0]!, media: c[1] ?? ultima, clara: c[2] ?? ultima, quente: c[3] ?? ultima };
}

/** Tempo de vida de uma peça: espera `atraso` (sem aparecer), depois vive `total` segundos. */
interface Vida {
  vida: number;
  total: number;
  atraso: number;
}

/** De 0 (acabou de nascer) a 1 (vai sumir). */
const idade = (v: Vida) => 1 - v.vida / v.total;

/** Passa o tempo de uma lista de peças, move as vivas e tira as que acabaram. */
export function passar<T extends Vida>(lista: T[], dt: number, mover?: (a: T, dt: number) => void): void {
  for (let i = lista.length - 1; i >= 0; i--) {
    const a = lista[i]!;
    if (a.atraso > 0) {
      a.atraso -= dt;
      continue;
    }
    if ((a.vida -= dt) <= 0) {
      lista.splice(i, 1);
      continue;
    }
    mover?.(a, dt);
  }
}

export const visivel = (v: Vida) => v.atraso <= 0;

// ---------- Labareda ----------

/** Língua de fogo com a base em (x, y): cresce, tremula, balança na ponta e se apaga. */
export interface Labareda extends Vida {
  x: number;
  y: number;
  h: number;
  w: number;
  fase: number;
  p: Paleta;
}

/** Uma linha de pixels de uma labareda: centro (com o balanço), altura na tela, meia largura e altura relativa. */
interface Fatia {
  cx: number;
  y: number;
  meia: number;
  rel: number;
}

/** As linhas de uma labareda neste instante: cresce, tremula, balança na ponta e se apaga. */
function fatiasDa(l: Labareda, t: number): { fatias: Fatia[]; quente: boolean; ponta: Ponto | null } {
  const q = idade(l);
  const cresce = Math.min(1, q / 0.15);
  const some = q > 0.6 ? (1 - q) / 0.4 : 1;
  const tremula = 0.85 + 0.15 * Math.sin(t * 21 + l.fase) * Math.cos(t * 13 + l.fase * 1.7);
  const H = Math.round(l.h * cresce * (0.35 + 0.65 * some) * tremula);
  const W = l.w * (0.6 + 0.4 * cresce) * (0.5 + 0.5 * some);
  const balanco = (r: number) => l.x + Math.sin(t * 9 + l.fase + r * 0.55) * (r / Math.max(1, H)) ** 2 * (0.8 + W * 0.35);
  const fatias: Fatia[] = [];
  for (let r = 0; r < H; r++) {
    const rel = r / H;
    // Gota de cabeça para baixo: larga um pouco acima da base, fina na ponta.
    const perfil = rel < 0.3 ? 0.75 + (rel / 0.3) * 0.25 : Math.pow((1 - rel) / 0.7, 0.8);
    fatias.push({ cx: balanco(r), y: l.y - r, meia: (W / 2) * perfil, rel });
  }
  // De vez em quando a ponta se solta: uma brasa acima da chama.
  const ponta = H > 2 && Math.sin(t * 6 + l.fase * 3) > 0.7 ? { x: balanco(H), y: l.y - H - 2 } : null;
  return { fatias, quente: some > 0.45, ponta };
}

/**
 * Labaredas em camadas: primeiro o contorno vermelho de todas, depois o corpo laranja, o miolo claro e o branco da
 * base. Assim as que se encostam viram um fogo só, em vez de várias velinhas.
 */
export function desenharLabaredas(x: CanvasRenderingContext2D, lista: Labareda[], t: number): void {
  const todas = lista.filter(visivel).map((l) => ({ l, ...fatiasDa(l, t) }));
  for (const { l, fatias } of todas) for (const f of fatias) faixa(x, f.cx, f.y, f.meia + 1, l.p.contorno);
  for (const { l, fatias } of todas) for (const f of fatias) faixa(x, f.cx, f.y, f.meia, f.rel < 0.6 ? l.p.media : l.p.escura);
  for (const { l, fatias, quente } of todas) {
    for (const f of fatias) if (f.rel < 0.75 && f.meia > 0.8) faixa(x, f.cx, f.y, f.meia * 0.55, f.rel < 0.4 && quente ? l.p.quente : l.p.clara);
  }
  for (const { fatias, quente } of todas) {
    if (quente) for (const f of fatias) if (f.rel < 0.18 && f.meia > 1.5) faixa(x, f.cx, f.y, f.meia * 0.2, BRANCO);
  }
  for (const { l, ponta } of todas) {
    if (!ponta) continue;
    x.fillStyle = l.p.escura;
    x.fillRect(Math.round(ponta.x), Math.round(ponta.y), 1, 1);
  }
}

// ---------- Baforada de fumaça ----------

export interface Baforada extends Vida {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r0: number;
  r1: number;
  cores: string[];
  fase: number;
}

export function moverBaforada(b: Baforada, dt: number): void {
  b.x += b.vx * dt + Math.sin(b.fase + b.vida * 3) * 0.15;
  b.y += b.vy * dt;
}

/** Baforada translúcida: borda em xadrez (que se desfaz), corpo e um brilho em cima; cresce e some. */
export function desenharBaforada(x: CanvasRenderingContext2D, b: Baforada, t: number): void {
  const q = idade(b);
  const r = b.r0 + (b.r1 - b.r0) * Math.sqrt(q);
  const nasce = Math.min(1, q / 0.12);
  comAlfa(x, nasce * (1 - q) * 0.55, () => {
    trama(x, b.x, b.y, r, r * 0.85, b.cores[0]!, Math.floor(t * 8 + b.fase));
    x.fillStyle = b.cores[0]!;
    disco(x, b.x, b.y, r * 0.7, r * 0.6);
    x.fillStyle = b.cores[1]!;
    disco(x, b.x - r * 0.25, b.y - r * 0.3, r * 0.4, r * 0.35);
  });
}

// ---------- Bolha de fogo (jato, rastro da bola de fogo) ----------

export interface Bolha extends Vida {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r0: number;
  r1: number;
  p: Paleta;
  /** Vira fumaça no fim. */
  fumaca: boolean;
  /** Aceleração vertical: negativa sobe (ar quente), positiva cai (água). */
  gravidade: number;
}

export function moverBolha(b: Bolha, dt: number): void {
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.vy += b.gravidade * dt;
}

/**
 * Bolhas em camadas, como as labaredas: contorno de todas, corpo, miolo e núcleo. Juntas, viram um jato só, quente
 * perto da boca (branco e amarelo) e mais frio na ponta, que termina em fumaça. Cada bolha se alonga numa gota no
 * sentido em que anda; a miúda não ganha contorno (senão vira mancha escura).
 */
export function desenharBolhas(x: CanvasRenderingContext2D, lista: Bolha[]): void {
  const vivas = lista.filter(visivel).map((b) => {
    const q = idade(b);
    // Cresce até metade da vida; depois afina, como a ponta de uma chama.
    const r = q < 0.5 ? b.r0 + (b.r1 - b.r0) * (q / 0.5) : b.r1 * (1 - ((q - 0.5) / 0.5) * 0.55);
    const v = Math.hypot(b.vx, b.vy);
    return { b, q, r, dx: v ? b.vx / v : 0, dy: v ? b.vy / v : 0, L: v > 20 ? Math.min(r * 1.6, v * 0.02) : 0, fumaca: b.fumaca && q > 0.75 };
  });
  type Viva = (typeof vivas)[number];
  /** O disco da bolha e a cauda afinando para trás. */
  const gota = (v: Viva, r: number, dy = 0) => {
    disco(x, v.b.x, v.b.y + dy, r, r);
    if (v.L < 1) return;
    const n = Math.min(3, Math.ceil(v.L / 2));
    for (let k = 1; k <= n; k++) {
      const s = k / n;
      const rr = r * (1 - 0.55 * s);
      disco(x, v.b.x - v.dx * v.L * s, v.b.y - v.dy * v.L * s + dy, rr, rr);
    }
  };
  for (const v of vivas) {
    if (!v.fumaca) continue;
    comAlfa(x, ((1 - v.q) / 0.25) * 0.45, () => {
      x.fillStyle = FUMACA[0]!;
      gota(v, v.r * 1.1);
    });
  }
  const fogo = vivas.filter((v) => !v.fumaca);
  for (const v of fogo) {
    if (v.r < 2) continue;
    x.fillStyle = v.r < 3 ? v.b.p.escura : v.b.p.contorno;
    gota(v, v.r + 1);
  }
  for (const v of fogo) {
    x.fillStyle = v.q < 0.55 ? v.b.p.media : v.b.p.escura;
    gota(v, v.r);
  }
  for (const v of fogo) {
    if (v.q >= 0.65 || v.r < 1.2) continue;
    x.fillStyle = v.q < 0.3 ? v.b.p.quente : v.b.p.clara;
    gota(v, v.r * 0.6, -v.r * 0.15);
  }
  for (const v of fogo) {
    if (v.q >= 0.22 || v.r < 1.5) continue;
    x.fillStyle = BRANCO;
    disco(x, v.b.x, v.b.y - v.r * 0.15, v.r * 0.3, v.r * 0.3);
  }
}

// ---------- Risco de vento ----------

/**
 * Risco de vento: a cabeça anda na direção `ang` e deixa uma cauda de `L` pixels. `gira` curva o caminho o tempo
 * todo; `enrola` curva só no fim, e a ponta se enrola num gancho (o vento de desenho animado).
 */
export interface Risco extends Vida {
  x: number;
  y: number;
  ang: number;
  v: number;
  gira: number;
  enrola: number;
  L: number;
  grosso: boolean;
  trilha: Ponto[];
  p: Paleta;
}

export function moverRisco(r: Risco, dt: number): void {
  const q = idade(r);
  r.ang += (r.gira + (q > 0.5 ? r.enrola * (q - 0.5) * 2 : 0)) * dt;
  const passo = r.v * dt;
  const n = Math.max(1, Math.ceil(passo));
  const ux = Math.cos(r.ang);
  const uy = Math.sin(r.ang);
  for (let k = 1; k <= n; k++) r.trilha.push({ x: r.x + (ux * passo * k) / n, y: r.y + (uy * passo * k) / n });
  r.x += ux * passo;
  r.y += uy * passo;
  if (r.trilha.length > r.L) r.trilha.splice(0, r.trilha.length - r.L);
}

/**
 * Risco de vento com sombra: embaixo de cada pixel, um da cor escura do elemento, para o vento aparecer até no chão
 * claro. A cabeça é da cor mais clara e grossa; a cauda afina, escurece e fica pontilhada.
 */
export function desenharRisco(x: CanvasRenderingContext2D, r: Risco): void {
  const q = idade(r);
  const alfa = q < 0.12 ? q / 0.12 : q > 0.7 ? (1 - q) / 0.3 : 1;
  const n = r.trilha.length;
  const grossura = (f: number) => (f < (r.grosso ? 0.6 : 0.35) ? 2 : 1);
  comAlfa(x, alfa * 0.8, () => {
    x.fillStyle = r.p.contorno;
    for (let k = 0; k < n; k++) {
      const f = k / n;
      if (f > 0.75 || (f > 0.55 && k % 2)) continue;
      const pt = r.trilha[n - 1 - k]!;
      x.fillRect(Math.round(pt.x), Math.round(pt.y) + grossura(f), 1, 1);
    }
  });
  comAlfa(x, alfa, () => {
    for (let k = 0; k < n; k++) {
      const f = k / n;
      if (f > 0.55 && k % 2) continue;
      const pt = r.trilha[n - 1 - k]!;
      x.fillStyle = f < 0.3 ? r.p.quente : f < 0.65 ? r.p.clara : r.p.media;
      x.fillRect(Math.round(pt.x), Math.round(pt.y), 1, grossura(f));
    }
  });
}

// ---------- Arco de vento ----------

/**
 * Arco que se abre de `r0` a `r1` em volta de (x, y), na direção `ang`; `achatado` < 1 deita o arco. `chao` desenha
 * por baixo das criaturas (ondulação, onda de choque); `varre` mantém o raio e corre de um lado ao outro (cauda que
 * varre); `grossura` em pixels.
 */
export interface Arco extends Vida {
  x: number;
  y: number;
  r0: number;
  r1: number;
  ang: number;
  abertura: number;
  achatado: number;
  /** Quantos traços (0 = contínuo); os traços giram `giro` voltas durante a vida. */
  tracos: number;
  giro: number;
  chao: boolean;
  varre: boolean;
  grossura: number;
  p: Paleta;
}

export function desenharArco(x: CanvasRenderingContext2D, a: Arco): void {
  const q = idade(a);
  const r = a.varre ? a.r1 : a.r0 + (a.r1 - a.r0) * (1 - (1 - q) * (1 - q));
  let de = a.ang - a.abertura / 2;
  let ate = a.ang + a.abertura / 2;
  if (a.varre) {
    // A cabeça corre o arco no começo da vida e deixa um rastro que encurta.
    ate = de + a.abertura * Math.min(1, q / 0.45);
    de = Math.max(de, ate - a.abertura * 0.7);
  }
  const vao = ate - de;
  const n = Math.max(8, Math.round(r * Math.max(0.3, vao)));
  const pontos: { x: number; y: number; dx: number; dy: number; s: number; meio: boolean }[] = [];
  for (let k = 0; k <= n; k++) {
    const s = k / n;
    if (a.tracos && Math.floor(s * a.tracos * 2 + a.giro * q * 2 + 100) % 2) continue;
    const ang = de + vao * s;
    pontos.push({ x: a.x + Math.cos(ang) * r, y: a.y + Math.sin(ang) * r * a.achatado, dx: Math.cos(ang), dy: Math.sin(ang) * a.achatado, s, meio: Math.abs(s - 0.5) < 0.3 });
  }
  const alfa = a.varre ? (q < 0.45 ? 1 : 1 - (q - 0.45) / 0.55) : 1 - q * q;
  // Sombra escura por fora, a linha clara e, no meio do arco enquanto é novo, mais grossura por dentro.
  comAlfa(x, alfa * 0.8, () => {
    x.fillStyle = a.p.contorno;
    for (const pt of pontos) x.fillRect(Math.round(pt.x + pt.dx), Math.round(pt.y + pt.dy) + 1, 1, 1);
  });
  comAlfa(x, alfa, () => {
    for (const pt of pontos) {
      const extra = q < 0.6 && (pt.meio || a.abertura > 6) ? 1 : 0;
      for (let g = 0; g < a.grossura + extra; g++) {
        if (a.varre) x.fillStyle = pt.s > 0.75 ? BRANCO : pt.s > 0.35 ? a.p.clara : a.p.media;
        else x.fillStyle = g === 0 && q < 0.3 ? BRANCO : a.p.clara;
        x.fillRect(Math.round(pt.x - pt.dx * g), Math.round(pt.y - pt.dy * g), 1, 1);
      }
    }
  });
}

// ---------- Mancha no chão (brilho do fogo que vira chão chamuscado) ----------

export interface Mancha extends Vida {
  x: number;
  y: number;
  rx: number;
  ry: number;
  p: Paleta;
}

export function desenharMancha(x: CanvasRenderingContext2D, m: Mancha, t: number): void {
  const q = idade(m);
  if (q < 0.45) comAlfa(x, 0.55 * (1 - q / 0.45), () => trama(x, m.x, m.y, m.rx, m.ry, m.p.clara, Math.floor(t * 20)));
  comAlfa(x, 0.4 * (1 - q), () => trama(x, m.x, m.y, m.rx * 0.8, m.ry * 0.8, q < 0.4 ? m.p.media : FUMACA[0]!, 1));
}

// ---------- Clarão ----------

/** Lampejo branco que estoura em volta de (x, y) e vira raios de luz até `r`. */
export interface Clarao extends Vida {
  x: number;
  y: number;
  r: number;
  p: Paleta;
}

export function desenharClarao(x: CanvasRenderingContext2D, c: Clarao): void {
  const q = idade(c);
  const cy = c.y - 8;
  if (q < 0.14) {
    comAlfa(x, 0.85, () => {
      x.fillStyle = BRANCO;
      const r = c.r * (0.25 + (q / 0.14) * 0.6);
      disco(x, c.x, cy, r, r * 0.75);
    });
  }
  const len = c.r * (0.35 + 0.85 * (1 - (1 - q) * (1 - q)));
  const solto = len * Math.max(0, q - 0.3) * 1.2;
  comAlfa(x, 1 - q, () => {
    x.fillStyle = q < 0.3 ? BRANCO : q < 0.6 ? c.p.quente : c.p.clara;
    for (let k = 0; k < 12; k++) {
      const ang = (k * Math.PI) / 6 + 0.13;
      const L = k % 2 ? len * 0.65 : len;
      const de = { x: c.x + Math.cos(ang) * solto, y: cy + Math.sin(ang) * solto * 0.75 };
      const ate = { x: c.x + Math.cos(ang) * L, y: cy + Math.sin(ang) * L * 0.75 };
      linha(x, de, ate, k % 2 === 0 && q < 0.4 ? 2 : 1);
    }
  });
}

// ---------- Efeitos que acompanham uma zona ----------

/**
 * Funil (redemoinho), anel (onda que cresce) ou círculo de runas que segue uma zona do campo: a cada quadro o jogo diz
 * onde ela está; quando para de dizer, o efeito some em 0,3 s.
 */
export interface Continuo {
  forma: 'funil' | 'anel' | 'circulo';
  /** Centro no chão e raio, em unidades do chão. */
  x: number;
  y: number;
  raio: number;
  /** Até quando (no relógio do Fx) continua sem ser renovado; depois, `some` conta o desaparecimento. */
  ate: number;
  some: number;
  fase: number;
  p: Paleta;
}

export const SUMIR = 0.3;

/** Funil que gira: anéis tracejados que alargam para cima, com a frente clara, balanço e cisco rodando. */
export function desenharFunil(x: CanvasRenderingContext2D, f: Continuo, t: number): void {
  const e = elipseNoChao(f.x, f.y, f.raio);
  const H = 30 + e.rx * 0.9;
  const alfa = 1 - f.some / SUMIR;
  const N = 10;
  const aneis = Array.from({ length: N }, (_, i) => {
    const s = i / (N - 1);
    return {
      s,
      r: e.rx * (0.18 + 0.82 * Math.pow(s, 1.2)),
      cx: e.x + Math.sin(t * 3 + f.fase + s * 2.5) * s * 4,
      cy: e.y - s * H,
      giro: t * (9 - s * 3) + i * 0.9 + f.fase,
    };
  });
  // Corpo: um véu claro em cada anel, que somado dá volume ao funil.
  comAlfa(x, alfa * 0.13, () => {
    x.fillStyle = f.p.clara;
    for (const a of aneis) disco(x, a.cx, a.cy, a.r, a.r * 0.32);
  });
  comAlfa(x, alfa, () => {
    for (const a of aneis) {
      const n = Math.max(10, Math.round(a.r * 2.6));
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2;
        // Três traços por anel, girando; a frente grossa e clara, com sombra; o fundo ralo.
        if (Math.floor(((ang + a.giro) / (Math.PI * 2)) * 6 + 600) % 2) continue;
        const frente = Math.sin(ang) > 0;
        if (!frente && k % 2) continue;
        const px = Math.round(a.cx + Math.cos(ang) * a.r);
        const py = Math.round(a.cy + Math.sin(ang) * a.r * 0.32);
        if (frente) {
          x.fillStyle = f.p.contorno;
          x.fillRect(px, py + 2, 1, 1);
          x.fillStyle = a.s > 0.35 ? BRANCO : f.p.clara;
          x.fillRect(px, py, 1, 2);
        } else {
          x.fillStyle = f.p.media;
          x.fillRect(px, py, 1, 1);
        }
      }
    }
  });
  comAlfa(x, alfa, () => {
    // Cisco subindo em espiral.
    for (let k = 0; k < 7; k++) {
      const a = t * 7 + k * 0.9 + f.fase;
      const s = (k * 0.143 + t * 0.6) % 1;
      const r = e.rx * (0.25 + 0.8 * s);
      x.fillStyle = k % 2 ? f.p.media : f.p.escura;
      x.fillRect(Math.round(e.x + Math.cos(a) * r), Math.round(e.y - s * H + Math.sin(a) * r * 0.32), 2, 1);
    }
  });
}

/** Base do funil, no chão: poeira levantada. */
export function desenharBaseDoFunil(x: CanvasRenderingContext2D, f: Continuo, t: number): void {
  const e = elipseNoChao(f.x, f.y, f.raio);
  comAlfa(x, 0.45 * (1 - f.some / SUMIR), () => trama(x, e.x, e.y, e.rx * 0.7, e.ry * 0.7, FUMACA[2]!, Math.floor(t * 12)));
}

/** Anel de vento no chão, do tamanho atual da zona: traços que giram, com um véu claro por dentro. */
export function desenharAnel(x: CanvasRenderingContext2D, f: Continuo, t: number): void {
  const e = elipseNoChao(f.x, f.y, f.raio);
  comAlfa(x, 1 - f.some / SUMIR, () => {
    comAlfa(x, 0.1, () => trama(x, e.x, e.y, e.rx, e.ry, f.p.clara, Math.floor(t * 10)));
    const n = Math.max(24, Math.round(Math.PI * (e.rx + e.ry)));
    for (let k = 0; k < n; k++) {
      const s = k / n;
      if (Math.floor(s * 20 + t * 4 + 200) % 2) continue;
      const ang = s * Math.PI * 2;
      const px = Math.round(e.x + Math.cos(ang) * e.rx);
      const py = Math.round(e.y + Math.sin(ang) * e.ry);
      x.fillStyle = f.p.contorno;
      x.fillRect(px, py + 1, 1, 1);
      x.fillStyle = Math.sin(ang) > 0 ? BRANCO : f.p.clara;
      x.fillRect(px, py - 1, 1, 2);
    }
  });
}

/** Círculo de runas no chão: dois anéis, marcas que giram entre eles, uma estrela de seis pontas e o brilho do centro. */
export function desenharCirculo(x: CanvasRenderingContext2D, f: Continuo, t: number): void {
  const e = elipseNoChao(f.x, f.y, f.raio);
  const ach = e.ry / Math.max(1, e.rx);
  const ponto = (ang: number, r: number) => ({ x: e.x + Math.cos(ang) * r, y: e.y + Math.sin(ang) * r * ach });
  comAlfa(x, 1 - f.some / SUMIR, () => {
    comAlfa(x, 0.2 + 0.08 * Math.sin(t * 5), () => trama(x, e.x, e.y, e.rx * 0.7, e.ry * 0.7, f.p.media, Math.floor(t * 6)));
    x.fillStyle = f.p.contorno;
    anelCheio(x, e.x, e.y + 1, e.rx, e.ry);
    x.fillStyle = f.p.clara;
    anelCheio(x, e.x, e.y, e.rx, e.ry);
    x.fillStyle = f.p.media;
    anelCheio(x, e.x, e.y, e.rx * 0.78, e.ry * 0.78);
    // Marcas entre os anéis, girando.
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6 + t * 0.8 + f.fase;
      const pt = ponto(a, e.rx * 0.89);
      x.fillStyle = k % 3 ? f.p.clara : f.p.quente;
      x.fillRect(Math.round(pt.x), Math.round(pt.y) - 1, 1, k % 3 ? 2 : 3);
    }
    // Estrela de seis pontas, girando ao contrário.
    x.fillStyle = f.p.clara;
    const pontas = Array.from({ length: 6 }, (_, k) => ponto((k * Math.PI) / 3 - t * 0.6 + f.fase, e.rx * 0.74));
    for (let k = 0; k < 6; k++) linha(x, pontas[k]!, pontas[(k + 2) % 6]!, 1);
  });
}

/** Contorno de elipse de 1 pixel, sem falhas. */
function anelCheio(x: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  const n = Math.max(24, Math.round(Math.PI * (rx + ry) * 1.2));
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    x.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
  }
}

// ---------- Gota ----------

/** Gota que cai até o chão (`chao`, na tela); lá, o `Fx` faz uma ondinha. */
export interface Gota extends Vida {
  x: number;
  y: number;
  vx: number;
  vy: number;
  chao: number;
  tam: number;
  p: Paleta;
}

export function moverGota(g: Gota, dt: number): void {
  g.vy += 320 * dt;
  g.x += g.vx * dt;
  g.y += g.vy * dt;
}

export function desenharGota(x: CanvasRenderingContext2D, g: Gota): void {
  const px = Math.round(g.x);
  const py = Math.round(g.y);
  // Corpo comprido na queda, brilho em cima e a base escura.
  x.fillStyle = g.p.escura;
  x.fillRect(px, py + g.tam, g.tam, 1);
  x.fillStyle = g.p.media;
  x.fillRect(px, py - g.tam, g.tam, g.tam * 2);
  x.fillStyle = g.p.quente;
  x.fillRect(px, py - g.tam, 1, 1);
}

// ---------- Espinho (estaca ou cristal que brota do chão) ----------

/** Espinho com a base em (x, y): sobe rápido, fica e afunda no fim. `incl` inclina a ponta (pixels por linha). */
export interface Espinho extends Vida {
  x: number;
  y: number;
  h: number;
  w: number;
  incl: number;
  p: Paleta;
}

function fatiasDoEspinho(e: Espinho): Fatia[] {
  const q = idade(e);
  const sobe = Math.min(1, q / 0.12);
  const desce = q > 0.75 ? (1 - q) / 0.25 : 1;
  const H = Math.round(e.h * sobe * desce);
  const fatias: Fatia[] = [];
  for (let r = 0; r < H; r++) fatias.push({ cx: e.x + e.incl * r, y: e.y - r, meia: (e.w / 2) * (1 - r / H), rel: r / H });
  return fatias;
}

/**
 * Espinhos em camadas: contorno de todos, a sombra no chão, depois as faces (a da esquerda iluminada, a da direita em
 * sombra) e a crista, que brilha perto da ponta. Os do mesmo grupo se juntam num maciço só.
 */
export function desenharEspinhos(x: CanvasRenderingContext2D, lista: Espinho[]): void {
  const todos = lista.filter(visivel).map((e) => ({ e, fatias: fatiasDoEspinho(e) }));
  for (const { e, fatias } of todos) {
    for (const f of fatias) faixa(x, f.cx, f.y, f.meia + 1, e.p.contorno);
    const topo = fatias.at(-1);
    if (topo) faixa(x, topo.cx, topo.y - 1, 0, e.p.contorno);
  }
  for (const { e, fatias } of todos) {
    const base = fatias[0];
    if (base) comAlfa(x, 0.45, () => faixa(x, base.cx, base.y + 1, Math.round(base.meia) + 2, e.p.contorno));
  }
  for (const { e, fatias } of todos) {
    for (const f of fatias) {
      const m = Math.round(f.meia);
      const cx = Math.round(f.cx);
      const y = Math.round(f.y);
      x.fillStyle = e.p.escura;
      x.fillRect(cx, y, m + 1, 1);
      x.fillStyle = e.p.media;
      x.fillRect(cx - m, y, m, 1);
      if (m >= 2) {
        x.fillStyle = e.p.clara;
        x.fillRect(cx - m, y, Math.ceil(m / 2), 1);
      }
      if (f.rel > 0.12) {
        x.fillStyle = f.rel > 0.7 ? e.p.quente : e.p.clara;
        x.fillRect(cx, y, 1, 1);
      }
    }
  }
}

// ---------- Pedra ----------

/** Pedra (ou lasca, ou granizo) que voa, cai, quica no chão (`chao`) e rola. */
export interface Pedra extends Vida {
  x: number;
  y: number;
  vx: number;
  vy: number;
  chao: number;
  tam: number;
  ang: number;
  giro: number;
  quica: number;
  p: Paleta;
}

export function moverPedra(r: Pedra, dt: number): void {
  r.vy += 380 * dt;
  r.x += r.vx * dt;
  r.y += r.vy * dt;
  r.ang += r.giro * dt;
  if (r.y >= r.chao && r.vy > 0) {
    r.y = r.chao;
    if (r.quica > 0) {
      r.vy = -r.vy * 0.4;
      r.vx *= 0.6;
      r.quica--;
    } else {
      r.vy = 0;
      r.vx *= 0.8;
      r.giro *= 0.8;
    }
  }
}

/** Pedra que capota: alterna entre quadrado e losango conforme gira, com contorno, corpo e um brilho em cima. */
export function desenharPedra(x: CanvasRenderingContext2D, r: Pedra): void {
  const q = idade(r);
  if (q > 0.85 && Math.floor(r.vida * 30) % 2) return;
  const t = r.tam;
  const cx = Math.round(r.x);
  const cy = Math.round(r.y);
  const losango = Math.floor((((r.ang % Math.PI) + Math.PI) % Math.PI) / (Math.PI / 4)) % 2 === 1;
  if (losango) {
    x.fillStyle = r.p.contorno;
    disco(x, cx, cy, t / 2 + 1, t / 2 + 1);
    x.fillStyle = r.p.media;
    disco(x, cx, cy, t / 2, t / 2);
  } else {
    x.fillStyle = r.p.contorno;
    x.fillRect(cx - Math.ceil(t / 2) - 1, cy - Math.ceil(t / 2) - 1, t + 2, t + 2);
    x.fillStyle = r.p.media;
    x.fillRect(cx - Math.ceil(t / 2), cy - Math.ceil(t / 2), t, t);
  }
  x.fillStyle = r.p.clara;
  x.fillRect(cx - Math.ceil(t / 2) + (losango ? 1 : 0), cy - Math.ceil(t / 2) + (losango ? 1 : 0), Math.max(1, Math.floor(t / 2)), 1);
}

// ---------- Rachadura ----------

/** Rachadura no chão: um caminho quebrado (e galhos) que se abre do começo ao fim e depois some. */
export interface Rachadura extends Vida {
  ramos: Ponto[][];
  p: Paleta;
}

/** Caminho quebrado de `de` na direção `ang`, com `comprimento` pixels, e um ou dois galhos curtos. */
export function caminhoRachado(de: Ponto, ang: number, comprimento: number): Ponto[][] {
  const tronco: Ponto[] = [{ ...de }];
  let a = ang;
  let andado = 0;
  while (andado < comprimento) {
    const passo = entre(3, 6);
    a = ang + entre(-0.6, 0.6);
    const u = tronco.at(-1)!;
    tronco.push({ x: u.x + Math.cos(a) * passo, y: u.y + Math.sin(a) * passo * 0.8 });
    andado += passo;
  }
  const ramos = [tronco];
  for (let k = 0; k < (comprimento > 14 ? 2 : 1); k++) {
    const i = 1 + Math.floor(sorte() * Math.max(1, tronco.length - 2));
    const base = tronco[i]!;
    const b = ang + (sorte() < 0.5 ? -1 : 1) * entre(0.6, 1.1);
    const L = comprimento * entre(0.2, 0.35);
    ramos.push([base, { x: base.x + Math.cos(b) * L * 0.5, y: base.y + Math.sin(b) * L * 0.4 }, { x: base.x + Math.cos(b + 0.3) * L, y: base.y + Math.sin(b + 0.3) * L * 0.8 }]);
  }
  return ramos;
}

export function desenharRachadura(x: CanvasRenderingContext2D, r: Rachadura): void {
  const q = idade(r);
  const abre = Math.min(1, q / 0.2);
  comAlfa(x, q > 0.7 ? (1 - q) / 0.3 : 1, () => {
    r.ramos.forEach((ramo, i) => {
      const n = Math.max(1, Math.round((ramo.length - 1) * (i === 0 ? abre : Math.max(0, abre * 2 - 1))));
      for (let k = 1; k <= n && k < ramo.length; k++) {
        // A fenda escura com a borda de cima clara (luz batendo na quina).
        x.fillStyle = r.p.clara;
        linha(x, { x: ramo[k - 1]!.x, y: ramo[k - 1]!.y - 1 }, { x: ramo[k]!.x, y: ramo[k]!.y - 1 }, 1);
        x.fillStyle = r.p.contorno;
        linha(x, ramo[k - 1]!, ramo[k]!, i === 0 ? 2 : 1);
      }
    });
  });
}

// ---------- Folha ----------

/** Folha que voa, gira e cai balançando. */
export interface Folha extends Vida {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  giro: number;
  tam: number;
  fase: number;
  p: Paleta;
}

export function moverFolha(f: Folha, dt: number): void {
  const arrasto = Math.pow(0.96, dt * 60);
  f.vx *= arrasto;
  f.vy = f.vy * arrasto + 30 * dt;
  f.x += f.vx * dt + Math.sin(f.fase + f.vida * 7) * 0.3;
  f.y += f.vy * dt;
  f.ang += f.giro * dt;
}

export function desenharFolha(x: CanvasRenderingContext2D, f: Folha): void {
  desenharFolhaEm(x, f.x, f.y, f.ang, f.tam, f.p);
}

/** Folha de `tam` pixels de meio comprimento, deitada no ângulo `ang`: contorno, corpo e a nervura clara. */
export function desenharFolhaEm(x: CanvasRenderingContext2D, cx: number, cy: number, ang: number, tam: number, p: Paleta): void {
  const ux = Math.cos(ang);
  const uy = Math.sin(ang) * 0.7;
  const nx = -uy;
  const ny = ux;
  for (const [cor, borda] of [
    [p.contorno, 1],
    [p.media, 0],
  ] as const) {
    x.fillStyle = cor;
    for (let k = -tam; k <= tam; k++) {
      const largura = Math.round((1 - Math.abs(k / tam)) * tam * 0.55) + borda;
      for (let w = -largura; w <= largura; w++) x.fillRect(Math.round(cx + ux * k + nx * w * 0.8), Math.round(cy + uy * k + ny * w * 0.8), 1, 1);
    }
  }
  x.fillStyle = p.clara;
  for (let k = -tam + 1; k < tam; k++) x.fillRect(Math.round(cx + ux * k), Math.round(cy + uy * k), 1, 1);
}

// ---------- Vinha ----------

/** Vinha (ou raiz) que cresce ao longo de `pontos`, fica e se recolhe; com folhas nos `folhas` (índices). */
export interface Vinha extends Vida {
  pontos: Ponto[];
  grossura: number;
  folhas: number[];
  p: Paleta;
}

/** Vinhas em camadas: contorno de todas, depois o corpo, o brilho e as folhas (as que se cruzam viram um emaranhado). */
export function desenharVinhas(x: CanvasRenderingContext2D, lista: Vinha[]): void {
  const vivas = lista.filter(visivel).map((v) => {
    const q = idade(v);
    const f = q < 0.25 ? q / 0.25 : q > 0.75 ? (1 - q) / 0.25 : 1;
    return { v, n: Math.round(v.pontos.length * f) };
  });
  for (const { v, n } of vivas) {
    x.fillStyle = v.p.contorno;
    for (let i = 0; i < n; i++) disco(x, v.pontos[i]!.x, v.pontos[i]!.y, v.grossura / 2 + 1, v.grossura / 2 + 1);
  }
  for (const { v, n } of vivas) {
    for (let i = 0; i < n; i++) {
      const pt = v.pontos[i]!;
      x.fillStyle = v.p.media;
      disco(x, pt.x, pt.y, v.grossura / 2, v.grossura / 2);
      x.fillStyle = v.p.clara;
      x.fillRect(Math.round(pt.x), Math.round(pt.y - v.grossura / 2), 1, 1);
    }
  }
  for (const { v, n } of vivas) {
    for (const i of v.folhas) {
      if (i >= n || i < 1) continue;
      const a = v.pontos[i - 1]!;
      const b = v.pontos[i]!;
      const ang = Math.atan2(b.y - a.y, b.x - a.x) + (i % 2 ? 1 : -1) * 1.1;
      desenharFolhaEm(x, b.x + Math.cos(ang) * 3, b.y + Math.sin(ang) * 3, ang, 2, v.p);
    }
  }
}

// ---------- Runa ----------

/** Glifos de 5 × 5: "1" acende o pixel. */
const GLIFOS = [
  ['00100', '01110', '10101', '00100', '00100'],
  ['10001', '01010', '00100', '01010', '10001'],
  ['10100', '11000', '10100', '10010', '10001'],
  ['01110', '10001', '10101', '10001', '01110'],
  ['00100', '01010', '10001', '01010', '00100'],
  ['11011', '00100', '01110', '00100', '11011'],
  ['11110', '10000', '11100', '10000', '10000'],
];

/** Runa que aparece, sobe devagar e some. */
export interface Runa extends Vida {
  x: number;
  y: number;
  vy: number;
  glifo: number;
  p: Paleta;
}

export function moverRuna(r: Runa, dt: number): void {
  r.y += r.vy * dt;
}

export function desenharRuna(x: CanvasRenderingContext2D, r: Runa): void {
  const q = idade(r);
  const g = GLIFOS[r.glifo % GLIFOS.length]!;
  const ox = Math.round(r.x) - 2;
  const oy = Math.round(r.y) - 2;
  comAlfa(x, q < 0.15 ? q / 0.15 : q > 0.6 ? (1 - q) / 0.4 : 1, () => {
    for (const [cor, d] of [
      [r.p.contorno, 1],
      [q < 0.3 ? BRANCO : r.p.clara, 0],
    ] as const) {
      x.fillStyle = cor;
      g.forEach((linhaG, j) => {
        for (let i = 0; i < 5; i++) if (linhaG[i] === '1') x.fillRect(ox + i, oy + j + d, 1, 1);
      });
    }
  });
}

// ---------- Garra e mordida ----------

/** Três riscos de garra paralelos que rasgam o ar em (x, y), na direção `ang`. */
export interface Garra extends Vida {
  x: number;
  y: number;
  ang: number;
  L: number;
  p: Paleta;
}

export function desenharGarra(x: CanvasRenderingContext2D, g: Garra): void {
  const q = idade(g);
  const corta = Math.min(1, q / 0.2);
  const ux = Math.cos(g.ang);
  const uy = Math.sin(g.ang);
  comAlfa(x, q < 0.5 ? 1 : (1 - q) / 0.5, () => {
    for (const lado of [-4, 0, 4]) {
      const L = g.L * (lado === 0 ? 1 : 0.8);
      const de = -L / 2;
      const ate = de + L * corta;
      // Um risco levemente curvo: sombra, contorno no tom médio e o miolo claro, mais grosso no meio.
      const n = Math.max(2, Math.round(ate - de));
      for (const [cor, larg, dy] of [
        [g.p.contorno, 3, 1],
        [g.p.media, 3, 0],
        [q < 0.3 ? BRANCO : g.p.clara, 1, 0],
      ] as const) {
        x.fillStyle = cor;
        for (let k = 0; k <= n; k++) {
          const s = de + ((ate - de) * k) / n;
          const curva = (1 - (s / (L / 2)) ** 2) * 2.5;
          const meio = 1 - Math.abs(s / (L / 2));
          const w = Math.max(1, Math.round(larg * meio));
          const px = g.x + ux * s - uy * (lado + curva);
          const py = g.y + uy * s + ux * (lado + curva) + dy;
          x.fillRect(Math.round(px - (w - 1) / 2), Math.round(py), w, 1);
        }
      }
    }
  });
}

/** Mordida: duas fileiras de presas que se fecham em (x, y). */
export interface Mordida extends Vida {
  x: number;
  y: number;
  p: Paleta;
}

export function desenharMordida(x: CanvasRenderingContext2D, m: Mordida): void {
  const q = idade(m);
  const fecha = Math.min(1, q / 0.3);
  const vao = 11 * (1 - fecha * fecha);
  comAlfa(x, q < 0.55 ? 1 : (1 - q) / 0.45, () => {
    for (const dir of [-1, 1]) {
      const base = m.y + dir * (vao + 5);
      // Gengiva e quatro presas apontando para o meio.
      x.fillStyle = m.p.contorno;
      x.fillRect(Math.round(m.x - 9), Math.round(base) - (dir < 0 ? 1 : 0), 19, 2);
      x.fillStyle = m.p.media;
      x.fillRect(Math.round(m.x - 8), Math.round(base) - (dir < 0 ? 1 : 0), 17, 1);
      for (const ox of [-6, -2, 2, 6]) {
        for (let r = 0; r < 5; r++) {
          const meia = Math.round((1 - r / 5) * 1.5);
          const y = Math.round(base - dir * (r + 1));
          x.fillStyle = m.p.contorno;
          x.fillRect(Math.round(m.x + ox) - meia - 1, y, meia * 2 + 3, 1);
          x.fillStyle = r < 2 ? '#d6dfe8' : BRANCO;
          x.fillRect(Math.round(m.x + ox) - meia, y, meia * 2 + 1, 1);
        }
      }
    }
    if (q > 0.28 && q < 0.42) {
      x.fillStyle = BRANCO;
      disco(x, m.x, m.y, 3, 2);
    }
  });
}

// ---------- Traçado: prisma e corrente ----------

/** As cores do arco-íris do prisma (paleta Sweetie 16). */
const ARCO_IRIS = ['#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#41a6f6', '#3b5dc9'];

/** Traçado de `a` até `b` que se estende rápido: luz que se abre em arco-íris (prisma) ou elos de uma corrente. */
export interface Tracado extends Vida {
  a: Ponto;
  b: Ponto;
  forma: 'prisma' | 'corrente';
  p: Paleta;
}

export function desenharTracado(x: CanvasRenderingContext2D, f: Tracado, t: number): void {
  const q = idade(f);
  const estende = Math.min(1, q / 0.15);
  const dx = f.b.x - f.a.x;
  const dy = f.b.y - f.a.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const L = d * estende;
  if (f.forma === 'prisma') {
    // O branco no meio se abre nas cores, mais largas para a ponta, com um brilho que corre.
    comAlfa(x, q > 0.6 ? (1 - q) / 0.4 : 1, () => {
      const n = Math.max(2, Math.round(L));
      for (let k = 0; k <= n; k++) {
        const s = k / n;
        const px = f.a.x + ux * L * s;
        const py = f.a.y + uy * L * s;
        const abre = 0.5 + s * 1.2;
        ARCO_IRIS.forEach((cor, i) => {
          const off = (i - (ARCO_IRIS.length - 1) / 2) * abre;
          x.fillStyle = cor;
          x.fillRect(Math.round(px - uy * off), Math.round(py + ux * off), 1, 1);
        });
        x.fillStyle = Math.floor(s * 12 - t * 20) % 4 === 0 ? f.p.quente : BRANCO;
        x.fillRect(Math.round(px), Math.round(py), 1, 1);
      }
    });
    return;
  }
  // Corrente: elos que alternam de pé e deitados, com contorno e brilho.
  comAlfa(x, q > 0.75 ? (1 - q) / 0.25 : 1, () => {
    for (let s = 0; s <= L; s += 4) {
      const px = f.a.x + ux * s;
      const py = f.a.y + uy * s;
      const deitado = Math.round(s / 4) % 2 === 0;
      const rx = deitado ? 2.5 : 1.2;
      const ry = deitado ? 1.4 : 2.2;
      x.fillStyle = f.p.contorno;
      disco(x, px, py, rx + 1, ry + 1);
      x.fillStyle = f.p.clara;
      disco(x, px, py, rx, ry);
      x.fillStyle = f.p.contorno;
      x.fillRect(Math.round(px), Math.round(py), 1, 1);
      x.fillStyle = f.p.quente;
      x.fillRect(Math.round(px - rx / 2), Math.round(py - ry / 2), 1, 1);
    }
  });
}

// ---------- Geometria das animações ----------

/** Direção de uma forma (ou de qualquer posição com ux, uy) na tela, em radianos. */
export function anguloNaTela(z: Posicao): number {
  const a = projetar(z.x, z.y);
  const b = projetar(z.x + z.ux * 10, z.y + z.uy * 10);
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Área de uma forma no chão (unidades²). */
export function areaDaForma(g: Geometria): number {
  switch (g.forma) {
    case 'area':
      return Math.PI * g.raio * g.raio;
    case 'cone':
      return (Math.PI * g.alcance * g.alcance * g.angulo) / 360;
    case 'linha':
      return g.alcance * g.largura;
    case 'parede':
      return g.largura * g.espessura;
  }
}

/** Pontos de um raio quebrado de `a` até `b`, e dois galhos curtos saindo do meio. */
export function quebrado(a: Ponto, b: Ponto): { pontos: Ponto[]; galhos: Ponto[][] } {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const n = Math.max(3, Math.round(d / 7));
  const nx = -(b.y - a.y) / d;
  const ny = (b.x - a.x) / d;
  const pontos = Array.from({ length: n + 1 }, (_, i) => {
    const f = i / n;
    const desvio = i === 0 || i === n ? 0 : (sorte() * 2 - 1) * 4;
    return { x: a.x + (b.x - a.x) * f + nx * desvio, y: a.y + (b.y - a.y) * f + ny * desvio };
  });
  const galhos = [0, 1].map(() => {
    const de = pontos[1 + Math.floor(sorte() * (n - 1))]!;
    const lado = sorte() < 0.5 ? -1 : 1;
    const comprimento = 6 + sorte() * 8;
    return [de, { x: de.x + (nx * lado + (b.x - a.x) / d) * comprimento * 0.5, y: de.y + (ny * lado + (b.y - a.y) / d) * comprimento * 0.5 }, { x: de.x + nx * lado * comprimento, y: de.y + ny * lado * comprimento + 2 }];
  });
  return { pontos, galhos };
}
