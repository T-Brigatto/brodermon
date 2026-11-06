// Arte do que se desenha em cima e em volta das criaturas e dos objetos de golpe, no pacote com efeitos próprios
// (tipos com `fx`): condições (atordoado, preso, lentidão, dano contínuo, debuff, acorrentado), estados (anel no
// chão, bolha de ar, couraça, mira de presa, estática), buff, bloco de gelo do congelado, portal, para-raios e
// pilar de cristal. Vem da revisão de arte do Claude Design (`design/mudancas-arte.md`). A Arena original, sem
// `fx`, continua com o desenho antigo, em `cena.ts`.

import type { Jogo } from '../app/jogo';
import type { Conteudo } from '../conteudo/esquema';
import type { Atributo, Lutador, Objeto } from '../nucleo';
import { lutadorPorUid } from '../nucleo';
import { paleta, type Paleta } from './animacoes';
import { projetar } from './arena';
import { BRANCO, comAlfa, disco, elipseNoChao, linha, trama } from './pixels';
import { canvasDoSprite, spriteDe } from './sprites';

const VOLTA = Math.PI * 2;
const NAVY = '#1a1c2c';

/** Cores de buff e debuff por atributo: contorno, corpo e brilho. */
const COR_ATRIBUTO: Record<Atributo, [string, string, string]> = {
  ataque: ['#5d275d', '#ef7d57', '#ffcd75'],
  defesa: ['#29366f', '#41a6f6', '#73eff7'],
  velocidade: ['#257179', '#38b764', '#a7f070'],
};

/** Fogo, para o dano contínuo de um golpe sem efeito próprio. */
const PALETA_FOGO: Paleta = { contorno: '#4a1424', escura: '#a82a2a', media: '#ef6a3a', clara: '#ffb02e', quente: '#fff4b8' };

/** O pacote tem arte própria de efeitos: algum tipo tem `fx`. */
const comArte = new WeakMap<Conteudo, boolean>();
export function temArte(c: Conteudo): boolean {
  let s = comArte.get(c);
  if (s === undefined) comArte.set(c, (s = Object.values(c.tipos).some((t) => t.fx)));
  return s;
}

/** Paleta de efeito do tipo (`fx.cores`), ou null. */
export function paletaDoTipo(c: Conteudo, tipo: string): Paleta | null {
  const fx = c.tipos[tipo]?.fx;
  return fx ? paleta(fx.cores) : null;
}

/**
 * Tinta do chão de um campo: o tom médio quando ele é mais escuro que a areia sem ser quase preto (água, natureza,
 * arcano); senão o tom escuro.
 */
export function tintaDoCampo(p: Paleta): string {
  const n = parseInt(p.media.slice(1), 16);
  const luz = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luz >= 110 && luz < 135 ? p.media : p.escura;
}

function ponto(x: CanvasRenderingContext2D, px: number, py: number, cor: string): void {
  x.fillStyle = cor;
  x.fillRect(Math.round(px), Math.round(py), 1, 1);
}

/** Estrela de 3 × 3 com contorno (atordoado, brilhos). */
function estrela(x: CanvasRenderingContext2D, cx: number, cy: number, contorno: string, cor: string, brilho: string): void {
  const px = Math.round(cx);
  const py = Math.round(cy);
  x.fillStyle = contorno;
  x.fillRect(px - 2, py, 5, 1);
  x.fillRect(px, py - 2, 1, 5);
  x.fillRect(px - 1, py - 1, 3, 3);
  x.fillStyle = cor;
  x.fillRect(px - 1, py, 3, 1);
  x.fillRect(px, py - 1, 1, 3);
  x.fillStyle = brilho;
  x.fillRect(px, py, 1, 1);
}

/** Seta de 5 × 5 com contorno: `dir` 1 para cima (buff), -1 para baixo (debuff). */
function seta(x: CanvasRenderingContext2D, cx: number, cy: number, dir: 1 | -1, [contorno, cor, brilho]: [string, string, string]): void {
  const px = Math.round(cx);
  const py = Math.round(cy);
  const forma = dir > 0 ? ['..#..', '.###.', '#####', '..#..', '..#..'] : ['..#..', '..#..', '#####', '.###.', '..#..'];
  for (const [tom, borda] of [
    [contorno, true],
    [cor, false],
  ] as const) {
    x.fillStyle = tom;
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < 5; i++) {
        if (forma[j]![i] !== '#') continue;
        if (borda) {
          x.fillRect(px + i - 3, py + j - 2, 3, 1);
          x.fillRect(px + i - 2, py + j - 3, 1, 3);
        } else x.fillRect(px + i - 2, py + j - 2, 1, 1);
      }
    }
  }
  x.fillStyle = brilho;
  x.fillRect(px, py + (dir > 0 ? -2 : 2), 1, 1);
}

// ---------- Criaturas ----------

/** Congelado: bloco de gelo facetado e translúcido sobre a criatura, com um brilho que corre. */
export function desenharBlocoDeGelo(x: CanvasRenderingContext2D, cx: number, cy: number, h: number, anim: number): void {
  const meia = Math.max(5, Math.round(h * 0.48));
  const alto = Math.round(h + 3);
  const x0 = cx - meia;
  const y0 = cy - alto + 1;
  const largura = 2 * meia + 1;
  comAlfa(x, 0.5, () => {
    x.fillStyle = '#7fc8ec';
    x.fillRect(x0 + 1, y0 + 2, largura - 2, alto - 3);
  });
  comAlfa(x, 0.35, () => {
    x.fillStyle = '#d2f3ff';
    for (let py = y0 + 3; py < cy - 1; py++) for (let px = x0 + 2; px < x0 + Math.round(largura * 0.45); px++) if ((px + py) % 2 === 0) x.fillRect(px, py, 1, 1);
  });
  x.fillStyle = '#1a3557';
  x.fillRect(x0 + 2, y0, largura - 4, 1);
  x.fillRect(x0 + 1, cy, largura - 2, 1);
  x.fillRect(x0, y0 + 2, 1, alto - 3);
  x.fillRect(x0 + largura - 1, y0 + 2, 1, alto - 3);
  ponto(x, x0 + 1, y0 + 1, '#1a3557');
  ponto(x, x0 + largura - 2, y0 + 1, '#1a3557');
  x.fillStyle = BRANCO;
  x.fillRect(x0 + 2, y0 + 1, largura - 5, 1);
  x.fillRect(x0 + 1, y0 + 2, 1, Math.round(alto * 0.5));
  x.fillStyle = '#3d7fb0';
  x.fillRect(x0 + largura - 2, y0 + 2, 1, alto - 3);
  x.fillRect(x0 + 2, cy - 1, largura - 4, 1);
  // Reflexo em diagonal.
  const d = Math.round(alto * 0.35);
  for (let k = 0; k < d; k++) {
    ponto(x, x0 + 3 + k, y0 + 3 + d - k, '#d2f3ff');
    if (k < d - 2) ponto(x, x0 + 6 + k, y0 + 5 + d - k, BRANCO);
  }
  if ((anim * 1.3) % 1 < 0.25) estrela(x, x0 + largura - 3, y0 + 2, '#1a3557', '#d2f3ff', BRANCO);
}

/** Anel tracejado girando no chão, um para cada estado com `fx` (na cor do elemento do estado). */
export function desenharAuraDeEstado(x: CanvasRenderingContext2D, c: Conteudo, l: Lutador, cx: number, cy: number, sw: number, anim: number): void {
  const vistos = new Set<string>();
  for (const cd of l.condicoes) {
    if (cd.tipo !== 'estado') continue;
    const e = c.estados[cd.estado];
    if (!e?.fx || e.trava === 'tudo' || vistos.has(e.fx)) continue;
    const p = paletaDoTipo(c, e.fx);
    if (!p) continue;
    vistos.add(e.fx);
    const rx = sw + 3 + vistos.size * 2;
    const ry = Math.max(2, Math.round(rx * 0.36));
    const n = 18;
    for (let k = 0; k < n; k++) {
      if ((k + Math.floor(anim * 6)) % 3 === 2) continue;
      const a = (k / n) * VOLTA + anim * 0.9 * (vistos.size % 2 ? 1 : -1);
      const px = Math.round(cx + Math.cos(a) * rx);
      const py = Math.round(cy + Math.sin(a) * ry);
      x.fillStyle = p.contorno;
      x.fillRect(px, py + 1, 2, 1);
      x.fillStyle = Math.sin(a) > 0 ? p.clara : p.media;
      x.fillRect(px, py, 2, 1);
    }
  }
}

/** Por cima da criatura: bolha de ar, couraça em hexágono, mira de presa, faíscas da estática. */
export function desenharSobreEstado(x: CanvasRenderingContext2D, c: Conteudo, l: Lutador, cx: number, cy: number, h: number, anim: number): void {
  for (const cd of l.condicoes) {
    if (cd.tipo !== 'estado') continue;
    const e = c.estados[cd.estado];
    if (!e?.fx) continue;
    const p = paletaDoTipo(c, e.fx);
    if (!p) continue;
    const meio = cy - h / 2;
    if (e.desviaProjeteis) {
      // Bolha de ar: contorno pontilhado que gira, com o reflexo claro em cima à esquerda.
      const r = Math.round(h * 0.62) + 1;
      const n = Math.max(24, Math.round(VOLTA * r));
      for (let k = 0; k < n; k++) {
        if ((k + Math.floor(anim * 10)) % 6 === 0) continue;
        const a = (k / n) * VOLTA;
        const reflexo = Math.cos(a - 3.9) > 0.6;
        comAlfa(x, reflexo ? 1 : 0.7, () => ponto(x, cx + Math.cos(a) * r, meio + Math.sin(a) * r, reflexo ? BRANCO : p.clara));
      }
      ponto(x, cx - r * 0.45, meio - r * 0.55, BRANCO);
      ponto(x, cx - r * 0.55, meio - r * 0.4, BRANCO);
    } else if (e.refleteProjeteis) {
      // Couraça: hexágono com um brilho que corre pelas arestas.
      const r = Math.round(h * 0.55) + 1;
      const corre = (anim * 1.6) % 1;
      for (let k = 0; k < 6; k++) {
        const a0 = (k / 6) * VOLTA + Math.PI / 6;
        const a1 = a0 + VOLTA / 6;
        x.fillStyle = Math.abs(k / 6 - corre) < 0.17 ? BRANCO : p.clara;
        comAlfa(x, 0.8, () => linha(x, { x: cx + Math.cos(a0) * r, y: meio + Math.sin(a0) * r }, { x: cx + Math.cos(a1) * r, y: meio + Math.sin(a1) * r }, 1));
      }
    } else if (cd.estado === 'presa') {
      // Mira de cantoneiras que pulsa em volta da presa.
      const r = Math.round(h * 0.5) + 3 + Math.round(Math.sin(anim * 6) * 1.2);
      const braco = 3;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        const px = Math.round(cx + sx * r);
        const py = Math.round(meio + sy * r);
        x.fillStyle = p.contorno;
        x.fillRect(Math.min(px, px - sx * braco), py + 1, braco + 1, 1);
        x.fillRect(px + 1, Math.min(py, py - sy * braco), 1, braco + 1);
        x.fillStyle = p.clara;
        x.fillRect(Math.min(px, px - sx * braco), py, braco + 1, 1);
        x.fillRect(px, Math.min(py, py - sy * braco), 1, braco + 1);
      }
      ponto(x, cx, meio, p.media);
    } else if (e.cargas) {
      // Estática: duas faíscas orbitando o corpo.
      const pisca = Math.floor(anim * 8) % 3;
      for (let k = 0; k < 2; k++) {
        if (pisca === k) continue;
        const a = (anim * 3 + k * Math.PI) % VOLTA;
        const px = Math.round(cx + Math.cos(a) * (h * 0.5 + 2));
        const py = Math.round(meio + Math.sin(a) * h * 0.45);
        x.fillStyle = p.contorno;
        x.fillRect(px, py + 1, 2, 1);
        x.fillStyle = p.quente;
        x.fillRect(px, py, 1, 1);
        x.fillStyle = p.media;
        x.fillRect(px + 1, py - 1, 1, 1);
      }
    }
  }
}

/** Buff: setas subindo pelas laterais, na cor do atributo. */
export function desenharBuff(x: CanvasRenderingContext2D, atributo: Atributo, cx: number, cy: number, h: number, anim: number): void {
  const cores = COR_ATRIBUTO[atributo];
  for (let k = 0; k < 2; k++) {
    const s = (anim * 0.9 + k * 0.5) % 1;
    if (s < 0.85) seta(x, cx + (k ? 1 : -1) * (h * 0.5 + 3), cy - 3 - s * (h * 0.9), 1, cores);
  }
}

/**
 * Condições sobre a criatura: estrelas do atordoado, amarras de vinha do preso, anel e gotas da lentidão, chamas do
 * dano contínuo (na cor do elemento do golpe), seta do debuff e a corrente até quem prendeu.
 */
export function desenharCondicoes(x: CanvasRenderingContext2D, j: Jogo, l: Lutador, cx: number, cy: number, by: number, sw: number, anim: number): void {
  const feitas = new Set<string>();
  for (const cd of l.condicoes) {
    if (feitas.has(cd.tipo)) continue;
    feitas.add(cd.tipo);
    switch (cd.tipo) {
      case 'atordoado':
        for (let k = 0; k < 3; k++) {
          const a = anim * 5 + (k * VOLTA) / 3;
          const px = cx + Math.cos(a) * 8;
          const py = by - 5 + Math.sin(a) * 2.5;
          if (Math.sin(a) < -0.3) ponto(x, px, py, '#b07a10');
          else estrela(x, px, py, NAVY, '#ffcd75', BRANCO);
        }
        break;
      case 'preso': {
        // Duas amarras de vinha nos pés, com folhinhas nas pontas.
        const largura = Math.max(5, sw + 1);
        for (const [alto, recuo] of [
          [1, 0],
          [5, 2],
        ] as const) {
          const meia = Math.max(3, largura - recuo);
          for (let i = -meia; i <= meia; i++) {
            const curva = Math.round(Math.sqrt(Math.max(0, 1 - (i / meia) ** 2)) * 1.6);
            const px = cx + i;
            const py = cy - alto + curva;
            x.fillStyle = '#0c2e22';
            x.fillRect(px, py + 1, 1, 1);
            x.fillStyle = (i + recuo + Math.floor(anim * 5)) % 4 === 0 ? '#a7f070' : '#38b764';
            x.fillRect(px, py, 1, 1);
          }
          for (const lado of [-1, 1]) {
            const px = cx + lado * (meia + 1);
            const py = cy - alto - 1;
            x.fillStyle = '#0c2e22';
            x.fillRect(px - 1, py - 1, 3, 3);
            x.fillStyle = '#38b764';
            x.fillRect(px, py, 1, 1);
            ponto(x, px + lado, py - 1, '#a7f070');
          }
        }
        break;
      }
      case 'lentidao': {
        // Anel tracejado girando devagar nos pés e duas gotas descendo pelos lados.
        const rx = sw + 3;
        const ry = Math.max(2, Math.round(rx * 0.35));
        for (let k = 0; k < 12; k += 2) {
          const a = (k / 12) * VOLTA - anim * 1.2;
          const px = Math.round(cx + Math.cos(a) * rx);
          const py = Math.round(cy + Math.sin(a) * ry);
          x.fillStyle = NAVY;
          x.fillRect(px, py + 1, 2, 1);
          x.fillStyle = '#41a6f6';
          x.fillRect(px, py, 2, 1);
        }
        for (const lado of [-1, 1]) {
          const s = (anim * 0.7 + (lado > 0 ? 0.5 : 0)) % 1;
          const px = Math.round(cx + lado * (sw + 1));
          const py = Math.round(cy - 12 + s * 9);
          x.fillStyle = NAVY;
          x.fillRect(px - 1, py, 3, 3);
          x.fillRect(px, py - 1, 1, 5);
          x.fillStyle = '#3b5dc9';
          x.fillRect(px, py, 1, 3);
          x.fillStyle = '#73eff7';
          x.fillRect(px, py, 1, 1);
        }
        break;
      }
      case 'dano-continuo': {
        // Labaredinhas nas laterais e brasas subindo, na cor do elemento do golpe.
        const p = paletaDoTipo(j.c, j.c.golpes[cd.golpe]?.tipo ?? '') ?? PALETA_FOGO;
        const largura = Math.max(4, sw);
        for (let k = 0; k < 3; k++) {
          const fase = anim * 8 + k * 2.3;
          const lado = k === 2 ? 0 : k ? 1 : -1;
          const px = Math.round(cx + lado * (largura + 1) + Math.sin(anim * 3 + k) * 0.6);
          const py = Math.round(cy - (k === 2 ? 1 : 3));
          const alto = (k === 2 ? 2 : 3) + Math.round((Math.sin(fase) + 1) * (k === 2 ? 0.8 : 1.3));
          x.fillStyle = p.contorno;
          x.fillRect(px - 2, py - 1, 5, 2);
          x.fillRect(px - 1, py - alto, 3, alto);
          x.fillRect(px, py - alto - 1, 1, 1);
          x.fillStyle = p.clara;
          x.fillRect(px - 1, py - 1, 3, 1);
          x.fillRect(px, py - alto + 1, 1, alto - 1);
          x.fillStyle = p.quente;
          x.fillRect(px, py - 1, 1, 1);
          ponto(x, px, py - alto, p.media);
          const brasa = (anim * 1.7 + k * 0.41) % 1;
          if (brasa < 0.7) ponto(x, px + Math.round(Math.sin(fase * 0.6) * 1.5), py - alto - 2 - (brasa / 0.7) * 7, brasa < 0.35 ? p.clara : p.media);
        }
        break;
      }
      case 'debuff': {
        const [, cor, brilho] = COR_ATRIBUTO[cd.atributo];
        seta(x, cx + 12, by + 1 + Math.round(Math.sin(anim * 5)), -1, [NAVY, cor, brilho]);
        break;
      }
      case 'acorrentado': {
        // Corrente de elos entre a criatura e quem prendeu, com uma barriga no meio.
        const dono = lutadorPorUid(j.b, cd.autor);
        if (!dono || dono.desmaiado) break;
        const pa = projetar(l.x, l.y);
        const pb = projetar(dono.x, dono.y);
        const a = { x: pa.x, y: pa.y - j.alturaSprite(l) * 0.45 };
        const b = { x: pb.x, y: pb.y - j.alturaSprite(dono) * 0.45 };
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const n = Math.max(2, Math.round(d / 3.5));
        const barriga = Math.min(7, d * 0.12);
        for (let k = 0; k <= n; k++) {
          const s = k / n;
          const px = a.x + (b.x - a.x) * s;
          const py = a.y + (b.y - a.y) * s + Math.sin(s * Math.PI) * barriga;
          const deitado = k % 2 === 0;
          const rx = deitado ? 1.6 : 0.9;
          const ry = deitado ? 1 : 1.6;
          x.fillStyle = '#1c2433';
          disco(x, px, py, rx + 1, ry + 1);
          x.fillStyle = '#8a9bb0';
          disco(x, px, py, rx, ry);
          ponto(x, px, py, deitado ? '#1c2433' : '#d4e4f2');
        }
        break;
      }
    }
  }
}

// ---------- Objetos de golpe ----------

const ARCANO: Paleta = { contorno: '#241040', escura: '#5a2a8f', media: '#9b5bd6', clara: '#d6a8f5', quente: '#f4f4f4' };
const ELETRICIDADE: Paleta = { contorno: '#2a1f4d', escura: '#c27a12', media: '#f2c230', clara: '#fff09a', quente: '#f4f4f4' };
const MINERAL: Paleta = { contorno: '#1c2433', escura: '#4d5b6e', media: '#8a9bb0', clara: '#d4e4f2', quente: '#f4f4f4' };

/**
 * Portal (buraco escuro com aro tracejado girando e brilhos), pino de para-raios (haste com globo que pisca e
 * faísca), pilar (cristal facetado) e a cópia falsa. `t` em segundos; `piscar` alterna 0 e 1.
 */
export function desenharObjetoComArte(x: CanvasRenderingContext2D, j: Jogo, o: Objeto, t: number, piscar: number, campo: (p: Paleta, raio: number) => void): void {
  const c = j.c;
  const q = projetar(o.x, o.y);
  const cx = Math.round(q.x);
  const cy = Math.round(q.y);
  switch (o.tipo) {
    case 'portal': {
      const p = paletaDoTipo(c, 'arcano') ?? ARCANO;
      const e = elipseNoChao(o.x, o.y, o.raio);
      comAlfa(x, 0.7, () => {
        x.fillStyle = p.contorno;
        disco(x, e.x, e.y, e.rx, e.ry);
      });
      comAlfa(x, 0.55, () => trama(x, e.x, e.y, e.rx * 0.75, e.ry * 0.75, p.escura, Math.floor(t * 8)));
      const n = Math.max(20, Math.round(Math.PI * (e.rx + e.ry)));
      for (let k = 0; k < n; k++) {
        const s = k / n;
        if (Math.floor(s * 12 - t * 3 + 120) % 3 === 0) continue;
        const a = s * VOLTA;
        const px = Math.round(e.x + Math.cos(a) * e.rx);
        const py = Math.round(e.y + Math.sin(a) * e.ry);
        x.fillStyle = p.contorno;
        x.fillRect(px, py + 1, 1, 1);
        x.fillStyle = Math.sin(a) < 0 ? p.clara : p.media;
        x.fillRect(px, py, 1, 1);
      }
      for (let k = 0; k < 4; k++) {
        const a = t * 2.5 + (k * VOLTA) / 4;
        const r = 0.35 + 0.3 * ((t * 0.8 + k * 0.25) % 1);
        ponto(x, e.x + Math.cos(a) * e.rx * r, e.y + Math.sin(a) * e.ry * r, k % 2 ? p.quente : p.clara);
      }
      break;
    }
    case 'pino': {
      const p = paletaDoTipo(c, 'eletricidade') ?? ELETRICIDADE;
      campo(p, o.raio);
      x.fillStyle = NAVY;
      x.fillRect(cx - 3, cy - 1, 7, 2);
      x.fillRect(cx - 1, cy - 11, 3, 11);
      x.fillStyle = '#566c86';
      x.fillRect(cx - 2, cy - 1, 5, 1);
      x.fillRect(cx, cy - 10, 1, 10);
      x.fillStyle = '#94b0c2';
      x.fillRect(cx, cy - 10, 1, 4);
      x.fillStyle = p.contorno;
      x.fillRect(cx - 2, cy - 15, 5, 5);
      x.fillStyle = piscar ? p.clara : p.media;
      x.fillRect(cx - 1, cy - 14, 3, 3);
      ponto(x, cx, cy - 14, p.quente);
      if (Math.floor(t * 7) % 3 === 0) {
        const lado = Math.floor(t * 7) % 2 ? 1 : -1;
        x.fillStyle = p.contorno;
        x.fillRect(cx + lado * 3, cy - 14, 2, 1);
        x.fillRect(cx + lado * 4, cy - 16, 1, 3);
        ponto(x, cx + lado * 3, cy - 15, p.quente);
        ponto(x, cx + lado * 4, cy - 17, p.clara);
      }
      break;
    }
    case 'pilar': {
      // Cristal facetado: ponta, lado claro, lado médio, aresta escura e um brilho que passa.
      const p = paletaDoTipo(c, 'mineral') ?? MINERAL;
      const meia = Math.max(2, Math.round(o.raio * 0.8));
      const alto = 15;
      const ponta = meia + 2;
      const larg = (k: number) => (k < ponta ? Math.max(0, Math.round((k / ponta) * meia)) : meia);
      comAlfa(x, 0.3, () => {
        x.fillStyle = NAVY;
        disco(x, cx, cy, meia + 3, 2);
      });
      x.fillStyle = p.contorno;
      for (let k = 0; k <= alto; k++) {
        const w = larg(k);
        x.fillRect(cx - w - 1, cy - alto + k - 1, w * 2 + 3, 1);
      }
      x.fillRect(cx - meia - 1, cy, meia * 2 + 3, 1);
      for (let k = 0; k <= alto; k++) {
        const w = larg(k);
        const py = cy - alto + k;
        if (k === 0) {
          ponto(x, cx, py, p.quente);
          continue;
        }
        x.fillStyle = p.clara;
        x.fillRect(cx - w, py, w, 1);
        x.fillStyle = p.media;
        x.fillRect(cx, py, w + 1, 1);
        x.fillStyle = p.escura;
        x.fillRect(cx + w, py, 1, 1);
        if (k > 2) {
          x.fillStyle = p.quente;
          x.fillRect(cx - Math.max(1, Math.round(w * 0.6)), py, 1, 1);
        }
      }
      const brilho = (t * 0.7 + o.x * 0.01) % 1;
      if (brilho < 0.2) estrela(x, cx - Math.round(meia * 0.5), cy - alto + 3 + (Math.round(brilho * 40) % (alto - 5)), p.contorno, p.clara, p.quente);
      break;
    }
    case 'copia': {
      const dono = lutadorPorUid(j.b, o.autor);
      const sp = spriteDe(c, dono.especie);
      comAlfa(x, 0.55 + piscar * 0.15, () => x.drawImage(canvasDoSprite(c, dono.especie, dono.olhando > 0, null), cx - sp.n / 2, cy - sp.pe));
      break;
    }
  }
}
