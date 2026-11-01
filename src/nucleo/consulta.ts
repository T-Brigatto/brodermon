// Atalhos para ler o conteúdo e o estado. O conteúdo já foi validado,
// então uma referência que falta aqui é um erro de programação.

import type { Conteudo, Especie, Golpe } from '../conteudo/esquema';
import type { Combatente } from './dano';
import type { Atributo, Condicao, Equipe, EstadoBatalha, Lutador, Ponto } from './modelo';

export function especieDe(c: Conteudo, l: Lutador): Especie {
  const e = c.especies[l.especie];
  if (!e) throw new Error(`espécie "${l.especie}" não existe no conteúdo`);
  return e;
}

export function golpeDe(c: Conteudo, id: string): Golpe {
  const g = c.golpes[id];
  if (!g) throw new Error(`golpe "${id}" não existe no conteúdo`);
  return g;
}

/** Soma do buff ativo menos os debuffs naquele atributo. */
function modificador(l: Lutador, atributo: Atributo): number {
  let m = l.buff?.atributo === atributo ? l.buff.valor : 0;
  for (const cd of l.condicoes) if (cd.tipo === 'debuff' && cd.atributo === atributo) m -= cd.valor;
  return m;
}

/** Atributos que contam no dano agora, já com buff e debuffs. */
export function combatente(c: Conteudo, l: Lutador): Combatente {
  return {
    tipos: especieDe(c, l).tipos,
    ataque: Math.max(1, l.ataque + modificador(l, 'ataque')),
    defesa: Math.max(1, l.defesa + modificador(l, 'defesa')),
  };
}

/** Velocidade de agora: buff e debuffs somados, e a lentidão mais forte multiplicando. */
export function velocidadeAtual(l: Lutador): number {
  let fator = 1;
  for (const cd of l.condicoes) if (cd.tipo === 'lentidao') fator = Math.min(fator, cd.fator);
  return Math.max(0, l.velocidade + modificador(l, 'velocidade')) * fator;
}

export function temCondicao(l: Lutador, tipo: Condicao['tipo']): boolean {
  return l.condicoes.some((cd) => cd.tipo === tipo);
}

export const outra = (e: Equipe): Equipe => (e === 0 ? 1 : 0);

export function ativo(b: EstadoBatalha, e: Equipe): Lutador {
  const eq = b.equipes[e];
  const l = eq.lutadores[eq.ativo];
  if (!l) throw new Error(`equipe ${e} sem lutador ativo`);
  return l;
}

export function lutadorPorUid(b: EstadoBatalha, uid: number): Lutador {
  for (const eq of b.equipes) for (const l of eq.lutadores) if (l.uid === uid) return l;
  throw new Error(`lutador ${uid} não existe`);
}

export const distancia = (a: Ponto, b: Ponto): number => Math.hypot(b.x - a.x, b.y - a.y);
