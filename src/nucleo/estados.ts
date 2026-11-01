// O que vale numa criatura agora: os estados dela (`estados.json`) e os campos onde ela
// está (`campos.json`). `mods` junta tudo numa conta só; o motor consulta na hora de andar,
// de agir, de levar e causar dano.

import type { Campo, Conteudo, Estado } from '../conteudo/esquema';
import { especieDe, lutadorPorUid, raioDe } from './consulta';
import { acertaForma } from './formas';
import type { EstadoBatalha, Lutador, Ponto, Zona } from './modelo';

export interface Mods {
  trava: 'nada' | 'movimento' | 'acao' | 'tudo';
  velocidade: number;
  ataque: number;
  defesa: number;
  danoRecebido: Record<string, number>[];
  danoCausado: Record<string, number>[];
  danoPorMovimento: { tipo: string; andando: number; parado: number }[];
  recarga: number;
  conjuracao: number;
  desvio: number;
  empurrao: number;
  inquieto: boolean;
  intangivel: boolean;
  atingivelPor: string[];
  tamanho: number;
  areaPerto: number;
  /** HP por segundo. */
  cura: number;
  impedeCura: boolean;
  protege: string[];
  desvia: { graus: number; raio: number } | null;
  reflete: boolean;
  aderencia: number;
  cacada: { velocidade: number; alcance: number; alvo: number } | null;
  /** Campos em que a criatura está agora. */
  emCampos: string[];
}

function neutro(): Mods {
  return {
    trava: 'nada',
    velocidade: 1,
    ataque: 1,
    defesa: 1,
    danoRecebido: [],
    danoCausado: [],
    danoPorMovimento: [],
    recarga: 1,
    conjuracao: 1,
    desvio: 0,
    empurrao: 1,
    inquieto: false,
    intangivel: false,
    atingivelPor: [],
    tamanho: 1,
    areaPerto: 1,
    cura: 0,
    impedeCura: false,
    protege: [],
    desvia: null,
    reflete: false,
    aderencia: 1,
    cacada: null,
    emCampos: [],
  };
}

/** A zona está valendo e o ponto está dentro dela? */
export function dentroDe(z: Zona, p: Ponto): boolean {
  return z.atraso <= 0 && acertaForma(z.geo, z, p, 0);
}

/** O campo da zona afeta esta criatura? (não é imune e, no campo só do rival, não é da equipe de quem criou) */
export function afetaCampo(b: EstadoBatalha, c: Conteudo, z: Zona, l: Lutador): boolean {
  const def: Campo | undefined = z.campo ? c.campos[z.campo] : undefined;
  if (def && especieDe(c, l).tipos.some((t) => def.imunes.includes(t))) return false;
  if (z.afeta === 'rival' && lutadorPorUid(b, z.autor).equipe === l.equipe) return false;
  return true;
}

export function mods(b: EstadoBatalha, c: Conteudo, l: Lutador): Mods {
  const m = neutro();
  const tipos = especieDe(c, l).tipos;
  const aplicaveis: { e: Estado; alvo: number | null }[] = [];
  for (const z of b.zonas) {
    if (!z.campo || !dentroDe(z, l)) continue;
    const def = c.campos[z.campo];
    if (!def) continue;
    m.emCampos.push(z.campo);
    if (def.estado && afetaCampo(b, c, z, l)) aplicaveis.push({ e: c.estados[def.estado]!, alvo: null });
    if (def.estadoImunes && especieDe(c, l).tipos.some((t) => def.imunes.includes(t))) aplicaveis.push({ e: c.estados[def.estadoImunes]!, alvo: null });
    if (def.dono && z.autor === l.uid) aplicaveis.push({ e: c.estados[def.dono]!, alvo: null });
  }
  for (const cd of l.condicoes) if (cd.tipo === 'estado') aplicaveis.push({ e: c.estados[cd.estado]!, alvo: cd.alvo });
  for (const { e, alvo } of aplicaveis) somar(m, e, alvo, tipos);
  return m;
}

function somar(m: Mods, e: Estado, alvo: number | null, tipos: string[]): void {
  if (e.trava) m.trava = juntarTravas(m.trava, e.trava);
  if (e.velocidade !== undefined) m.velocidade *= e.velocidade;
  if (e.atributos?.ataque) m.ataque *= e.atributos.ataque;
  if (e.atributos?.defesa) m.defesa *= e.atributos.defesa;
  if (e.danoRecebido) m.danoRecebido.push(e.danoRecebido);
  if (e.danoCausado) m.danoCausado.push(e.danoCausado);
  if (e.danoPorMovimento) m.danoPorMovimento.push(e.danoPorMovimento);
  if (e.recarga) m.recarga *= e.recarga;
  if (e.conjuracao) m.conjuracao *= e.conjuracao;
  if (e.desvio) m.desvio = Math.max(m.desvio, e.desvio);
  if (e.empurrao !== undefined) m.empurrao *= e.empurrao;
  if (e.inquieto) m.inquieto = true;
  if (e.intangivel) {
    m.intangivel = true;
    if (e.atingivelPor) m.atingivelPor.push(...e.atingivelPor);
  }
  if (e.tamanho) m.tamanho *= e.tamanho;
  if (e.areaPerto) m.areaPerto *= e.areaPerto;
  if (e.curaPorSegundo) {
    const noCampo = !e.soEmCampo || m.emCampos.includes(e.soEmCampo);
    const doTipo = !e.soTipos || tipos.some((t) => e.soTipos!.includes(t));
    if (noCampo && doTipo) m.cura += e.curaPorSegundo;
  }
  if (e.impedeCura) m.impedeCura = true;
  if (e.protege) m.protege.push(...e.protege);
  if (e.desviaProjeteis) m.desvia = e.desviaProjeteis;
  if (e.refleteProjeteis) m.reflete = true;
  if (e.aderencia) m.aderencia = Math.min(m.aderencia, e.aderencia);
  if (e.cacada && alvo !== null) m.cacada = { ...e.cacada, alvo };
}

function juntarTravas(a: Mods['trava'], b: Exclude<Mods['trava'], 'nada'>): Mods['trava'] {
  if (a === 'nada' || a === b) return b;
  return 'tudo';
}

/** Produto dos multiplicadores de dano para golpes do `tipo` ("*" vale para todos). */
export function multiplicadorPorTipo(lista: Record<string, number>[], tipo: string): number {
  let f = 1;
  for (const r of lista) f *= r[tipo] ?? r['*'] ?? 1;
  return f;
}

/** Raio do corpo agora (o estado "gigante" aumenta). */
export function raioCorpo(b: EstadoBatalha, c: Conteudo, l: Lutador): number {
  const r = raioDe(c, l);
  return l.condicoes.some((cd) => cd.tipo === 'estado') || b.zonas.length ? r * mods(b, c, l).tamanho : r;
}
