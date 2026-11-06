// Formas dos golpes pintadas no chão: a marca durante a conjuração, as zonas que
// duram, os terrenos e as névoas, e o clarão das formas instantâneas. Cada pixel do
// cenário é desprojetado para o chão e testado com a mesma geometria do motor, então
// o que aparece é exatamente onde o golpe acerta (a borda não conta o corpo de quem é atingido).

import { acertaForma, type Geometria, type Ponto, type Posicao } from '../nucleo';
import { desprojetar, projetar } from './arena';

/**
 * Pixels do cenário cobertos pela forma, em pares x, y: o miolo e a borda, e a borda separada em topo (sem vizinho
 * em cima), base (sem vizinho embaixo) e lados.
 */
interface Mascara {
  miolo: number[];
  borda: number[];
  topo: number[];
  base: number[];
  lado: number[];
}

const cache = new Map<string, Mascara>();

function chaveDe(g: Geometria, z: Posicao): string {
  const tam = g.forma === 'area' ? g.raio : g.forma === 'cone' ? `${g.alcance}/${g.angulo}` : g.forma === 'linha' ? `${g.alcance}/${g.largura}` : `${g.largura}/${g.espessura}`;
  return `${g.forma}:${tam}|${z.x.toFixed(1)},${z.y.toFixed(1)},${z.ux.toFixed(3)},${z.uy.toFixed(3)}`;
}

/**
 * Ponto dentro da forma; com `arredondado`, a linha e a parede perdem as quinas (raio de até 6), como um campo
 * pintado no chão. O resto das formas não muda.
 */
function dentro(g: Geometria, z: Posicao, p: Ponto, arredondado: boolean): boolean {
  if (!acertaForma(g, z, p, 0)) return false;
  if (!arredondado || (g.forma !== 'linha' && g.forma !== 'parede')) return true;
  const dx = p.x - z.x;
  const dy = p.y - z.y;
  let ao = dx * z.ux + dy * z.uy;
  const deLado = Math.abs(dx * z.uy - dy * z.ux);
  const meiaLargura = g.largura / 2;
  let meioComprimento: number;
  if (g.forma === 'linha') {
    meioComprimento = g.alcance / 2;
    ao -= meioComprimento;
  } else meioComprimento = g.espessura / 2;
  const r = Math.min(meioComprimento, meiaLargura, 6);
  const a = Math.abs(ao) - (meioComprimento - r);
  const b = deLado - (meiaLargura - r);
  return a <= 0 || b <= 0 || a * a + b * b <= r * r;
}

function mascara(g: Geometria, z: Posicao, arredondado = false): Mascara {
  const chave = chaveDe(g, z) + (arredondado ? 'R' : '');
  const pronta = cache.get(chave);
  if (pronta) return pronta;
  if (cache.size > 160) cache.clear();

  const cantos = caixa(g, z).map((p) => projetar(p.x, p.y));
  const x0 = Math.floor(Math.min(...cantos.map((p) => p.x))) - 1;
  const x1 = Math.ceil(Math.max(...cantos.map((p) => p.x))) + 1;
  const y0 = Math.floor(Math.min(...cantos.map((p) => p.y))) - 1;
  const y1 = Math.ceil(Math.max(...cantos.map((p) => p.y))) + 1;
  const L = x1 - x0 + 1;
  const cobre = new Uint8Array(L * (y1 - y0 + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (dentro(g, z, desprojetar(x + 0.5, y + 0.5), arredondado)) cobre[(y - y0) * L + (x - x0)] = 1;
    }
  }
  const m: Mascara = { miolo: [], borda: [], topo: [], base: [], lado: [] };
  const em = (x: number, y: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && cobre[(y - y0) * L + (x - x0)] === 1;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!em(x, y)) continue;
      if (em(x - 1, y) && em(x + 1, y) && em(x, y - 1) && em(x, y + 1)) {
        m.miolo.push(x, y);
        continue;
      }
      m.borda.push(x, y);
      (!em(x, y - 1) ? m.topo : !em(x, y + 1) ? m.base : m.lado).push(x, y);
    }
  }
  cache.set(chave, m);
  return m;
}

/** Retângulo no chão que contém a forma. */
function caixa(g: Geometria, z: Posicao): Ponto[] {
  let x0: number, x1: number, y0: number, y1: number;
  if (g.forma === 'linha') {
    const fx = z.x + z.ux * g.alcance;
    const fy = z.y + z.uy * g.alcance;
    const m = g.largura / 2;
    [x0, x1, y0, y1] = [Math.min(z.x, fx) - m, Math.max(z.x, fx) + m, Math.min(z.y, fy) - m, Math.max(z.y, fy) + m];
  } else {
    const r = g.forma === 'area' ? g.raio : g.forma === 'cone' ? g.alcance : Math.hypot(g.largura, g.espessura) / 2;
    [x0, x1, y0, y1] = [z.x - r, z.x + r, z.y - r, z.y + r];
  }
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x0, y: y1 },
    { x: x1, y: y1 },
  ];
}

export interface EstiloForma {
  /** Cor do miolo e da borda (sem borda, a do miolo). */
  miolo: string;
  borda?: string;
  /** Trama do miolo: 0 nenhum, 2 xadrez, 4 um pixel a cada quatro. */
  trama: 0 | 2 | 4;
  alfa: number;
  /** Borda pontilhada (com deslocamento, para animar) em vez de cheia. */
  pontilhado?: number;
  /** Sem a sombra escura embaixo da borda (névoa, que flutua). */
  semSombra?: boolean;
  /** Tinta sólida do miolo por baixo de tudo, com essa opacidade. */
  tinta?: number;
  /** Quinas arredondadas na linha e na parede (campo pintado no chão). */
  arredondado?: boolean;
  /** Borda de campo nas cores do elemento: a de cima clara, as dos lados no tom médio, a de baixo no contorno. */
  campo?: { contorno: string; media: string; clara: string };
}

/** Pinta a forma no chão. O contexto já está no espaço do cenário (a câmera aplicada). */
export function desenharForma(x: CanvasRenderingContext2D, g: Geometria, z: Posicao, e: EstiloForma): void {
  const m = mascara(g, z, e.arredondado);
  const alfa = x.globalAlpha;
  if (e.tinta) {
    x.globalAlpha = alfa * e.tinta;
    x.fillStyle = e.miolo;
    for (const pixels of [m.miolo, m.borda]) for (let i = 0; i < pixels.length; i += 2) x.fillRect(pixels[i]!, pixels[i + 1]!, 1, 1);
  }
  if (e.trama) {
    x.globalAlpha = alfa * e.alfa;
    x.fillStyle = e.miolo;
    for (let i = 0; i < m.miolo.length; i += 2) {
      const px = m.miolo[i]!;
      const py = m.miolo[i + 1]!;
      const pinta = e.trama === 2 ? (px + py) % 2 === 0 : px % 2 === 0 && py % 2 === 0;
      if (pinta) x.fillRect(px, py, 1, 1);
    }
  }
  // Borda com sombra escura de 1 px embaixo, para aparecer em qualquer chão (a areia engole as cores quentes).
  const visivel = (px: number, py: number) => e.pontilhado === undefined || (px + py + e.pontilhado) % 3 !== 0;
  if (e.campo) {
    // Campo: a borda pega luz em cima e sombra embaixo, sem a sombra de caixa de seleção.
    x.globalAlpha = alfa * Math.min(1, e.alfa + 0.45);
    for (const [pixels, cor] of [
      [m.lado, e.campo.media],
      [m.topo, e.campo.clara],
      [m.base, e.campo.contorno],
    ] as const) {
      x.fillStyle = cor;
      for (let i = 0; i < pixels.length; i += 2) if (visivel(pixels[i]!, pixels[i + 1]!)) x.fillRect(pixels[i]!, pixels[i + 1]!, 1, 1);
    }
    x.globalAlpha = alfa;
    return;
  }
  if (!e.semSombra) {
    x.globalAlpha = alfa * Math.min(1, e.alfa + 0.1);
    x.fillStyle = '#1a1c2c';
    for (let i = 0; i < m.borda.length; i += 2) if (visivel(m.borda[i]!, m.borda[i + 1]!)) x.fillRect(m.borda[i]!, m.borda[i + 1]! + 1, 1, 1);
  }
  x.globalAlpha = alfa * Math.min(1, e.alfa + 0.4);
  x.fillStyle = e.borda ?? e.miolo;
  for (let i = 0; i < m.borda.length; i += 2) if (visivel(m.borda[i]!, m.borda[i + 1]!)) x.fillRect(m.borda[i]!, m.borda[i + 1]!, 1, 1);
  x.globalAlpha = alfa;
}

/** Contorno da forma no chão, para desenhar com caminho (o visualizador de depuração, sem perspectiva). */
export function contornoDaForma(g: Geometria, z: Posicao, n = 32): Ponto[] {
  if (g.forma === 'area') {
    return Array.from({ length: n }, (_, i) => ({ x: z.x + Math.cos((i / n) * Math.PI * 2) * g.raio, y: z.y + Math.sin((i / n) * Math.PI * 2) * g.raio }));
  }
  const base = Math.atan2(z.uy, z.ux);
  if (g.forma === 'cone') {
    const meio = (g.angulo * Math.PI) / 360;
    const arco = Array.from({ length: n + 1 }, (_, i) => {
      const a = base - meio + (2 * meio * i) / n;
      return { x: z.x + Math.cos(a) * g.alcance, y: z.y + Math.sin(a) * g.alcance };
    });
    return g.angulo >= 360 ? arco : [{ x: z.x, y: z.y }, ...arco];
  }
  // Linha: de lado = largura, para a frente = alcance. Parede: centrada, espessura para a frente.
  const [lado, frente0, frente1] = g.forma === 'linha' ? [g.largura / 2, 0, g.alcance] : [g.largura / 2, -g.espessura / 2, g.espessura / 2];
  const nx = -z.uy * lado;
  const ny = z.ux * lado;
  const p = (f: number, s: number) => ({ x: z.x + z.ux * f + nx * s, y: z.y + z.uy * f + ny * s });
  return [p(frente0, 1), p(frente1, 1), p(frente1, -1), p(frente0, -1)];
}
