// Cenário em pixel art: gramado, arbustos, muro com estandartes, chão de areia e pilares.
// Desenhado uma vez em dois canvases do tamanho do cenário: o fundo (atrás das criaturas)
// e a frente (pilares da frente, por cima). Porte fiel de `makeBg` da Arena original.

import { AR, CENARIO, projetar } from './arena';

type P = [number, number];

export function criarCenario(): { fundo: HTMLCanvasElement; frente: HTMLCanvasElement } {
  const W = CENARIO.largura;
  const H = CENARIO.altura;
  const novo = () => {
    const el = document.createElement('canvas');
    el.width = W;
    el.height = H;
    return el;
  };
  const fundo = novo();
  const frente = novo();
  let x = fundo.getContext('2d')!;

  const px = (cor: string, a: number, b: number, w: number, h: number) => {
    x.fillStyle = cor;
    x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h));
  };
  // Sorteio próprio com semente fixa: o cenário é sempre o mesmo.
  let semente = 7;
  const rnd = () => {
    semente = (semente * 16807) % 2147483647;
    return semente / 2147483647;
  };
  const elipse = (cx: number, cy: number, rx: number, ry: number, cor: string) => {
    x.fillStyle = cor;
    for (let yy = Math.floor(cy - ry); yy <= cy + ry; yy++) {
      for (let xx = Math.floor(cx - rx); xx <= cx + rx; xx++) {
        const dx = (xx + 0.5 - cx) / rx;
        const dy = (yy + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) x.fillRect(xx, yy, 1, 1);
      }
    }
  };
  const poligono = (pts: P[], cor: string) => {
    const ys = pts.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys));
    const y1 = Math.ceil(Math.max(...ys));
    x.fillStyle = cor;
    for (let yy = y0; yy < y1; yy++) {
      const yc = yy + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i]!;
        const p2 = pts[(i + 1) % pts.length]!;
        if ((p1[1] <= yc && p2[1] > yc) || (p2[1] <= yc && p1[1] > yc)) {
          xs.push(p1[0] + ((yc - p1[1]) / (p2[1] - p1[1])) * (p2[0] - p1[0]));
        }
      }
      xs.sort((m, n) => m - n);
      for (let j = 0; j + 1 < xs.length; j += 2) {
        const xa = Math.round(xs[j]!);
        const xb = Math.round(xs[j + 1]!);
        if (xb > xa) x.fillRect(xa, yy, xb - xa, 1);
      }
    }
  };
  const segmento = (p: P, q: P, cor: string, esp = 1) => {
    const n = Math.ceil(Math.max(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])));
    x.fillStyle = cor;
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0;
      x.fillRect(Math.round(p[0] + (q[0] - p[0]) * t), Math.round(p[1] + (q[1] - p[1]) * t), 1, esp);
    }
  };
  const Pt = (X: number, Z: number): P => {
    const s = projetar(X, Z);
    return [s.x, s.y];
  };
  const lerp = (p: number, q: number, t: number) => p + (q - p) * t;
  const arbusto = (bx: number, by: number, r: number) => {
    elipse(bx, by + 2, r, r * 0.65, '#1e5f5a');
    elipse(bx, by, r, r * 0.65, '#257179');
    elipse(bx - 2, by - 2, r * 0.55, r * 0.35, '#38a57a');
  };
  const flor = (fx: number, fy: number, fc: string) => {
    px(fc, fx, fy - 1, 1, 1);
    px(fc, fx - 1, fy, 1, 1);
    px(fc, fx + 1, fy, 1, 1);
    px(fc, fx, fy + 1, 1, 1);
    px('#ffcd75', fx, fy, 1, 1);
  };
  const { hb, hf } = AR;
  const bl = Pt(0, 0);
  const br = Pt(AR.X, 0);
  const fl = Pt(0, AR.Z);
  const fr = Pt(AR.X, AR.Z);

  // Gramado e copas das árvores ao fundo
  px('#38b764', 0, 0, W, H);
  for (let i = 0; i < 1500; i++) px(rnd() < 0.6 ? '#2f9e57' : '#4fc272', Math.floor(rnd() * W), Math.floor(rnd() * H), 2, 1);
  px('#173e44', 0, 0, W, 42);
  const filaA: [number, number, number][] = [];
  const filaB: [number, number, number][] = [];
  for (let k = -1; k < 26; k++) filaA.push([k * 17 + (k % 2) * 5, 22 + (k % 3) * 4, 16 + (k % 2) * 3]);
  for (let k = -1; k < 31; k++) filaB.push([k * 14 + 6 + (k % 3) * 3, 52 + (k % 2) * 4, 12 + (k % 3) * 2]);
  for (const fila of [filaA, filaB]) {
    for (const q of fila) elipse(q[0], q[1] + 3, q[2], q[2] - 1, '#173e44');
    for (const q of fila) elipse(q[0], q[1], q[2], q[2] - 1, '#1e5f5a');
    for (const q of fila) elipse(q[0] - 2, q[1] - 2, q[2] - 4, q[2] - 5, '#257179');
    for (const q of fila) elipse(q[0] - 4, q[1] - 5, q[2] - 8, q[2] - 9, '#38a57a');
  }
  for (const q of [[12, 96], [40, 84], [8, 150], [16, 214], [390, 96], [362, 84], [392, 150], [384, 214], [6, 300], [394, 300]] as P[]) {
    arbusto(q[0], q[1], 10);
  }
  for (let f = 0; f < 30; f++) {
    const fx = Math.floor(rnd() * W);
    const fy = 70 + Math.floor(rnd() * (H - 70));
    const dentro = fy > 76 && fy < 292 && fx > 18 && fx < W - 18;
    if (dentro && fy < 288 && fx > lerp(bl[0], fl[0], (fy - 76) / 214) - 8 && fx < lerp(br[0], fr[0], (fy - 76) / 214) + 8) continue;
    flor(fx, fy, ['#f4f4f4', '#ffcd75', '#ef7d57'][f % 3]!);
  }

  // Muro do fundo com estandartes
  const x0 = Math.round(bl[0]);
  const x1 = Math.round(br[0]);
  const yt = Math.round(bl[1] - hb);
  const yb = Math.round(bl[1]);
  px('#566c86', x0, yt, x1 - x0, yb - yt);
  for (let ry = 0, linha = 0; ry < hb; ry += 7, linha++) {
    px('#333c57', x0, yt + ry + 6, x1 - x0, 1);
    for (let bx = x0 + (linha % 2 ? 0 : 8); bx < x1; bx += 16) {
      px('#333c57', bx, yt + ry, 1, 6);
      px('#94b0c2', bx + 1, yt + ry, 4, 1);
    }
  }
  px('#333c57', x0, yb - 6, x1 - x0, 6);
  const estandarte = (cx: number, base: string, sombra: string, marca: string) => {
    const l = Math.round(cx - 9);
    const t = yt + 6;
    px('#8a5a3a', l - 3, t - 1, 24, 2);
    px(base, l, t + 1, 18, 26);
    px(sombra, l + 15, t + 1, 3, 26);
    for (let q = 0; q < 3; q++) {
      px(base, l + q * 6 + 1, t + 27, 4, 2);
      px(base, l + q * 6 + 2, t + 29, 2, 1);
    }
    px(marca, l + 7, t + 8, 4, 2);
    px(marca, l + 5, t + 10, 8, 4);
    px(marca, l + 7, t + 14, 4, 2);
  };
  estandarte(Pt(80, 0)[0], '#3b5dc9', '#29366f', '#73eff7');
  estandarte(Pt(240, 0)[0], '#b13e53', '#5d275d', '#ffcd75');
  px('#94b0c2', x0 - 1, yt - 3, x1 - x0 + 2, 3);
  px('#c0cbdc', x0 - 1, yt - 3, x1 - x0 + 2, 1);

  // Muros laterais
  const lateral = (esquerda: boolean) => {
    const b = esquerda ? bl : br;
    const fq = esquerda ? fl : fr;
    poligono([[b[0], b[1] - hb], [fq[0], fq[1] - hf], [fq[0], fq[1]], [b[0], b[1]]], esquerda ? '#333c57' : '#3d4866');
    for (let r = 1; r < 10; r++) segmento([b[0], b[1] - (hb * r) / 10], [fq[0], fq[1] - (hf * r) / 10], '#262b44');
    for (let z = 1; z < 14; z++) {
      const t = z / 14;
      const ex = lerp(b[0], fq[0], t);
      const ey = lerp(b[1], fq[1], t);
      const hh = lerp(hb, hf, t);
      for (let r2 = 0; r2 < 10; r2++) {
        if ((z + r2) % 2 === 0) segmento([ex, ey - (hh * r2) / 10], [ex, ey - (hh * (r2 + 1)) / 10], '#262b44');
      }
    }
    segmento([b[0], b[1] - hb - 2], [fq[0], fq[1] - hf - 2], '#94b0c2', 3);
    segmento([b[0], b[1] - hb - 3], [fq[0], fq[1] - hf - 3], '#c0cbdc');
  };
  lateral(true);
  lateral(false);

  // Chão de areia quadriculado, linha do meio e círculo central
  poligono([bl, br, fr, fl], '#d9a066');
  const TX = 16;
  const TZ = 10;
  const sx = AR.X / TX;
  const sz = AR.Z / TZ;
  for (let ti = 0; ti < TX; ti++) {
    for (let tj = 0; tj < TZ; tj++) {
      if ((ti + tj) % 2) {
        poligono([Pt(ti * sx, tj * sz), Pt((ti + 1) * sx, tj * sz), Pt((ti + 1) * sx, (tj + 1) * sz), Pt(ti * sx, (tj + 1) * sz)], '#cf9660');
      }
    }
  }
  for (let i = 0; i < 700; i++) {
    const q = Pt(rnd() * AR.X, rnd() * AR.Z);
    px(rnd() < 0.5 ? '#c08550' : '#e6b57e', q[0], q[1], rnd() < 0.3 ? 2 : 1, 1);
  }
  segmento(Pt(AR.X / 2, 0), Pt(AR.X / 2, AR.Z), '#e6b57e');
  for (let ang = 0; ang < 360; ang += 3) {
    const tr = (ang * Math.PI) / 180;
    const cq = Pt(AR.X / 2 + Math.cos(tr) * 26, AR.Z / 2 + Math.sin(tr) * 20);
    px('#e6b57e', cq[0], cq[1], 2, 1);
  }
  poligono([bl, br, Pt(AR.X, 4), Pt(0, 4)], '#b07a4a');
  poligono([bl, Pt(6, 0), Pt(6, AR.Z), fl], '#c08550');
  segmento(bl, fl, '#8a5a3a');
  segmento(br, fr, '#8a5a3a');
  px('#e6b57e', fl[0], fl[1] - 1, fr[0] - fl[0], 1);
  px('#8a5a3a', fl[0], fl[1], fr[0] - fl[0], 7);
  for (let lx = Math.round(fl[0]) + 6; lx < fr[0]; lx += 14) px('#6e4630', lx, fl[1] + 1, 1, 6);
  px('#2a8a50', fl[0], fl[1] + 7, fr[0] - fl[0], 3);

  const pilar = (cx: number, base: number, w: number, h: number) => {
    const l = Math.round(cx - w / 2);
    const t = Math.round(base - h);
    px('#566c86', l, t, w, h);
    px('#94b0c2', l + 1, t, 2, h);
    px('#333c57', l + w - 2, t, 2, h);
    px('#c0cbdc', l - 2, t - 3, w + 4, 3);
    px('#333c57', l - 2, t, w + 4, 1);
    px('#333c57', l - 1, base - 3, w + 2, 3);
  };
  pilar(bl[0], bl[1] + 1, 8, hb + 6);
  pilar(br[0], br[1] + 1, 8, hb + 6);

  x = frente.getContext('2d')!;
  pilar(fl[0] + 2, fl[1] + 7, 12, hf + 14);
  pilar(fr[0] - 2, fr[1] + 7, 12, hf + 14);
  return { fundo, frente };
}
