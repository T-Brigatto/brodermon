// Tudo o que fica no chão da arena: formas que acertam na hora ou depois de uma marca,
// formas que duram e acertam a cada pulso, formas que andam ou crescem, terrenos e névoas
// (`campos.json`), objetos (pilar, portais, cópia, pino) e formas agendadas (`varias`).

import type { Conteudo, EfeitoForma, EfeitoNoAlvo, EfeitoPosicionado, Efeito } from '../conteudo/esquema';
import { sortear } from './aleatorio';
import { aplicarCarga, aplicarNoAlvo, atingivel, emCampo, emCampoAgora, rivalEmCampo } from './combate';
import { distancia, golpeDe, lutadorPorUid } from './consulta';
import { EPS, ESPERA_PORTAL, PASSO } from './constantes';
import { afetaCampo, dentroDe, mods, raioCorpo } from './estados';
import { acertaForma, geometriaDe, pontaDa, type Posicao } from './formas';
import type { Acao, Agendado, EstadoBatalha, Evento, Geometria, Lutador, Ponto, Zona } from './modelo';
import { lancarDe } from './projeteis';

type Apaga = NonNullable<Zona['apaga']>;
type Deixa = NonNullable<Zona['deixa']>;

/** Tamanho aproximado de uma zona, para ver se uma forma a toca. */
function tamanhoDa(z: Zona): number {
  const g = z.geo;
  if (g.forma === 'area') return g.raio;
  if (g.forma === 'parede') return g.largura / 2;
  return g.alcance / 2;
}

/** Centro de uma zona (a linha e o cone medem a partir da origem). */
function centroDa(z: Zona): Ponto {
  const g = z.geo;
  if (g.forma === 'linha' || g.forma === 'cone') return { x: z.x + (z.ux * g.alcance) / 2, y: z.y + (z.uy * g.alcance) / 2 };
  return { x: z.x, y: z.y };
}

const temCarga = (ef: { poder: number; efeitos: EfeitoNoAlvo[]; alterna?: EfeitoNoAlvo[][] }) => ef.poder > 0 || ef.efeitos.length > 0 || !!ef.alterna;

/** Quem a forma de um golpe atinge: o rival de quem usou, se puder ser atingido. */
function rivalNaForma(b: EstadoBatalha, c: Conteudo, autor: Lutador, golpe: string, geo: Geometria, z: Posicao, anel: boolean): Lutador | null {
  const r = rivalEmCampo(b, autor.equipe);
  if (!r || !atingivel(b, c, r, golpe, anel)) return null;
  return acertaForma(geo, z, r, raioCorpo(b, c, r)) ? r : null;
}

/**
 * Põe uma forma no campo. Sem atraso nem duração, acerta na hora; com eles, vira uma zona.
 * Devolve quanto a ação deve esperar (canalização) e se acertou alguém.
 */
export function colocarForma(
  b: EstadoBatalha,
  c: Conteudo,
  autor: Lutador,
  golpe: string,
  ef: EfeitoForma,
  pos: Posicao,
  ev: Evento[],
  op: { acao?: Acao; bonus?: number } = {},
): { espera: number; acertou: boolean; temCarga: boolean } {
  const anel = ef.efeito === 'area' && ef.centro === 'si' && !!op.acao;
  const escala = anel && autor.condicoes.some((cd) => cd.tipo === 'estado') ? mods(b, c, autor).areaPerto : 1;
  const geo = geometriaDe(ef, escala);
  if (geo.forma === 'linha' && ef.efeito === 'linha' && ef.ateRival && op.acao) geo.alcance = Math.min(ef.alcance, distancia(pos, op.acao.mira));
  if (op.acao) op.acao.ponta = { ...pontaDa(geo, pos), ux: pos.ux, uy: pos.uy };
  const bonus = op.bonus ?? 1;
  const carga = temCarga(ef);

  if (ef.atraso !== undefined || ef.duracao !== undefined || ef.move || (ef.efeito === 'area' && ef.raioFinal)) {
    const z = novaZona(b, autor, golpe, geo, pos, ef, bonus);
    b.zonas.push(z);
    const canalizada = (ef.efeito === 'cone' || ef.efeito === 'linha') && ef.duracao !== undefined && !ef.atraso && !ef.move && op.acao;
    if (canalizada && op.acao) {
      z.canal = true;
      op.acao.canal = true;
      op.acao.zona = z.id;
      return { espera: ef.duracao!, acertou: false, temCarga: carga };
    }
    return { espera: 0, acertou: false, temCarga: carga };
  }

  if (geo.forma === 'linha' && ef.efeito === 'linha' && ef.reflete > 0) return linhaQueReflete(b, c, autor, golpe, ef, geo, pos, ev, bonus);

  ev.push({ tipo: 'forma', autor: autor.uid, golpe, geo, x: pos.x, y: pos.y, ux: pos.ux, uy: pos.uy });
  marcar(b, c, autor, golpe, geo, pos, ef.apaga ?? null, ev);
  let acertou = false;
  const r = rivalNaForma(b, c, autor, golpe, geo, pos, anel);
  if (r && carga) {
    aplicarCarga(b, c, r, autor, golpe, ef, 'forma', ev, bonus);
    acertou = true;
  }
  if (ef.deixa) deixar(b, c, autor, golpe, ef.deixa, geo, pos);
  return { espera: 0, acertou, temCarga: carga };
}

/** O que uma forma faz no chão ao acontecer: apaga campos, detona névoas e derruba estruturas do seu tipo. */
function marcar(b: EstadoBatalha, c: Conteudo, autor: Lutador, golpe: string, geo: Geometria, pos: Posicao, apaga: Apaga | null, ev: Evento[]): void {
  if (apaga) apagar(b, c, apaga, geo, pos, -1);
  detonar(b, c, autor, golpe, geo, pos, ev);
  const tipo = golpeDe(c, golpe).tipo;
  b.objetos = b.objetos.filter((o) => !(o.destruidoPor.includes(tipo) && acertaForma(geo, pos, o, o.raio)));
}

/** Feixe que quica na borda da arena: um segmento até a borda e outro a partir dela, refletido. */
function linhaQueReflete(
  b: EstadoBatalha,
  c: Conteudo,
  autor: Lutador,
  golpe: string,
  ef: Extract<EfeitoForma, { efeito: 'linha' }>,
  geo: Extract<Geometria, { forma: 'linha' }>,
  pos: Posicao,
  ev: Evento[],
  bonus: number,
): { espera: number; acertou: boolean; temCarga: boolean } {
  const A = c.regras.arena;
  const segmentos: { pos: Posicao; alcance: number }[] = [];
  let p = { ...pos };
  let falta = geo.alcance;
  for (let k = 0; k <= ef.reflete && falta > 0.5; k++) {
    const tx = p.ux > 0 ? (A.xMax - p.x) / p.ux : p.ux < 0 ? (A.xMin - p.x) / p.ux : Infinity;
    const ty = p.uy > 0 ? (A.yMax - p.y) / p.uy : p.uy < 0 ? (A.yMin - p.y) / p.uy : Infinity;
    const t = Math.max(0, Math.min(falta, tx, ty));
    segmentos.push({ pos: p, alcance: t });
    falta -= t;
    p = { x: p.x + p.ux * t, y: p.y + p.uy * t, ux: tx <= ty ? -p.ux : p.ux, uy: ty <= tx ? -p.uy : p.uy };
  }
  let acertou = false;
  for (const s of segmentos) {
    const g: Geometria = { forma: 'linha', alcance: s.alcance, largura: geo.largura };
    ev.push({ tipo: 'forma', autor: autor.uid, golpe, geo: g, x: s.pos.x, y: s.pos.y, ux: s.pos.ux, uy: s.pos.uy });
    marcar(b, c, autor, golpe, g, s.pos, ef.apaga ?? null, ev);
    const r = !acertou ? rivalNaForma(b, c, autor, golpe, g, s.pos, false) : null;
    if (r && temCarga(ef)) {
      aplicarCarga(b, c, r, autor, golpe, ef, 'forma', ev, bonus);
      acertou = true;
    }
  }
  return { espera: 0, acertou, temCarga: temCarga(ef) };
}

function novaZona(b: EstadoBatalha, autor: Lutador, golpe: string, geo: Geometria, pos: Posicao, ef: EfeitoForma, bonus: number): Zona {
  const move = ef.move ? { v: ef.move.velocidade, restante: ef.move.ate ?? null, persegue: ef.move.persegue } : null;
  const duracao = ef.duracao ?? (move?.restante != null ? move.restante / move.v : 0);
  return {
    id: b.proximoId++,
    autor: autor.uid,
    golpe,
    geo,
    x: pos.x,
    y: pos.y,
    ux: pos.ux,
    uy: pos.uy,
    atraso: ef.atraso ?? 0,
    tempo: 0,
    duracao,
    pulso: ef.pulso ?? null,
    pulsos: 0,
    poder: ef.poder * bonus,
    efeitos: ef.efeitos,
    drena: ef.drena ?? 0,
    alterna: ef.alterna ?? null,
    canal: false,
    campo: null,
    afeta: 'rival',
    umaVez: ef.umaVez,
    atingidos: [],
    dentro: [],
    move,
    cresce: geo.forma === 'area' && ef.efeito === 'area' && ef.raioFinal ? { de: geo.raio, ate: ef.raioFinal } : null,
    arrasta: ef.arrasta,
    puxa: ef.puxa ?? 0,
    rastro: ef.rastro ? { ...ef.rastro, golpe, x: pos.x, y: pos.y } : null,
    deixa: ef.deixa ?? null,
    aoEntrar: null,
    apaga: ef.apaga ?? null,
    disparo: 0,
  };
}

/** Cria um terreno ou névoa. Os números que a forma não define vêm de `campos.json`. */
export function criarCampo(
  b: EstadoBatalha,
  c: Conteudo,
  autor: Lutador,
  golpe: string,
  campo: string,
  geo: Geometria,
  pos: Posicao,
  duracao: number,
  op: { pulso?: number; poder?: number; efeitos?: EfeitoNoAlvo[]; aoEntrar?: { poder: number; efeitos: EfeitoNoAlvo[] } } = {},
): Zona {
  const def = c.campos[campo];
  if (!def) throw new Error(`campo "${campo}" não existe`);
  const z: Zona = {
    id: b.proximoId++,
    autor: autor.uid,
    golpe,
    geo,
    x: pos.x,
    y: pos.y,
    ux: pos.ux,
    uy: pos.uy,
    atraso: 0,
    tempo: 0,
    duracao,
    pulso: op.pulso ?? def.pulso ?? null,
    pulsos: 0,
    poder: op.poder ?? def.poder,
    efeitos: op.efeitos ?? def.efeitos,
    drena: 0,
    alterna: null,
    canal: false,
    campo,
    afeta: def.afeta,
    umaVez: false,
    atingidos: [],
    dentro: [],
    move: null,
    cresce: null,
    arrasta: false,
    puxa: 0,
    rastro: null,
    deixa: null,
    aoEntrar: op.aoEntrar ?? null,
    apaga: null,
    disparo: def.dispara?.intervalo ?? 0,
  };
  b.zonas.push(z);
  return z;
}

function deixar(b: EstadoBatalha, c: Conteudo, autor: Lutador, golpe: string, d: Deixa, geo: Geometria, pos: Posicao): void {
  let g: Geometria = geo;
  if (geo.forma === 'area' && d.raio) g = { forma: 'area', raio: d.raio };
  if (geo.forma === 'linha' && d.largura) g = { ...geo, largura: d.largura };
  criarCampo(b, c, autor, golpe, d.campo, g, pos, d.duracao, d);
}

/** Campo deixado ao longo de um caminho (avanço, teleporte ou forma que anda). */
export function deixarRastro(b: EstadoBatalha, c: Conteudo, autor: Lutador, r: { campo: string; largura: number; duracao: number; golpe: string; x: number; y: number }, fim: Ponto): void {
  const dx = fim.x - r.x;
  const dy = fim.y - r.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return;
  criarCampo(b, c, autor, r.golpe, r.campo, { forma: 'linha', alcance: d, largura: r.largura }, { x: r.x, y: r.y, ux: dx / d, uy: dy / d }, r.duracao);
}

/** Apaga (ou converte) os campos que a forma toca e, com `objetos`, as estruturas. */
function apagar(b: EstadoBatalha, c: Conteudo, regra: Apaga, geo: Geometria, pos: Posicao, exceto: number): void {
  for (let i = b.zonas.length - 1; i >= 0; i--) {
    const z = b.zonas[i]!;
    if (!z.campo || z.id === exceto) continue;
    const def = c.campos[z.campo]!;
    const filtra = regra.camadas || regra.tipos;
    if (filtra && !regra.camadas?.includes(def.camada) && !regra.tipos?.includes(def.tipo)) continue;
    if (!acertaForma(geo, pos, centroDa(z), tamanhoDa(z) * 0.5)) continue;
    if (regra.converteEm) {
      const novo = c.campos[regra.converteEm]!;
      if (z.campo === regra.converteEm) continue;
      Object.assign(z, { campo: regra.converteEm, pulso: novo.pulso ?? null, pulsos: 0, poder: novo.poder, efeitos: novo.efeitos, afeta: novo.afeta, tempo: 0, dentro: [] });
    } else {
      b.zonas.splice(i, 1);
    }
  }
  if (regra.objetos) b.objetos = b.objetos.filter((o) => !acertaForma(geo, pos, o, o.raio));
}

/** Névoas que detonam com golpes do tipo delas (gás): todos dentro levam a carga e o campo some. */
function detonar(b: EstadoBatalha, c: Conteudo, autor: Lutador, golpe: string, geo: Geometria, pos: Posicao, ev: Evento[]): void {
  const tipo = golpeDe(c, golpe).tipo;
  for (let i = b.zonas.length - 1; i >= 0; i--) {
    const z = b.zonas[i]!;
    const det = z.campo ? c.campos[z.campo]?.detona : undefined;
    if (!det || det.tipo !== tipo || !acertaForma(geo, pos, centroDa(z), tamanhoDa(z))) continue;
    b.zonas.splice(i, 1);
    ev.push({ tipo: 'forma', autor: z.autor, golpe: z.golpe, geo: z.geo, x: z.x, y: z.y, ux: z.ux, uy: z.uy });
    const dono = lutadorPorUid(b, z.autor);
    for (const l of emCampoAgora(b)) {
      if (dentroDe(z, l) && afetaCampo(b, c, z, l) && atingivel(b, c, l, z.golpe)) aplicarCarga(b, c, l, dono, golpe, det, 'forma', ev);
    }
  }
}

/** Ritmo do tempo num ponto: campos de tempo lento (menos a própria zona) diminuem. */
function ritmoEm(b: EstadoBatalha, c: Conteudo, p: Ponto, exceto: number): number {
  let r = 1;
  for (const z of b.zonas) {
    if (z.id === exceto || !z.campo) continue;
    const t = c.campos[z.campo]?.tempo;
    if (t && dentroDe(z, p)) r *= t;
  }
  return r;
}

/** Fator dos campos na velocidade dos projéteis num ponto. */
export function ritmoProjetil(b: EstadoBatalha, c: Conteudo, p: Ponto): number {
  let r = 1;
  for (const z of b.zonas) {
    const t = z.campo ? c.campos[z.campo]?.projeteis?.tempo : undefined;
    if (t && dentroDe(z, p)) r *= t;
  }
  return r;
}

/** Um passo de todas as zonas: marcas, pulsos, movimento, crescimento, terrenos e névoas. */
export function passarZonas(b: EstadoBatalha, c: Conteudo, ev: Evento[]): void {
  for (const z of [...b.zonas]) {
    if (!b.zonas.includes(z)) continue;
    const autor = lutadorPorUid(b, z.autor);
    const ritmo = b.zonas.length > 1 ? ritmoEm(b, c, z, z.id) : 1;
    if (z.atraso > 0) {
      z.atraso -= PASSO * ritmo;
      if (z.atraso > EPS) continue;
      z.atraso = 0;
      ev.push({ tipo: 'forma', autor: z.autor, golpe: z.golpe, geo: z.geo, x: z.x, y: z.y, ux: z.ux, uy: z.uy });
      marcar(b, c, autor, z.golpe, z.geo, z, z.apaga, ev);
      if (z.duracao <= 0 && z.pulso === null && !z.move && !z.cresce) {
        const r = rivalNaForma(b, c, autor, z.golpe, z.geo, z, false);
        if (r) aplicarCarga(b, c, r, autor, z.golpe, z, 'forma', ev);
        if (z.deixa) deixar(b, c, autor, z.golpe, z.deixa, z.geo, z);
        remover(b, z);
        continue;
      }
    }
    if (z.canal) {
      if (autor.acao?.zona !== z.id) {
        remover(b, z);
        continue;
      }
      z.x = autor.x;
      z.y = autor.y;
    }
    let acabou = false;
    if (z.move) acabou = moverZona(b, c, z, autor, ritmo);
    if (z.cresce && z.geo.forma === 'area') z.geo = { forma: 'area', raio: z.cresce.de + (z.cresce.ate - z.cresce.de) * Math.min(1, z.tempo / Math.max(z.duracao, PASSO)) };
    if (z.cresce && z.apaga) apagar(b, c, z.apaga, z.geo, z, z.id);

    if (z.campo) passarCampo(b, c, z, autor, ev);
    else acertarDaZona(b, c, z, autor, ev);
    if (!b.zonas.includes(z)) continue;

    if (z.arrasta || z.puxa) empurrarDaZona(b, c, z, autor);
    z.tempo += PASSO * ritmo;
    if (acabou || (z.duracao > 0 && z.tempo >= z.duracao - EPS) || (z.duracao <= 0 && !z.atraso)) {
      if (z.rastro) deixarRastro(b, c, autor, z.rastro, z);
      remover(b, z);
    }
  }
}

function remover(b: EstadoBatalha, z: Zona): void {
  const i = b.zonas.indexOf(z);
  if (i >= 0) b.zonas.splice(i, 1);
}

/** Anda com a zona (virando para o rival, se persegue). Devolve true quando chegou ao fim do caminho. */
function moverZona(b: EstadoBatalha, c: Conteudo, z: Zona, autor: Lutador, ritmo: number): boolean {
  const m = z.move!;
  if (m.persegue) {
    const r = rivalEmCampo(b, autor.equipe);
    if (r) {
      const d = distancia(z, r);
      if (d > 0.5) {
        z.ux = (r.x - z.x) / d;
        z.uy = (r.y - z.y) / d;
      }
    }
  }
  let passo = m.v * PASSO * ritmo;
  if (m.restante !== null) passo = Math.min(passo, m.restante);
  z.x += z.ux * passo;
  z.y += z.uy * passo;
  if (m.restante !== null) {
    m.restante -= passo;
    return m.restante <= EPS;
  }
  return false;
}

/** Zona de golpe: acerta o rival a cada pulso, ou uma vez quando passa por ele (forma que anda ou cresce). */
function acertarDaZona(b: EstadoBatalha, c: Conteudo, z: Zona, autor: Lutador, ev: Evento[]): void {
  const alvo = () => {
    const r = rivalNaForma(b, c, autor, z.golpe, z.geo, z, false);
    return r && !(z.umaVez && z.atingidos.includes(r.uid)) ? r : null;
  };
  const acertar = (r: Lutador, efeitos: EfeitoNoAlvo[]) => {
    aplicarCarga(b, c, r, autor, z.golpe, { poder: z.poder, efeitos, drena: z.drena || undefined }, 'forma', ev);
    if (z.umaVez) z.atingidos.push(r.uid);
  };
  if (z.pulso !== null) {
    while (z.pulsos * z.pulso <= z.tempo + EPS && z.pulsos * z.pulso < z.duracao - EPS) {
      const efeitos = z.alterna ? z.alterna[z.pulsos % z.alterna.length]! : z.efeitos;
      z.pulsos++;
      const r = alvo();
      if (r) acertar(r, efeitos);
    }
    return;
  }
  const r = alvo();
  if (r && (z.umaVez || z.move || z.cresce)) acertar(r, z.efeitos);
}

/** Arrasta quem está dentro junto com a zona, ou puxa para o centro. */
function empurrarDaZona(b: EstadoBatalha, c: Conteudo, z: Zona, autor: Lutador): void {
  const r = rivalEmCampo(b, autor.equipe);
  if (!r || !acertaForma(z.geo, z, r, raioCorpo(b, c, r)) || !atingivel(b, c, r, z.golpe)) return;
  if (z.arrasta && z.move) {
    r.deslocamento = { vx: z.ux * z.move.v, vy: z.uy * z.move.v, restante: PASSO * 1.5 };
  }
  if (z.puxa) {
    const d = distancia(r, z);
    const passo = Math.min(d, z.puxa * PASSO);
    if (d > 0.5) {
      r.x += ((z.x - r.x) / d) * passo;
      r.y += ((z.y - r.y) / d) * passo;
    }
  }
}

/** Terreno ou névoa: entrada, permanência, pulsos, disparos e o que ele apaga. */
function passarCampo(b: EstadoBatalha, c: Conteudo, z: Zona, autor: Lutador, ev: Evento[]): void {
  const def = c.campos[z.campo!]!;
  const presentes = emCampoAgora(b).filter((l) => dentroDe(z, l) && afetaCampo(b, c, z, l) && atingivel(b, c, l, z.golpe));
  for (const l of presentes) {
    let d = z.dentro.find((x) => x.uid === l.uid);
    if (!d) {
      d = { uid: l.uid, tempo: 0 };
      z.dentro.push(d);
      const entrada = z.aoEntrar ?? def.aoEntrar;
      if (entrada) aplicarCarga(b, c, l, autor, z.golpe, entrada, 'campo', ev);
      if (def.consome) {
        remover(b, z);
        return;
      }
    } else {
      d.tempo += PASSO;
    }
    if (def.permanencia && d.tempo >= def.permanencia.segundos - EPS) {
      for (const ef of def.permanencia.efeitos) aplicarNoAlvo(b, c, l, autor, z.golpe, ef, ev);
      d.tempo = 0;
    }
  }
  z.dentro = z.dentro.filter((x) => presentes.some((l) => l.uid === x.uid));
  if (z.pulso !== null) {
    while (z.pulsos * z.pulso <= z.tempo + EPS && z.pulsos * z.pulso < z.duracao - EPS) {
      z.pulsos++;
      for (const l of presentes) aplicarCarga(b, c, l, autor, z.golpe, z, 'campo', ev);
    }
  }
  if (def.dispara) {
    z.disparo -= PASSO;
    if (z.disparo <= EPS) {
      z.disparo += def.dispara.intervalo;
      const r = rivalEmCampo(b, autor.equipe);
      if (r) lancarDe(b, c, autor, z.golpe, def.dispara.projetil, { x: z.x, y: z.y }, ev, { alvo: r });
    }
  }
  if (def.apaga) apagar(b, c, def.apaga, z.geo, z, z.id);
}

/** Terreno sob a criatura (o primeiro, se houver vários). */
export function terrenoSob(b: EstadoBatalha, c: Conteudo, l: Ponto): string | null {
  for (const z of b.zonas) if (z.campo && c.campos[z.campo]?.camada === 'terreno' && dentroDe(z, l)) return z.campo;
  return null;
}

/** Empurrões dos campos em quem está dentro (corrente de vento, rampa). Ajusta a velocidade do passo. */
export function forcasDeCampo(b: EstadoBatalha, c: Conteudo, l: Lutador): void {
  for (const z of b.zonas) {
    if (!z.campo || !dentroDe(z, l) || !afetaCampo(b, c, z, l)) continue;
    const def = c.campos[z.campo]!;
    if (def.empuxo?.lado) {
      l.vx += -z.uy * def.empuxo.lado;
      l.vy += z.ux * def.empuxo.lado;
    }
    if (def.empuxo?.frente) {
      l.vx += z.ux * def.empuxo.frente;
      l.vy += z.uy * def.empuxo.frente;
    }
    if (def.rampa) {
      const ao = l.vx * z.ux + l.vy * z.uy;
      if (ao > 0) {
        l.vx *= def.rampa;
        l.vy *= def.rampa;
      } else {
        // Contra o sentido da rampa, escorrega de volta.
        const v = Math.hypot(l.vx, l.vy) * 0.6 + 10;
        l.vx += z.ux * v;
        l.vy += z.uy * v;
      }
    }
  }
}

// ---------- Objetos ----------

/** Põe um objeto na arena (pilar, portais, cópia falsa ou pino). */
export function colocarObjeto(b: EstadoBatalha, c: Conteudo, autor: Lutador, golpe: string, ef: Extract<Efeito, { efeito: 'objeto' }>, a: Acao): void {
  const { ux, uy } = a.mira;
  const base = ef.centro === 'si' ? { x: autor.x, y: autor.y } : ef.centro === 'rival' ? { x: a.mira.x, y: a.mira.y } : { x: (autor.x + a.mira.x) / 2, y: (autor.y + a.mira.y) / 2 };
  // `distancia` afasta do centro: na direção de quem usa (perto do rival) ou para o lado (cópia).
  const ponto =
    ef.objeto === 'copia'
      ? { x: autor.x - uy * ef.distancia, y: autor.y + ux * ef.distancia }
      : { x: base.x - ux * ef.distancia, y: base.y - uy * ef.distancia };
  const A = c.regras.arena;
  const dentro = (p: Ponto) => ({ x: Math.max(A.xMin, Math.min(A.xMax, p.x)), y: Math.max(A.yMin, Math.min(A.yMax, p.y)) });
  const novo = (tipo: 'pilar' | 'portal' | 'copia' | 'pino', p: Ponto) => {
    const o = {
      id: b.proximoId++,
      tipo,
      autor: autor.uid,
      golpe,
      ...dentro(p),
      raio: ef.raio,
      restante: ef.duracao,
      par: null as number | null,
      chance: ef.chance ?? 1,
      destruidoPor: ef.destruidoPor,
      dentro: [] as number[],
    };
    // Quem já está em cima do objeto quando ele surge não conta como entrando.
    o.dentro = emCampoAgora(b).filter((l) => distancia(l, o) < o.raio).map((l) => l.uid);
    b.objetos.push(o);
    return o;
  };
  if (ef.objeto === 'portais') {
    const um = novo('portal', { x: autor.x, y: autor.y });
    const outro = novo('portal', ponto);
    um.par = outro.id;
    outro.par = um.id;
    return;
  }
  novo(ef.objeto, ponto);
}

/** Cópia falsa do alvo que engana este golpe (sorteia só se existir uma). */
export function copiaQueEngana(b: EstadoBatalha, alvo: Lutador): Ponto | null {
  const copia = b.objetos.find((o) => o.tipo === 'copia' && o.autor === alvo.uid);
  if (!copia) return null;
  return sortear(b.rng) < copia.chance ? { x: copia.x, y: copia.y } : null;
}

/** Pino: o golpe do tipo dele, usado por quem o fincou, também salta para quem estiver perto do pino. */
export function saltarDoPino(b: EstadoBatalha, c: Conteudo, autor: Lutador, golpe: string, carga: { poder: number; efeitos: EfeitoNoAlvo[] }, ev: Evento[]): void {
  const tipo = golpeDe(c, golpe).tipo;
  for (const o of b.objetos) {
    if (o.tipo !== 'pino' || o.autor !== autor.uid || golpeDe(c, o.golpe).tipo !== tipo) continue;
    const r = rivalEmCampo(b, autor.equipe);
    if (!r || !atingivel(b, c, r, golpe) || distancia(r, o) > o.raio + raioCorpo(b, c, r)) continue;
    ev.push({ tipo: 'salto', autor: autor.uid, golpe, x: o.x, y: o.y, alvo: r.uid });
    aplicarCarga(b, c, r, autor, golpe, carga, 'forma', ev);
  }
}

/** Tempo dos objetos, colisão com o pilar e passagem pelos portais. */
export function passarObjetos(b: EstadoBatalha, c: Conteudo, ev: Evento[]): void {
  for (const o of b.objetos) o.restante -= PASSO;
  b.objetos = b.objetos.filter((o) => o.restante > EPS);
  for (const l of emCampoAgora(b)) {
    for (const o of b.objetos) {
      if (o.tipo === 'pilar') {
        const r = raioCorpo(b, c, l);
        const d = distancia(l, o);
        if (d < o.raio + r) {
          const ux = d > 0.01 ? (l.x - o.x) / d : 1;
          const uy = d > 0.01 ? (l.y - o.y) / d : 0;
          l.x = o.x + ux * (o.raio + r);
          l.y = o.y + uy * (o.raio + r);
        }
      } else if (o.tipo === 'portal' && l.portalEspera <= 0 && distancia(l, o) < o.raio && !o.dentro.includes(l.uid)) {
        const par = b.objetos.find((x) => x.id === o.par);
        if (!par) continue;
        l.x = par.x;
        l.y = par.y;
        l.portalEspera = ESPERA_PORTAL;
        ev.push({ tipo: 'deslocamento', lutador: l.uid, motivo: 'teleporte' });
        break;
      }
    }
  }
  for (const o of b.objetos) if (o.tipo === 'portal') o.dentro = emCampoAgora(b).filter((l) => distancia(l, o) < o.raio).map((l) => l.uid);
}

// ---------- Agendados ----------

/** Faz um efeito num ponto dado: forma ali, ou projétil saindo dali em direção ao rival. */
export function executarPosicionado(b: EstadoBatalha, c: Conteudo, autor: Lutador, golpe: string, ef: EfeitoPosicionado, pos: Posicao, ev: Evento[], bonus = 1): void {
  if (ef.efeito === 'projetil') lancarDe(b, c, autor, golpe, ef, pos, ev, { bonus });
  else colocarForma(b, c, autor, golpe, ef, pos, ev, { bonus });
}

/** Pontos de `varias`, na ordem em que acontecem. */
export function pontosDe(
  b: EstadoBatalha,
  c: Conteudo,
  l: Lutador,
  a: Acao,
  ef: Extract<Efeito, { efeito: 'varias' }>,
): Posicao[] {
  const { ux, uy } = a.mira;
  const n = ef.quantidade;
  const A = c.regras.arena;
  const dentro = (p: Ponto): Posicao => ({ x: Math.max(A.xMin, Math.min(A.xMax, p.x)), y: Math.max(A.yMin, Math.min(A.yMax, p.y)), ux, uy });
  const volta = (centro: Ponto, i: number) => {
    const ang = Math.atan2(uy, ux) + (i * Math.PI * 2) / n;
    return dentro({ x: centro.x + Math.cos(ang) * ef.distancia, y: centro.y + Math.sin(ang) * ef.distancia });
  };
  const entre = (f: number) => dentro({ x: l.x + (a.mira.x - l.x) * f, y: l.y + (a.mira.y - l.y) * f });
  return Array.from({ length: n }, (_, i) => {
    switch (ef.disposicao) {
      case 'linha-ate-rival':
        return entre((i + 1) / n);
      case 'entre':
        return entre((i + 1) / (n + 1));
      case 'em-volta-do-rival':
        return volta(a.mira, i);
      case 'em-volta-de-si':
        return volta(l, i);
      case 'sorteio-no-rival': {
        const ang = sortear(b.rng) * Math.PI * 2;
        const r = Math.sqrt(sortear(b.rng)) * ef.distancia;
        return dentro({ x: a.mira.x + Math.cos(ang) * r, y: a.mira.y + Math.sin(ang) * r });
      }
    }
  });
}

/** Faz os efeitos agendados cuja hora chegou. */
export function passarAgendados(b: EstadoBatalha, c: Conteudo, ev: Evento[]): void {
  if (!b.agendados.length) return;
  const prontos: Agendado[] = [];
  for (const g of b.agendados) if ((g.espera -= PASSO) <= EPS) prontos.push(g);
  if (!prontos.length) return;
  b.agendados = b.agendados.filter((g) => !prontos.includes(g));
  for (const g of prontos) {
    const autor = lutadorPorUid(b, g.autor);
    if (!emCampo(b, autor) && g.efeito.efeito === 'projetil') continue;
    executarPosicionado(b, c, autor, g.golpe, g.efeito, g, ev);
  }
}
