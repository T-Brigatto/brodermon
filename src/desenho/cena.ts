// Desenha um quadro da arena: cenário, marcador de destino, criaturas, projéteis,
// partículas, textos, setas de quem saiu da tela e minimapa. Porte de `draw` da Arena.

import type { Jogo } from '../app/jogo';
import type { EfeitoForma } from '../conteudo/esquema';
import { distancia, geometriaDe, golpeDe, lutadorPorUid, mods, posicaoDaForma, type Lutador, type Mods } from '../nucleo';
import { AR, VISTA, projetar } from './arena';
import { desenharTexto } from './fonte';
import { desenharForma } from './formas';
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

  desenharFormas(x, j);
  desenharObjetos(x, j);
  j.fx.desenharChao(x);

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
    const m: Mods | null = l.condicoes.some((cd) => cd.tipo === 'estado') ? mods(j.b, c, l) : null;
    const t = m ? Math.max(1, m.tamanho) : 1;
    const topo = cy - h * t - balanco;
    // Energia de quem conjura (só nos tipos com efeito especial): brilho no chão antes do sprite, faíscas depois.
    const carga = l.acao && l.acao.conjuracao > 0 ? golpeDe(c, l.acao.golpe) : null;
    const prog = carga && carga.conjuracao > 0 ? 1 - l.acao!.conjuracao / carga.conjuracao : 0;
    if (carga) j.fx.cargaChao(x, carga.tipo, { x: cx, y: cy }, prog);
    if (m?.intangivel && m.atingivelPor.length) {
      // Embaixo da terra: só o monte de terra andando.
      x.fillStyle = '#6e4123';
      x.fillRect(cx - 5, cy - 2, 10, 2);
      x.fillStyle = '#b9773f';
      x.fillRect(cx - 3, cy - 3, 6, 1);
    } else {
      const sprite = canvasDoSprite(c, l.especie, l.olhando > 0, branco ? '#f4f4f4' : null);
      const alfa = x.globalAlpha;
      if (m?.intangivel) x.globalAlpha = 0.45;
      if (t === 1) x.drawImage(sprite, cx - sp.n / 2 + avanco, cy - sp.pe - balanco);
      else x.drawImage(sprite, Math.round(cx - (sp.n * t) / 2 + avanco), Math.round(cy - sp.pe * t - balanco), sp.n * t, sp.n * t);
      x.globalAlpha = alfa;
      if (m?.trava === 'tudo') desenharGelo(x, cx, cy, h * t);
    }
    if (carga) j.fx.cargaAr(x, carga.tipo, { x: cx, y: cy }, h * t, prog);
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

  // Projéteis com rastro: o guiado aponta para o alvo; os outros, para onde estão voando.
  for (const p of j.b.projeteis) {
    const g = golpeDe(c, p.golpe);
    const tipo = c.tipos[g.tipo];
    const { x: qx, y: qy, ux, uy } = j.telaDoProjetil(p);
    const anim = j.fx.animacao(p.golpe, 'projetil');
    if (anim) {
      j.fx.desenharProjetil(x, anim, g.tipo, { x: qx, y: qy }, ux, uy, j.raioDoProjetil(p));
      continue;
    }
    const cores = tipo?.projetil ?? ['#3b5dc9', '#41a6f6', '#73eff7'];
    const nucleo = cores.length > 3 && Math.random() < 0.5 ? cores[3]! : cores[2]!;
    const hx = Math.round(qx);
    const hy = Math.round(qy);
    j.fx.brilhoProjetil(x, g.tipo, { x: qx, y: qy }, ux, uy);
    const grande = (p.def.raio ?? 0) * p.escala >= 6 ? 1 : 0;
    x.fillStyle = cores[0]!;
    x.fillRect(Math.round(qx - ux * (4 + grande * 2)), Math.round(qy - uy * (4 + grande * 2)), 2 + grande, 2 + grande);
    x.fillRect(Math.round(qx - ux * (7 + grande * 3)), Math.round(qy - uy * (7 + grande * 3)), 1, 1);
    x.fillStyle = cores[1]!;
    x.fillRect(hx - 1 - grande, hy - 1 - grande, 3 + grande * 2, 3 + grande * 2);
    x.fillStyle = nucleo;
    x.fillRect(hx, hy, 1 + grande, 1 + grande);
  }

  for (const p of j.particulas) {
    x.fillStyle = p.cor;
    x.fillRect(Math.round(p.x), Math.round(p.y), p.tam, p.tam);
  }
  j.fx.desenhar(x);
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
/**
 * No chão, antes das criaturas: terrenos (trama cheia) e névoas (trama rala, sem sombra), as zonas que duram
 * (mais fortes no instante do pulso), as marcas que ainda vão acertar, a marca das formas durante a conjuração
 * (a trama enche quando falta pouco) e o clarão das formas instantâneas.
 */
function desenharFormas(x: CanvasRenderingContext2D, j: Jogo): void {
  const c = j.c;
  const coresDoTipo = (id: string) => {
    const tipo = c.tipos[id];
    return { cor: tipo?.cor ?? '#f4f4f4', escura: tipo?.projetil?.[0] ?? '#3b5dc9', clara: tipo?.projetil?.[2] ?? '#f4f4f4' };
  };
  const cores = (golpe: string) => coresDoTipo(golpeDe(c, golpe).tipo);
  const passo = Math.floor(performance.now() / 120) % 3;
  const onda = Math.sin(performance.now() / 300) * 0.08;
  for (const z of j.b.zonas) {
    if (z.atraso > 0) {
      const { escura } = cores(z.golpe);
      desenharForma(x, z.geo, z, { miolo: escura, borda: '#f4f4f4', trama: z.atraso < 0.3 ? 2 : 4, alfa: 0.5, pontilhado: passo });
      continue;
    }
    const def = z.campo ? c.campos[z.campo] : undefined;
    if (def) {
      const { cor, escura, clara } = coresDoTipo(def.tipo);
      if (def.camada === 'nevoa') desenharForma(x, z.geo, z, { miolo: clara, borda: clara, trama: 4, alfa: 0.35 + onda, pontilhado: passo, semSombra: true });
      else desenharForma(x, z.geo, z, { miolo: escura, borda: cor, trama: 2, alfa: 0.45 });
      continue;
    }
    const { cor, escura } = cores(z.golpe);
    // Com animação própria (jato de fogo, funil…), a zona fica só marcada no chão, para a animação aparecer.
    if (j.fx.animacao(z.golpe, z.geo.forma)) {
      desenharForma(x, z.geo, z, { miolo: escura, borda: cor, trama: 4, alfa: 0.2, pontilhado: passo });
      continue;
    }
    const fase = z.pulso ? (z.tempo % z.pulso) / z.pulso : 0;
    desenharForma(x, z.geo, z, { miolo: escura, borda: cor, trama: 2, alfa: 0.55 - 0.25 * fase });
  }
  const A = c.regras.arena;
  for (const l of [j.eu(), j.rival()]) {
    const a = l.acao;
    if (l.desmaiado || !a || a.conjuracao <= 0) continue;
    const g = golpeDe(c, a.golpe);
    const feito = g.conjuracao > 0 ? 1 - a.conjuracao / g.conjuracao : 1;
    const { escura } = cores(a.golpe);
    for (const ef of g.efeitos) {
      if (ef.efeito !== 'area' && ef.efeito !== 'cone' && ef.efeito !== 'linha' && ef.efeito !== 'parede') continue;
      const pos = posicaoDaForma(l, a, ef as EfeitoForma, { x: (A.xMin + A.xMax) / 2, y: A.yMin });
      const geo = geometriaDe(ef as EfeitoForma);
      if (geo.forma === 'linha' && ef.efeito === 'linha' && ef.ateRival) geo.alcance = Math.min(geo.alcance, distancia(pos, a.mira));
      desenharForma(x, geo, pos, { miolo: escura, borda: '#f4f4f4', trama: feito > 0.5 ? 2 : 4, alfa: 0.2 + 0.4 * feito, pontilhado: passo });
    }
  }
  for (const f of j.formas) {
    if (f.vida < 0.08 && Math.floor(f.vida * 60) % 2) continue;
    const { cor, clara, escura } = cores(f.golpe);
    // Com animação própria, o clarão da forma só marca onde acertou.
    if (j.fx.animacao(f.golpe, f.geo.forma)) desenharForma(x, f.geo, f.z, { miolo: escura, borda: escura, trama: 4, alfa: 0.18 });
    else desenharForma(x, f.geo, f.z, { miolo: cor, borda: clara, trama: 2, alfa: 0.85 });
  }
}

/** Objetos na arena: portais (anel), pino (haste com o alcance marcado), pilar (bloco de cristal) e a cópia falsa. */
function desenharObjetos(x: CanvasRenderingContext2D, j: Jogo): void {
  const c = j.c;
  const piscar = Math.floor(performance.now() / 150) % 2;
  for (const o of j.b.objetos) {
    const q = projetar(o.x, o.y);
    const cx = Math.round(q.x);
    const cy = Math.round(q.y);
    const z = { x: o.x, y: o.y, ux: 1, uy: 0 };
    switch (o.tipo) {
      case 'portal':
        desenharForma(x, { forma: 'area', raio: o.raio }, z, { miolo: '#5a2a8f', borda: '#d6a8f5', trama: 4, alfa: 0.6 + piscar * 0.2 });
        break;
      case 'pino':
        desenharForma(x, { forma: 'area', raio: o.raio }, z, { miolo: '#b07a10', borda: '#fff09a', trama: 0, alfa: 0.4, pontilhado: piscar });
        x.fillStyle = '#566c86';
        x.fillRect(cx, cy - 10, 1, 10);
        x.fillStyle = piscar ? '#fff09a' : '#f2c230';
        x.fillRect(cx - 1, cy - 12, 3, 2);
        break;
      case 'pilar': {
        const w = Math.max(4, Math.round(o.raio * 1.6));
        x.fillStyle = '#1a1c2c';
        x.fillRect(cx - w / 2 - 1, cy - 15, w + 2, 16);
        x.fillStyle = '#8a9bb0';
        x.fillRect(cx - w / 2, cy - 14, w, 14);
        x.fillStyle = '#d6dfe8';
        x.fillRect(cx - w / 2, cy - 14, Math.max(1, Math.round(w / 3)), 14);
        break;
      }
      case 'copia': {
        const dono = lutadorPorUid(j.b, o.autor);
        const sp = spriteDe(c, dono.especie);
        const alfa = x.globalAlpha;
        x.globalAlpha = 0.55 + piscar * 0.15;
        x.drawImage(canvasDoSprite(c, dono.especie, dono.olhando > 0, null), cx - sp.n / 2, cy - sp.pe);
        x.globalAlpha = alfa;
        break;
      }
    }
  }
}

/** Congelado: placas de gelo por cima do sprite. */
function desenharGelo(x: CanvasRenderingContext2D, cx: number, cy: number, h: number): void {
  const alfa = x.globalAlpha;
  x.globalAlpha = 0.4;
  x.fillStyle = '#73eff7';
  x.fillRect(cx - Math.round(h * 0.4), cy - h, Math.round(h * 0.8), h);
  x.globalAlpha = alfa;
  x.fillStyle = '#e6f8ff';
  x.fillRect(cx - Math.round(h * 0.3), cy - h + 2, 1, Math.round(h * 0.4));
  x.fillRect(cx + Math.round(h * 0.2), cy - Math.round(h * 0.6), 1, Math.round(h * 0.3));
}

function desenharEstado(x: CanvasRenderingContext2D, j: Jogo, l: Lutador, cx: number, cy: number, by: number, sw: number, anim: number): void {
  const a = l.acao;
  if (a && (a.conjuracao > 0 || a.canal)) {
    // Conjurando, a barra enche; canalizando, esvazia até o fim.
    const g = golpeDe(j.c, a.golpe);
    const canal = g.efeitos[a.passo - 1];
    const duracao = canal && 'duracao' in canal ? canal.duracao : undefined;
    const feito = a.conjuracao > 0 ? (g.conjuracao > 0 ? 1 - a.conjuracao / g.conjuracao : 1) : duracao ? a.espera / duracao : 0;
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
