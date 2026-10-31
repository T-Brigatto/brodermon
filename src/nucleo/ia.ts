// Decisões automáticas. `escolherGolpe` vale para as duas equipes: é o que faz
// os golpes "saírem sozinhos" quando não há nada na fila.

import type { Conteudo, Regras } from '../conteudo/esquema';
import { distancia, especieDe, golpeDe } from './consulta';
import { eficacia } from './eficacia';
import type { Lutador, Tatica } from './modelo';

/** Tática da equipe pilotada pela IA: avança e passa a esquivar com pouco HP. */
export function taticaDaIa(l: Lutador, regras: Regras): Tatica {
  return l.hp < l.hpMax * regras.ia.hpEsquiva ? 'evasivo' : 'perseguir';
}

/**
 * Primeiro golpe pronto que faz sentido agora, ou -1.
 * Buff: só com HP acima de `ia.hpBuff` e sem buff ativo. Dano: alvo ao alcance e eficácia maior que 0.
 */
export function escolherGolpe(c: Conteudo, l: Lutador, alvo: Lutador): number {
  const dist = distancia(l, alvo);
  const tiposAlvo = especieDe(c, alvo).tipos;
  for (let i = 0; i < l.golpes.length; i++) {
    const uso = l.golpes[i]!;
    if (uso.recarga > 0) continue;
    const g = golpeDe(c, uso.id);
    if (!g.dano) {
      if (g.buff && l.hp > l.hpMax * c.regras.ia.hpBuff && !l.buff) return i;
      continue;
    }
    if (dist > (g.alcance ?? 0)) continue;
    if (eficacia(c, g.tipo, tiposAlvo) === 0) continue;
    return i;
  }
  return -1;
}
