// Decisões automáticas. `escolherGolpe` vale para as duas equipes: é o que faz
// os golpes "saírem sozinhos" quando não há nada na fila.

import type { Conteudo, Regras } from '../conteudo/esquema';
import { distancia, especieDe, golpeDe, temEstado } from './consulta';
import { eficacia } from './eficacia';
import type { Mods } from './estados';
import type { Lutador, Tatica } from './modelo';
import { perfilDoGolpe } from './perfil';

/** Tática da equipe pilotada pela IA: avança e passa a esquivar com pouco HP. */
export function taticaDaIa(l: Lutador, regras: Regras): Tatica {
  return l.hp < l.hpMax * regras.ia.hpEsquiva ? 'evasivo' : 'perseguir';
}

/**
 * Primeiro golpe pronto que faz sentido agora, ou -1. A função de cada golpe vem dos efeitos:
 * - atinge o rival: precisa dele ao alcance; golpe só de dano não é usado se a eficácia for 0;
 * - cura (na hora ou por segundo): com HP abaixo de `ia.hpCura`;
 * - recuo: esquivando (HP abaixo de `ia.hpEsquiva`) e com o rival a menos de `ia.distanciaFuga`;
 * - avanço sem dano: com o rival além da distância de perseguição (e dentro do alcance, se houver);
 * - buff: com HP acima de `ia.hpBuff` e sem buff ativo; estado em si: se ainda não estiver com ele;
 * - cópia: só se o rival já usou algum golpe; munição de campo: só se houver o campo.
 */
export function escolherGolpe(c: Conteudo, l: Lutador, alvo: Lutador, m: Mods | null = null, campos: string[] = []): number {
  const R = c.regras;
  const dist = distancia(l, alvo);
  const tiposAlvo = especieDe(c, alvo).tipos;
  for (let i = 0; i < l.golpes.length; i++) {
    const uso = l.golpes[i]!;
    if (uso.recarga > 0) continue;
    const g = golpeDe(c, uso.id);
    const p = perfilDoGolpe(g);
    const curaPorSegundo = p.estadoEmSi !== null && !!c.estados[p.estadoEmSi]?.curaPorSegundo;
    if (!p.atingeAlvo) {
      if (p.cura !== null || curaPorSegundo) {
        if (l.hp < l.hpMax * R.ia.hpCura) return i;
      } else if (p.movimento === 'recuar') {
        if (l.hp < l.hpMax * R.ia.hpEsquiva && dist < R.ia.distanciaFuga) return i;
      } else if (p.movimento === 'avancar') {
        if (dist > R.taticas.perseguir.longe && (g.alcance === undefined || dist <= g.alcance)) return i;
      } else if (p.buff) {
        if (l.hp > l.hpMax * R.ia.hpBuff && !l.buff) return i;
      } else if (p.estadoEmSi) {
        if (!temEstado(l, p.estadoEmSi)) return i;
      }
      continue;
    }
    const extra = m?.cacada && m.cacada.alvo === alvo.uid ? m.cacada.alcance : 0;
    if (dist > (g.alcance ?? 0) * (m?.areaPerto ?? 1) + extra) continue;
    if (p.copia && !alvo.ultimoGolpe) continue;
    if (p.usaCampo && !campos.includes(p.usaCampo)) continue;
    if (p.causaDano && !p.controle && eficacia(c, g.tipo, tiposAlvo) === 0) continue;
    return i;
  }
  return -1;
}
