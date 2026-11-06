// Primitivas de pixel dos efeitos especiais: elipse cheia, em xadrez e em contorno, cruz, linha e transparência.
// Tudo em coordenadas do cenário, arredondado para o pixel.

import type { Ponto } from '../nucleo';
import { projetar } from './arena';

export const BRANCO = '#f4f4f4';

/** Centro e raios no cenário de um círculo de raio `r` no chão (em perspectiva, vira elipse). */
export function elipseNoChao(x: number, y: number, r: number): { x: number; y: number; rx: number; ry: number } {
  const c = projetar(x, y);
  return { x: c.x, y: c.y, rx: Math.abs(projetar(x + r, y).x - c.x), ry: Math.abs(projetar(x, y + r).y - c.y) };
}

export function comAlfa(x: CanvasRenderingContext2D, alfa: number, desenho: () => void): void {
  const antes = x.globalAlpha;
  x.globalAlpha = antes * Math.max(0, Math.min(1, alfa));
  desenho();
  x.globalAlpha = antes;
}

/** Elipse cheia, em faixas de 1 pixel. */
export function disco(x: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  const r = Math.max(0.5, ry);
  for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
    const meia = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / r) ** 2)));
    x.fillRect(Math.round(cx) - meia, Math.round(cy) + dy, meia * 2 + 1, 1);
  }
}

/** Elipse em xadrez (halo, clarão, fumaça). */
export function trama(x: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, cor: string, fase: number): void {
  x.fillStyle = cor;
  const r = Math.max(0.5, ry);
  const ox = Math.round(cx);
  const oy = Math.round(cy);
  for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
    const meia = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / r) ** 2)));
    for (let dx = -meia; dx <= meia; dx++) if ((dx + dy + fase) % 2 === 0) x.fillRect(ox + dx, oy + dy, 1, 1);
  }
}

/** Contorno de elipse, com `esp` pixels; `pontilhado` pula pixels (de tantos em tantos). */
export function anel(x: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, esp: number, pontilhado: number): void {
  const n = Math.max(16, Math.round(Math.PI * (rx + ry)));
  for (let k = 0; k < n; k++) {
    if (pontilhado && k % pontilhado) continue;
    const a = (k / n) * Math.PI * 2;
    x.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
    if (esp > 1) x.fillRect(Math.round(cx + Math.cos(a) * (rx - 1)), Math.round(cy + Math.sin(a) * (ry - 1)), 1, 1);
  }
}

/** Faísca em cruz: o centro e, quando `grande`, os quatro braços. */
export function cruz(x: CanvasRenderingContext2D, cx: number, cy: number, cor: string, grande: boolean): void {
  x.fillStyle = cor;
  const px = Math.round(cx);
  const py = Math.round(cy);
  x.fillRect(px, py, 1, 1);
  if (!grande) return;
  x.fillRect(px - 1, py, 1, 1);
  x.fillRect(px + 1, py, 1, 1);
  x.fillRect(px, py - 1, 1, 1);
  x.fillRect(px, py + 1, 1, 1);
}

/** Linha de pixels entre dois pontos do cenário, com `esp` de grossura. */
export function linha(x: CanvasRenderingContext2D, a: Ponto, b: Ponto, esp: number): void {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))));
  const o = Math.floor(esp / 2);
  for (let k = 0; k <= n; k++) x.fillRect(Math.round(a.x + ((b.x - a.x) * k) / n) - o, Math.round(a.y + ((b.y - a.y) * k) / n) - o, esp, esp);
}

/** Uma linha horizontal de pixels centrada em `cx`, com meia largura `meia`. */
export function faixa(x: CanvasRenderingContext2D, cx: number, y: number, meia: number, cor: string): void {
  const m = Math.round(meia);
  x.fillStyle = cor;
  x.fillRect(Math.round(cx) - m, Math.round(y), m * 2 + 1, 1);
}

/**
 * Desenha em pixels inteiros de tela: cada retângulo do cenário vira um retângulo de tela com as bordas
 * arredondadas para o pixel. Com o zoom fracionário da câmera, os `fillRect` deixavam listras finas dentro de
 * chamas, fumaça e campos; assim os pixels saem cheios, como nos sprites. Só vale com a câmera sem rotação.
 */
export function emPixelsDeTela(x: CanvasRenderingContext2D, desenho: (x: CanvasRenderingContext2D) => void): void {
  const m = x.getTransform?.();
  if (!m || m.b || m.c) {
    desenho(x);
    return;
  }
  const { a: sx, d: sy, e: ox, f: oy } = m;
  const tela = {
    canvas: x.canvas,
    get fillStyle() {
      return x.fillStyle;
    },
    set fillStyle(v: CanvasRenderingContext2D['fillStyle']) {
      x.fillStyle = v;
    },
    get globalAlpha() {
      return x.globalAlpha;
    },
    set globalAlpha(v: number) {
      x.globalAlpha = v;
    },
    get imageSmoothingEnabled() {
      return x.imageSmoothingEnabled;
    },
    set imageSmoothingEnabled(v: boolean) {
      x.imageSmoothingEnabled = v;
    },
    fillRect(px: number, py: number, w: number, h: number) {
      const l = Math.round(px * sx + ox);
      const t = Math.round(py * sy + oy);
      x.fillRect(l, t, Math.round((px + w) * sx + ox) - l, Math.round((py + h) * sy + oy) - t);
    },
    drawImage(imagem: CanvasImageSource, dx: number, dy: number, dw?: number, dh?: number) {
      // O sprite volta para o espaço do cenário, igual ao desenho de fora.
      x.save();
      x.setTransform(m);
      if (dw === undefined || dh === undefined) x.drawImage(imagem, dx, dy);
      else x.drawImage(imagem, dx, dy, dw, dh);
      x.restore();
    },
  };
  x.save();
  x.setTransform(1, 0, 0, 1, 0, 0);
  try {
    desenho(tela as unknown as CanvasRenderingContext2D);
  } finally {
    x.restore();
  }
}
