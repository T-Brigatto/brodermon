import type { Regras } from '../conteudo/esquema';
import { velocidadeAtual } from './consulta';
import type { Lutador, Ponto, Tatica } from './modelo';

/** Anda até `p`. Devolve true quando chegou (a menos de `folga`). */
export function moverPara(l: Lutador, p: Ponto, folga: number): boolean {
  const dx = p.x - l.x;
  const dy = p.y - l.y;
  const d = Math.hypot(dx, dy);
  if (d > folga) {
    const v = velocidadeAtual(l);
    l.vx = (dx / d) * v;
    l.vy = (dy / d) * v;
    return false;
  }
  l.vx = 0;
  l.vy = 0;
  return true;
}

/** Movimento automático quando ninguém está guiando a criatura. Sem alvo, ela só desacelera. */
export function moverPorTatica(l: Lutador, alvo: Lutador | null, tatica: Tatica, regras: Regras): void {
  if (!alvo) {
    l.vx *= 0.8;
    l.vy *= 0.8;
    return;
  }
  const T = regras.taticas;
  const dx = alvo.x - l.x;
  const dy = alvo.y - l.y;
  const dist = Math.hypot(dx, dy);
  const nx = dist > 0.5 ? dx / dist : 0;
  const ny = dist > 0.5 ? dy / dist : 0;
  const s = velocidadeAtual(l);

  switch (tatica) {
    case 'perseguir':
      if (dist > T.perseguir.longe) {
        l.vx = nx * s;
        l.vy = ny * s;
      } else if (dist < T.perseguir.perto) {
        l.vx = -nx * s * 0.5;
        l.vy = -ny * s * 0.5;
      } else {
        l.vx *= 0.85;
        l.vy *= 0.85;
      }
      return;
    case 'manter': {
      const M = T.manter;
      if (Math.abs(dist - M.distancia) > M.folga) {
        const sentido = dist > M.distancia ? 1 : -1;
        l.vx = nx * s * M.fator * sentido;
        l.vy = ny * s * M.fator * sentido;
      } else {
        l.vx *= 0.9;
        l.vy *= 0.9;
      }
      return;
    }
    case 'parado':
      l.vx *= 0.85;
      l.vy *= 0.85;
      return;
    case 'evasivo': {
      const E = T.evasivo;
      const onda = Math.sin(l.relogio * E.frequencia);
      l.vx = (-nx + ny * onda * E.ondulacao) * s * E.fator;
      l.vy = (-ny - nx * onda * E.ondulacao) * s * E.fator;
      return;
    }
  }
}
