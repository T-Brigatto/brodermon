// Ajudantes dos testes do pacote "vale": duelo de laboratório, posições, estados e campos postos à mão.

import type { Conteudo } from '../src/conteudo/esquema';
import { vale } from '../src/conteudo/pacotes';
import { PASSO, aplicarComandos, avancar, criarBatalha, golpeDe, type Comando, type EstadoBatalha, type Evento, type Lutador } from '../src/nucleo';
import { criarCampo } from '../src/nucleo/campo';

export const conteudo = (): Conteudo => structuredClone(vale);

/** Espécie de laboratório de cada elemento. */
export const DO_TIPO: Record<string, string> = Object.fromEntries(Object.entries(vale.especies).map(([id, e]) => [e.tipos[0], id]));

/**
 * A (do elemento do primeiro golpe, só com `golpes`) contra B (Boneco Arcano, que não resiste a nada),
 * os dois parados na tática FIRME. Sem `golpesB`, B não ataca.
 */
export function duelo(c: Conteudo, golpes: string[], op: { especieA?: string; especieB?: string; golpesB?: string[]; semente?: number } = {}) {
  const tipo = golpeDe(c, golpes[0]!).tipo;
  const b = criarBatalha(c, {
    semente: op.semente ?? 7,
    equipes: [
      { piloto: 'jogador', time: [{ especie: op.especieA ?? DO_TIPO[tipo]!, golpes }] },
      { piloto: 'jogador', time: [{ especie: op.especieB ?? 'boneco-arcano', golpes: op.golpesB ?? ['espelho-arcano'] }, 'boneco-primordial'] },
    ],
  });
  aplicarComandos(b, c, [
    { tipo: 'tatica', equipe: 0, tatica: 'parado' },
    { tipo: 'tatica', equipe: 1, tatica: 'parado' },
  ]);
  const A = b.equipes[0].lutadores[0]!;
  const B = b.equipes[1].lutadores[0]!;
  if (!op.golpesB) travar(B);
  return { b, A, B };
}

/** Golpes de `l` ficam sem uso (recarga enorme). */
export const travar = (l: Lutador) => l.golpes.forEach((g) => (g.recarga = 1e9));

export function pos(l: Lutador, x: number, y: number): void {
  l.x = x;
  l.y = y;
}

/** Roda `segundos`; os comandos entram no primeiro passo. */
export function rodar(b: EstadoBatalha, c: Conteudo, segundos: number, comandos: Comando[] = []): Evento[] {
  const ev: Evento[] = [];
  for (let i = 0; i < Math.round(segundos / PASSO); i++) ev.push(...avancar(b, c, i === 0 ? comandos : []));
  return ev;
}

/** Roda até a condição valer (ou o limite, em segundos). */
export function ate(b: EstadoBatalha, c: Conteudo, cond: (ev: Evento[]) => boolean, limite = 10, comandos: Comando[] = []): Evento[] {
  const ev: Evento[] = [];
  for (let i = 0; i < limite / PASSO; i++) {
    const passo = avancar(b, c, i === 0 ? comandos : []);
    ev.push(...passo);
    if (cond(passo)) break;
  }
  return ev;
}

export type Dano = Extract<Evento, { tipo: 'dano' }>;
export const danos = (ev: Evento[], golpe?: string) => ev.filter((e): e is Dano => e.tipo === 'dano' && (!golpe || e.golpe === golpe));
export const soma = (ev: Evento[], golpe?: string) => danos(ev, golpe).reduce((s, e) => s + e.valor, 0);

/** Roda até o primeiro dano de `golpe` e devolve o valor (0 se não houve). */
export function primeiroDano(b: EstadoBatalha, c: Conteudo, golpe: string, limite = 5): number {
  const ev = ate(b, c, (p) => danos(p, golpe).length > 0, limite);
  return danos(ev, golpe)[0]?.valor ?? 0;
}

/** Põe um estado de `estados.json` direto na criatura. */
export function comEstado(l: Lutador, estado: string, restante = 10): void {
  l.condicoes.push({ tipo: 'estado', estado, restante, autor: l.uid, alvo: null, cargas: 0, andado: 0 });
}

/** Põe um campo redondo de `autor` no chão. O golpe dá o tipo do dano dos pulsos. */
export function campo(b: EstadoBatalha, c: Conteudo, autor: Lutador, id: string, x: number, y: number, raio: number, golpe: string, duracao = 10) {
  return criarCampo(b, c, autor, golpe, id, { forma: 'area', raio }, { x, y, ux: 1, uy: 0 }, duracao);
}
