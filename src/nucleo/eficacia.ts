import type { Conteudo } from '../conteudo/esquema';

/** Multiplicador de um golpe do tipo `tipoGolpe` contra um alvo com `tiposAlvo` (dois tipos multiplicam). */
export function eficacia(conteudo: Conteudo, tipoGolpe: string, tiposAlvo: readonly string[]): number {
  const tabela = conteudo.tipos[tipoGolpe]?.eficacia ?? {};
  return tiposAlvo.reduce((m, t) => m * (tabela[t] ?? 1), 1);
}

/**
 * Vantagem de tipo de A sobre B: 1 (vantagem), -1 (desvantagem) ou 0.
 * Soma o melhor ataque de A contra B e o melhor ataque de B contra A.
 */
export function confronto(conteudo: Conteudo, tiposA: readonly string[], tiposB: readonly string[]): -1 | 0 | 1 {
  const ataque = Math.max(...tiposA.map((t) => eficacia(conteudo, t, tiposB)));
  const defesa = Math.max(...tiposB.map((t) => eficacia(conteudo, t, tiposA)));
  const s = (ataque >= 2 ? 1 : ataque < 1 ? -1 : 0) + (defesa >= 2 ? -1 : defesa < 1 ? 1 : 0);
  return s > 0 ? 1 : s < 0 ? -1 : 0;
}
