import { FONTE } from './fonte-dados';

/**
 * Escreve com a fonte 3×5 da Arena, em maiúsculas e sem acento, com contorno escuro de `o` pixels.
 * O texto fica centrado em `cx` e nunca sai pelas bordas do canvas.
 */
export function desenharTexto(
  x: CanvasRenderingContext2D,
  texto: string,
  cx: number,
  cy: number,
  cor: string,
  esc: number,
  o = 1,
): void {
  const s = texto.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const w = s.length * 4 * esc - esc;
  const W = x.canvas.width;
  cx = Math.max(w / 2 + o, Math.min(W - w / 2 - o, cx));
  const ox = Math.round(cx - w / 2);
  const oy = Math.round(cy);
  for (let passo = 0; passo < 2; passo++) {
    x.fillStyle = passo ? cor : '#1a1c2c';
    for (let i = 0; i < s.length; i++) {
      const g = FONTE[s[i]!];
      if (!g) continue;
      for (let r = 0; r < 5; r++) {
        for (let k = 0; k < 3; k++) {
          if (g[r * 3 + k] !== '1') continue;
          const X = ox + i * 4 * esc + k * esc;
          const Y = oy + r * esc;
          if (passo) x.fillRect(X, Y, esc, esc);
          else x.fillRect(X - o, Y - o, esc + o * 2, esc + o * 2);
        }
      }
    }
  }
}
