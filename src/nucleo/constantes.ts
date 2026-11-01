// Números fixos do passo da simulação (os de jogo ficam em `regras.json`).

/** Duração de um passo: 60 passos por segundo de jogo. */
export const PASSO = 1 / 60;

/**
 * Folga para os temporizadores dos efeitos: 0,25 − 15 × (1/60) sobra um resíduo positivo minúsculo
 * em ponto flutuante, e sem a folga um avanço de 0,25 s duraria 16 passos em vez de 15.
 */
export const EPS = 1e-9;

/** Folga de distância para um efeito direto ainda acertar (o rival pode ter andado um pouco). */
export const FOLGA_ALCANCE = 4;

/** Um projétil que sai mais que isto da área andável já não alcança ninguém e some. */
export const MARGEM_PROJETIL = 24;

/** Segundos sem poder entrar num portal de novo, depois de atravessar um. */
export const ESPERA_PORTAL = 0.6;
