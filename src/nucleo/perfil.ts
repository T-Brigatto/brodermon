// O que um golpe faz, lido da lista de efeitos. Motor, IA e interface usam a mesma leitura.

import type { Efeito, Golpe } from '../conteudo/esquema';

type Buff = Extract<Efeito, { efeito: 'buff' }>;

export interface PerfilGolpe {
  /** Algum efeito precisa do rival: direto, projétil, forma, objeto, teleporte ou cópia. */
  atingeAlvo: boolean;
  /**
   * Precisa do rival perto na hora: efeito direto (corpo a corpo), cone, linha, área ou parede em volta de si.
   * Na fila, a criatura anda até ele.
   */
  contato: boolean;
  /** Causa dano, direto, por projétil, por forma ou pelo campo que deixa. */
  causaDano: boolean;
  /** Tem algum efeito no rival além do dano (empurrão, lentidão, estado…). */
  controle: boolean;
  /** Poder do primeiro efeito de dano (por acerto ou por pulso). */
  poder: number | null;
  buff: Buff | null;
  /** Porcentagem de cura. */
  cura: number | null;
  /** Movimento próprio do golpe. */
  movimento: 'avancar' | 'recuar' | 'teleporte' | null;
  /** Primeiro estado que o golpe põe em quem usa. */
  estadoEmSi: string | null;
  /** Campo que o golpe usa como munição (`cada-campo`). */
  usaCampo: string | null;
  /** Copia o último golpe do rival. */
  copia: boolean;
}

const DIRETOS = new Set<Efeito['efeito']>(['dano', 'empurrar', 'puxar', 'lentidao', 'prender', 'atordoar', 'dano-continuo', 'debuff', 'interromper', 'acorrentar', 'atrair']);
const cache = new WeakMap<Golpe, PerfilGolpe>();

export function perfilDoGolpe(g: Golpe): PerfilGolpe {
  const pronto = cache.get(g);
  if (pronto) return pronto;
  const p: PerfilGolpe = {
    atingeAlvo: false,
    contato: false,
    causaDano: false,
    controle: false,
    poder: null,
    buff: null,
    cura: null,
    movimento: null,
    estadoEmSi: null,
    usaCampo: null,
    copia: false,
  };
  const dano = (poder: number) => {
    if (poder <= 0) return;
    p.causaDano = true;
    p.poder ??= poder;
  };
  for (const e of g.efeitos) {
    if (DIRETOS.has(e.efeito) || (e.efeito === 'estado' && e.em === 'alvo')) {
      p.atingeAlvo = true;
      p.contato = true;
      if (e.efeito !== 'dano') p.controle = true;
    }
    if (e.efeito === 'dano') dano(e.poder);
    if (e.efeito === 'projetil') {
      p.atingeAlvo = true;
      if (e.efeitos.length) p.controle = true;
      dano(e.poder || e.aura?.poder || e.estouro.find((f) => f.poder > 0)?.poder || 0);
    }
    if (e.efeito === 'area' || e.efeito === 'cone' || e.efeito === 'linha' || e.efeito === 'parede') {
      p.atingeAlvo = true;
      if (e.efeitos.length || e.alterna || e.deixa) p.controle = true;
      const perto = e.efeito === 'cone' || e.efeito === 'linha' || ((e.efeito === 'area' || e.efeito === 'parede') && e.centro === 'si');
      if (perto) p.contato = true;
      dano(e.poder || e.deixa?.poder || 0);
    }
    if (e.efeito === 'varias') {
      p.atingeAlvo = true;
      dano(e.faz.poder);
    }
    if (e.efeito === 'cada-campo') {
      p.atingeAlvo = true;
      p.usaCampo ??= e.senao.length ? null : e.campo;
      dano(e.faz[0]?.poder ?? 0);
    }
    if (e.efeito === 'objeto') p.atingeAlvo = true;
    if (e.efeito === 'copiar') {
      p.atingeAlvo = true;
      p.copia = true;
    }
    if (e.efeito === 'avancar' && e.poder > 0) {
      p.atingeAlvo = true;
      dano(e.poder);
    }
    if (e.efeito === 'teleporte') {
      p.atingeAlvo = true;
      p.movimento ??= 'teleporte';
    }
    if (e.efeito === 'estado' && e.em === 'si') p.estadoEmSi ??= e.estado;
    if (e.efeito === 'buff') p.buff ??= e;
    if (e.efeito === 'curar') p.cura ??= e.porcento;
    if (e.efeito === 'avancar' || e.efeito === 'recuar') p.movimento ??= e.efeito;
  }
  cache.set(g, p);
  return p;
}
