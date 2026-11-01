// O que um golpe faz, lido da lista de efeitos. Motor, IA e interface usam a mesma leitura.

import type { Efeito, Golpe } from '../conteudo/esquema';

type Buff = Extract<Efeito, { efeito: 'buff' }>;

export interface PerfilGolpe {
  /** Algum efeito atinge o rival, direto ou por projétil. */
  atingeAlvo: boolean;
  /** Tem efeito direto no rival: precisa dele ao alcance na hora (corpo a corpo). Na fila, a criatura anda até ele. */
  contato: boolean;
  /** Causa dano, direto ou por projétil. */
  causaDano: boolean;
  /** Tem algum efeito no rival além do dano (empurrão, lentidão, atordoamento…). */
  controle: boolean;
  /** Poder do primeiro efeito de dano. */
  poder: number | null;
  buff: Buff | null;
  /** Porcentagem de cura. */
  cura: number | null;
  /** Movimento próprio do golpe. */
  movimento: 'avancar' | 'recuar' | null;
}

const DIRETOS = new Set<Efeito['efeito']>(['dano', 'empurrar', 'puxar', 'lentidao', 'prender', 'atordoar', 'dano-continuo', 'debuff']);
const cache = new WeakMap<Golpe, PerfilGolpe>();

export function perfilDoGolpe(g: Golpe): PerfilGolpe {
  const pronto = cache.get(g);
  if (pronto) return pronto;
  const p: PerfilGolpe = { atingeAlvo: false, contato: false, causaDano: false, controle: false, poder: null, buff: null, cura: null, movimento: null };
  for (const e of g.efeitos) {
    if (DIRETOS.has(e.efeito)) {
      p.atingeAlvo = true;
      p.contato = true;
      if (e.efeito !== 'dano') p.controle = true;
    }
    if (e.efeito === 'projetil') {
      p.atingeAlvo = true;
      if (e.efeitos.length) p.controle = true;
    }
    if ((e.efeito === 'dano' || e.efeito === 'projetil') && e.poder > 0) {
      p.causaDano = true;
      p.poder ??= e.poder;
    }
    if (e.efeito === 'buff') p.buff ??= e;
    if (e.efeito === 'curar') p.cura ??= e.porcento;
    if (e.efeito === 'avancar' || e.efeito === 'recuar') p.movimento ??= e.efeito;
  }
  cache.set(g, p);
  return p;
}
