// Atalhos para ler o conteúdo e o estado. O conteúdo já foi validado,
// então uma referência que falta aqui é um erro de programação.

import type { Conteudo, Especie, Golpe } from '../conteudo/esquema';
import type { Combatente } from './dano';
import type { Equipe, EstadoBatalha, Lutador, Ponto } from './modelo';

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

/** Atributos que contam no dano agora, já somando o buff ativo. */
export function combatente(c: Conteudo, l: Lutador): Combatente {
  const b = l.buff;
  return {
    tipos: especieDe(c, l).tipos,
    ataque: l.ataque + (b?.atributo === 'ataque' ? b.valor : 0),
    defesa: l.defesa + (b?.atributo === 'defesa' ? b.valor : 0),
  };
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
