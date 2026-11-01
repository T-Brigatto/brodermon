// Decisões automáticas. `escolherGolpe` vale para as duas equipes: é o que faz
// os golpes "saírem sozinhos" quando não há nada na fila.

import type { Conteudo, Regras } from '../conteudo/esquema';
import { distancia, especieDe, golpeDe } from './consulta';
import { eficacia } from './eficacia';
import type { Lutador, Tatica } from './modelo';
import { perfilDoGolpe } from './perfil';

/** Tática da equipe pilotada pela IA: avança e passa a esquivar com pouco HP. */
export function taticaDaIa(l: Lutador, regras: Regras): Tatica {
  return l.hp < l.hpMax * regras.ia.hpEsquiva ? 'evasivo' : 'perseguir';
}

/**
 * Primeiro golpe pronto que faz sentido agora, ou -1. A função de cada golpe vem dos efeitos:
 * - atinge o rival: precisa dele ao alcance; golpe só de dano não é usado se a eficácia for 0;
 * - cura: com HP abaixo de `ia.hpCura`;
 * - recuo: esquivando (HP abaixo de `ia.hpEsquiva`) e com o rival a menos de `ia.distanciaFuga`;
 * - avanço sem dano: com o rival além da distância de perseguição (e dentro do alcance, se houver);
 * - buff: com HP acima de `ia.hpBuff` e sem buff ativo.
 */
export function escolherGolpe(c: Conteudo, l: Lutador, alvo: Lutador): number {
  const R = c.regras;
  const dist = distancia(l, alvo);
  const tiposAlvo = especieDe(c, alvo).tipos;
  for (let i = 0; i < l.golpes.length; i++) {
    const uso = l.golpes[i]!;
    if (uso.recarga > 0) continue;
    const g = golpeDe(c, uso.id);
    const p = perfilDoGolpe(g);
    if (!p.atingeAlvo) {
      if (p.cura !== null) {
        if (l.hp < l.hpMax * R.ia.hpCura) return i;
      } else if (p.movimento === 'recuar') {
        if (l.hp < l.hpMax * R.ia.hpEsquiva && dist < R.ia.distanciaFuga) return i;
      } else if (p.movimento === 'avancar') {
        if (dist > R.taticas.perseguir.longe && (g.alcance === undefined || dist <= g.alcance)) return i;
      } else if (p.buff) {
        if (l.hp > l.hpMax * R.ia.hpBuff && !l.buff) return i;
      }
      continue;
    }
    if (dist > (g.alcance ?? 0)) continue;
    if (p.causaDano && !p.controle && eficacia(c, g.tipo, tiposAlvo) === 0) continue;
    return i;
  }
  return -1;
}
