import type { Conteudo } from '../conteudo/esquema';
import { eficacia } from './eficacia';

export interface Combatente {
  tipos: readonly string[];
  ataque: number;
  defesa: number;
}

/**
 * dano = max(mínimo, floor(poder / divisor × ataque / defesa × multiplicador × eficácia × STAB × aleatório × ajuste))
 *
 * `sorteio` é um número em [0, 1) vindo do RNG da batalha; vira um fator entre `aleatorioMin` e `aleatorioMax`.
 * Eficácia 0 dá dano 0 ("sem efeito").
 */
export function calcularDano(
  conteudo: Conteudo,
  atacante: Combatente,
  defensor: Combatente,
  golpe: { tipo: string; poder: number },
  sorteio: number,
): { valor: number; eficacia: number } {
  const D = conteudo.regras.dano;
  const ef = eficacia(conteudo, golpe.tipo, defensor.tipos);
  if (ef === 0 || golpe.poder <= 0) return { valor: 0, eficacia: ef };
  const stab = atacante.tipos.includes(golpe.tipo) ? D.stab : 1;
  const aleatorio = D.aleatorioMin + sorteio * (D.aleatorioMax - D.aleatorioMin);
  const bruto = (golpe.poder / D.divisor) * (atacante.ataque / defensor.defesa) * D.multiplicador * ef * stab * aleatorio * D.ajuste;
  return { valor: Math.max(D.minimo, Math.floor(bruto)), eficacia: ef };
}
