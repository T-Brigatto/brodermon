// Geometria das formas de golpe no plano do chão. O motor usa para saber quem foi
// atingido; o desenho usa a mesma conta para pintar as marcas, as zonas e os campos.

import type { EfeitoForma } from '../conteudo/esquema';
import type { Acao, Geometria, Lutador, Ponto } from './modelo';

/** Onde a forma está: centro da área e da parede, ou origem e direção (unitária) do cone e da linha. */
export interface Posicao extends Ponto {
  ux: number;
  uy: number;
}

/** A geometria de um efeito de forma. `escala` aumenta a área (estado "gigante" nas áreas em volta de si). */
export function geometriaDe(ef: EfeitoForma, escala = 1): Geometria {
  switch (ef.efeito) {
    case 'area':
      return { forma: 'area', raio: ef.raio * escala };
    case 'cone':
      return { forma: 'cone', alcance: ef.alcance, angulo: ef.angulo };
    case 'linha':
      return { forma: 'linha', alcance: ef.alcance, largura: ef.largura };
    case 'parede':
      return { forma: 'parede', largura: ef.largura, espessura: ef.espessura };
  }
}

/** A forma, posta em `z`, encosta num corpo de raio `r` com centro em `p`? Com `r` = 0, diz se o ponto está dentro. */
export function acertaForma(g: Geometria, z: Posicao, p: Ponto, r: number): boolean {
  const dx = p.x - z.x;
  const dy = p.y - z.y;
  const d = Math.hypot(dx, dy);
  switch (g.forma) {
    case 'area':
      return d <= g.raio + r;
    case 'cone': {
      if (d <= r) return true;
      if (d > g.alcance + r) return false;
      const cos = (dx * z.ux + dy * z.uy) / d;
      const angulo = Math.acos(Math.max(-1, Math.min(1, cos)));
      // O corpo entra no leque se alguma parte dele cruzar a borda: soma o ângulo que ele ocupa visto da origem.
      return angulo <= (g.angulo * Math.PI) / 360 + Math.asin(Math.min(1, r / d));
    }
    case 'linha': {
      const ao = dx * z.ux + dy * z.uy;
      const lado = Math.abs(dx * z.uy - dy * z.ux);
      return ao >= -r && ao <= g.alcance + r && lado <= g.largura / 2 + r;
    }
    case 'parede': {
      // A parede fica atravessada: a espessura vai na direção (ux, uy) e a largura de lado.
      const frente = Math.abs(dx * z.ux + dy * z.uy);
      const lado = Math.abs(dx * z.uy - dy * z.ux);
      return frente <= g.espessura / 2 + r && lado <= g.largura / 2 + r;
    }
  }
}

/** Ponto mais distante da forma na direção dela (a ponta do cone e da linha). */
export function pontaDa(g: Geometria, z: Posicao): Ponto {
  const alcance = g.forma === 'cone' || g.forma === 'linha' ? g.alcance : 0;
  return { x: z.x + z.ux * alcance, y: z.y + z.uy * alcance };
}

/**
 * Onde a forma cai: a área no rival (na mira), em si ou no meio; o cone e a linha saem de quem usa (ou da ponta
 * da forma anterior), na direção da mira; a parede fica atravessada no ponto escolhido.
 */
export function posicaoDaForma(l: Lutador, a: Acao, ef: EfeitoForma, topo?: { x: number; y: number }): Posicao {
  const { ux, uy } = a.mira;
  const meio = { x: (l.x + a.mira.x) / 2, y: (l.y + a.mira.y) / 2, ux, uy };
  switch (ef.efeito) {
    case 'area':
      if (ef.centro === 'si') return { x: l.x, y: l.y, ux, uy };
      return ef.centro === 'rival' ? { x: a.mira.x, y: a.mira.y, ux, uy } : meio;
    case 'cone':
      if (ef.origem === 'ponta' && a.ponta) {
        return ef.inverte ? { x: a.ponta.x, y: a.ponta.y, ux: -a.ponta.ux, uy: -a.ponta.uy } : { ...a.ponta };
      }
      return ef.inverte ? { x: l.x, y: l.y, ux: -ux, uy: -uy } : { x: l.x, y: l.y, ux, uy };
    case 'linha':
      return { x: l.x, y: l.y, ux, uy };
    case 'parede':
      if (ef.centro === 'si') return { x: l.x, y: l.y, ux, uy };
      if (ef.centro === 'rival') return { x: a.mira.x, y: a.mira.y, ux, uy };
      if (ef.centro === 'topo' && topo) return { x: topo.x, y: topo.y, ux: 0, uy: 1 };
      return meio;
  }
}
