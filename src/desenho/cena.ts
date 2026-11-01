// Desenha um quadro da arena: cenário, marcador de destino, criaturas, projéteis,
// partículas, textos, setas de quem saiu da tela e minimapa. Porte de `draw` da Arena.

import type { Jogo } from '../app/jogo';
import { golpeDe, lutadorPorUid, type Lutador } from '../nucleo';
import { AR, VISTA, projetar } from './arena';
import { desenharTexto } from './fonte';
import { criarCenario } from './fundo';
import { canvasDoSprite, spriteDe } from './sprites';

let cenario: ReturnType<typeof criarCenario> | null = null;

export function desenharCena(cv: HTMLCanvasElement, j: Jogo): void {
  const x = cv.getContext('2d');
  if (!x) return;
  cenario ??= criarCenario();
  const c = j.c;
  const cam = j.cam;
  const VW = cv.width;
  const VH = cv.height;
  const K = VW / VISTA.largura;
  const s = cam.z * K;
  let ox = VW / 2 - cam.x * s;
  let oy = VH / 2 - cam.y * s;
  if (j.tremor > 0) {
    ox += (Math.random() * 2 - 1) * 2 * K;
    oy += (Math.random() * 2 - 1) * 2 * K;
  }
  ox = Math.round(ox);
  oy = Math.round(oy);
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#10121e';
  x.fillRect(0, 0, VW, VH);
  x.setTransform(s, 0, 0, s, ox, oy);
  x.imageSmoothingEnabled = false;
  x.drawImage(cenario.fundo, 0, 0);

  // Marcador do destino do toque
  const destino = j.b.equipes[0].destino;
  if (destino && j.tela === 'jogo') {
    const q = projetar(destino.x, destino.y);
    const wx = Math.round(q.x);
    const wy = Math.round(q.y);
    x.fillStyle = Math.floor(performance.now() / 180) % 2 ? '#f4f4f4' : '#ffcd75';
    x.fillRect(wx - 4, wy - 3, 3, 1);
    x.fillRect(wx + 2, wy - 3, 3, 1);
    x.fillRect(wx - 4, wy + 3, 3, 1);
    x.fillRect(wx + 2, wy + 3, 3, 1);
    x.fillRect(wx - 6, wy - 2, 1, 5);
    x.fillRect(wx + 6, wy - 2, 1, 5);
    x.fillRect(wx, wy, 1, 1);
  }

  // Criaturas em campo, de trás para a frente
  const emCampo = [j.eu(), j.rival()].filter((l) => !l.desmaiado).sort((a, b) => a.y - b.y);
  for (const l of emCampo) {
    const troca = j.b.equipes[l.equipe].troca;
    if (troca && troca.restante < 0.12) continue;
    const v = j.visual(l);
    const sp = spriteDe(c, l.especie);
    const ps = projetar(l.x, l.y);
    const cx = Math.round(ps.x);
    const cy = Math.round(ps.y);
    const h = sp.h;
    const sw = Math.max(5, Math.round(h * 0.35));
    x.fillStyle = 'rgba(26,28,44,.3)';
    x.fillRect(cx - sw + 2, cy - 1, sw * 2 - 4, 1);
    x.fillRect(cx - sw, cy, sw * 2, 1);
    x.fillRect(cx - sw + 2, cy + 1, sw * 2 - 4, 1);
    const andando = Math.abs(l.vx) + Math.abs(l.vy) > 6;
    const balanco = Math.floor(v.anim / (andando ? 0.15 : 0.45)) % 2;
    if (l.buff) {
      x.fillStyle = l.buff.atributo === 'ataque' ? '#ef7d57' : l.buff.atributo === 'velocidade' ? '#a7f070' : '#73eff7';
      for (let q = 0; q < 4; q++) {
        const a = v.anim * 4 + (q * Math.PI) / 2;
        x.fillRect(Math.round(cx + Math.cos(a) * (h * 0.6)), Math.round(cy - h / 2 + Math.sin(a) * (h * 0.35)), 1, 1);
      }
    }
    const branco = (v.flash > 0 && Math.floor(v.flash * 20) % 2 === 1) || v.entrada > 0.15;
    const avanco = v.cast > 0 ? l.olhando * 2 : 0;
    const topo = cy - h - balanco;
    x.drawImage(canvasDoSprite(c, l.especie, l.olhando > 0, branco ? '#f4f4f4' : null), cx - sp.n / 2 + avanco, cy - sp.pe - balanco);
    const bx = cx - 8;
    const by = topo - 5;
    const pct = l.hp / l.hpMax;
    x.fillStyle = '#1a1c2c';
    x.fillRect(bx, by, 16, 3);
    x.fillStyle = pct > 0.5 ? '#a7f070' : pct > 0.25 ? '#ffcd75' : '#ef7d57';
    x.fillRect(bx + 1, by + 1, Math.max(0, Math.round(14 * pct)), 1);
    if (l.equipe === 0) {
      x.fillStyle = '#ffcd75';
      x.fillRect(cx - 1, by - 4, 3, 1);
      x.fillRect(cx, by - 3, 1, 1);
    }
    desenharEstado(x, j, l, cx, cy, by, sw, v.anim);
  }

  // Projéteis com rastro
  for (const p of j.b.projeteis) {
    const tipo = c.tipos[golpeDe(c, p.golpe).tipo];
    const cores = tipo?.projetil ?? ['#3b5dc9', '#41a6f6', '#73eff7'];
    const nucleo = cores.length > 3 && Math.random() < 0.5 ? cores[3]! : cores[2]!;
    const alvo = lutadorPorUid(j.b, p.alvo);
    const hp = j.alturaProjetil.get(p) ?? j.alturaSprite(alvo) / 2;
    const qs = projetar(p.x, p.y);
    const qx = qs.x;
    const qy = qs.y - hp;
    const ts = j.em(alvo, j.alturaSprite(alvo) / 2);
    const dl = Math.hypot(ts.x - qx, ts.y - qy) || 1;
    const ux = (ts.x - qx) / dl;
    const uy = (ts.y - qy) / dl;
    const hx = Math.round(qx);
    const hy = Math.round(qy);
    x.fillStyle = cores[0]!;
    x.fillRect(Math.round(qx - ux * 4), Math.round(qy - uy * 4), 2, 2);
    x.fillRect(Math.round(qx - ux * 7), Math.round(qy - uy * 7), 1, 1);
    x.fillStyle = cores[1]!;
    x.fillRect(hx - 1, hy - 1, 3, 3);
    x.fillStyle = nucleo;
    x.fillRect(hx, hy, 1, 1);
  }

  for (const p of j.particulas) {
    x.fillStyle = p.cor;
    x.fillRect(Math.round(p.x), Math.round(p.y), p.tam, p.tam);
  }
  x.drawImage(cenario.frente, 0, 0);

  // Textos na resolução da tela, para a fonte de pixel ficar nítida
  x.setTransform(1, 0, 0, 1, 0, 0);
  const o = Math.max(1, Math.round(K * 1.5));
  for (const t of j.textos) {
    if (t.vida < 0.25 && Math.floor(t.vida * 24) % 2) continue;
    desenharTexto(x, t.s, ox + t.x * s, oy + t.y * s, t.cor, t.esc * 2 * K, o);
  }
  if (j.tela !== 'titulo') {
    desenharSetas(x, j, ox, oy, s, K);
    desenharMinimapa(x, j, K);
  }
}

/**
 * Sinais do que está acontecendo com a criatura: barra de conjuração sob o HP, estrelas de atordoamento,
 * raízes de quem está preso, gotas de lentidão, faíscas de dano contínuo e seta de debuff.
 */
function desenharEstado(x: CanvasRenderingContext2D, j: Jogo, l: Lutador, cx: number, cy: number, by: number, sw: number, anim: number): void {
  const a = l.acao;
  if (a && a.conjuracao > 0) {
    const g = golpeDe(j.c, a.golpe);
    const feito = g.conjuracao > 0 ? 1 - a.conjuracao / g.conjuracao : 1;
    x.fillStyle = '#1a1c2c';
    x.fillRect(cx - 8, by + 3, 16, 2);
    x.fillStyle = j.c.tipos[g.tipo]?.cor ?? '#f4f4f4';
    x.fillRect(cx - 7, by + 3, Math.round(14 * feito), 1);
  }
  for (const cd of l.condicoes) {
    switch (cd.tipo) {
      case 'atordoado':
        x.fillStyle = '#ffcd75';
        for (let q = 0; q < 3; q++) {
          const ang = anim * 6 + (q * Math.PI * 2) / 3;
          x.fillRect(Math.round(cx + Math.cos(ang) * 7), Math.round(by - 3 + Math.sin(ang) * 2), 1, 1);
        }
        break;
      case 'preso':
        x.fillStyle = '#38b764';
        for (let q = -1; q <= 1; q++) x.fillRect(cx + q * (sw - 1) - (q === 0 ? 0 : q), cy - 3, 1, 4);
        x.fillRect(cx - sw + 1, cy, sw * 2 - 2, 1);
        break;
      case 'lentidao':
        x.fillStyle = '#41a6f6';
        for (let q = 0; q < 3; q++) x.fillRect(cx - sw + 2 + q * sw, cy - 1 + (Math.floor(anim * 4 + q) % 3), 1, 1);
        break;
      case 'dano-continuo':
        x.fillStyle = Math.floor(anim * 10) % 2 ? '#ef7d57' : '#ffcd75';
        x.fillRect(cx - 4 + (Math.floor(anim * 7) % 9), by + 6 + (Math.floor(anim * 5) % 4), 1, 1);
        break;
      case 'debuff':
        x.fillStyle = '#94b0c2';
        x.fillRect(cx + 10, by, 3, 1);
        x.fillRect(cx + 11, by + 1, 1, 1);
        break;
    }
  }
}

/** Seta na borda para a criatura que ficou fora do enquadramento. */
function desenharSetas(x: CanvasRenderingContext2D, j: Jogo, ox: number, oy: number, s: number, K: number): void {
  const VW = x.canvas.width;
  const VH = x.canvas.height;
  const m = 16 * K;
  const u = 2 * K;
  for (const l of [j.eu(), j.rival()]) {
    if (l.desmaiado) continue;
    const h = j.alturaSprite(l);
    const p = j.em(l, h / 2);
    const sx = ox + p.x * s;
    const sy = oy + p.y * s;
    const hw = 12 * s;
    const hh = (h / 2) * s;
    if (sx - hw > 0 && sx + hw < VW && sy - hh > 0 && sy + hh < VH) continue;
    const ax = Math.max(m, Math.min(VW - m, sx));
    const ay = Math.max(m, Math.min(VH - m, sy));
    const horiz = Math.abs(sx - ax) >= Math.abs(sy - ay);
    const sg = horiz ? (sx > ax ? 1 : -1) : sy > ay ? 1 : -1;
    const cor = l.equipe === 0 ? '#ffcd75' : '#ef7d57';
    for (let passo = 0; passo < 2; passo++) {
      x.fillStyle = passo ? cor : '#1a1c2c';
      const e = passo ? 0 : K;
      for (let i = 0; i < 4; i++) {
        const len = (7 - i * 2) * u;
        const off = (i - 2) * u * sg;
        if (horiz) x.fillRect(Math.round(ax + off) - e, Math.round(ay - len / 2) - e, u + e * 2, len + e * 2);
        else x.fillRect(Math.round(ax - len / 2) - e, Math.round(ay + off) - e, len + e * 2, u + e * 2);
      }
    }
  }
}

/** Minimapa no canto inferior esquerdo; fica transparente quando uma criatura passa por trás dele. */
function desenharMinimapa(x: CanvasRenderingContext2D, j: Jogo, K: number): void {
  const mw = 64;
  const mh = Math.round((64 * AR.Z) / AR.X);
  const L = 12 * K;
  const T = x.canvas.height - (12 + mh) * K;
  const cam = j.cam;
  const R1 = (mw + 9) * K;
  const T1 = T - 3 * K;
  const vivos: Lutador[] = [j.eu(), j.rival()].filter((l) => !l.desmaiado);
  let encoberto = false;
  for (const l of vivos) {
    const h = j.alturaSprite(l);
    const p = j.em(l, 0);
    const cx = x.canvas.width / 2 + (p.x - cam.x) * cam.z * K;
    const cy = x.canvas.height / 2 + (p.y - cam.y) * cam.z * K;
    if (cx - 14 * cam.z * K < R1 && cy - (h + 8) * cam.z * K < x.canvas.height && cy > T1 - 4 * K) encoberto = true;
  }
  x.globalAlpha = encoberto ? 0.25 : 1;
  x.fillStyle = 'rgba(16,18,30,.72)';
  x.fillRect(L - 3 * K, T - 3 * K, (mw + 6) * K, (mh + 6) * K);
  x.fillStyle = 'rgba(217,160,102,.22)';
  x.fillRect(L, T, mw * K, mh * K);
  x.fillStyle = '#566c86';
  x.fillRect(L, T, mw * K, K);
  x.fillRect(L, T + (mh - 1) * K, mw * K, K);
  x.fillRect(L, T, K, mh * K);
  x.fillRect(L + (mw - 1) * K, T, K, mh * K);
  x.fillStyle = '#333c57';
  x.fillRect(L + (mw / 2) * K, T + K, K, (mh - 2) * K);
  for (const l of vivos) {
    const px = Math.round(L + (l.x / AR.X) * mw * K);
    const py = Math.round(T + (l.y / AR.Z) * mh * K);
    x.fillStyle = '#1a1c2c';
    x.fillRect(px - 3 * K, py - 3 * K, 6 * K, 6 * K);
    x.fillStyle = l.equipe === 0 ? '#ffcd75' : '#ef7d57';
    x.fillRect(px - 2 * K, py - 2 * K, 4 * K, 4 * K);
  }
  x.globalAlpha = 1;
}
