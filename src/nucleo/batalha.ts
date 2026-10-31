// O passo da simulação. Comandos entram, o estado muda, eventos saem.
// Nada aqui lê relógio, tela, teclado ou sorteio global: a mesma semente com os
// mesmos comandos sempre produz a mesma batalha.

import type { Conteudo } from '../conteudo/esquema';
import { sortear } from './aleatorio';
import { ativo, combatente, distancia, golpeDe, lutadorPorUid, outra } from './consulta';
import { calcularDano } from './dano';
import { escolherGolpe, taticaDaIa } from './ia';
import type {
  Comando,
  Equipe,
  EstadoBatalha,
  EstadoEquipe,
  Evento,
  Lutador,
  MotivoEntrada,
  Piloto,
  Ponto,
} from './modelo';
import { moverPara, moverPorTatica } from './movimento';

/** Duração de um passo: 60 passos por segundo de jogo. */
export const PASSO = 1 / 60;

const EQUIPES = [0, 1] as const;

export interface ConfigBatalha {
  semente: number;
  equipes: [{ piloto: Piloto; time: string[] }, { piloto: Piloto; time: string[] }];
  /** Id em `regras.dificuldades`; vale só para as equipes pilotadas pela IA. */
  dificuldade?: string;
}

/** Monta a configuração a partir de uma entrada de `batalhas.json`. */
export function configDaBatalha(c: Conteudo, id: string, semente: number, dificuldade?: string): ConfigBatalha {
  const b = c.batalhas[id];
  if (!b) throw new Error(`batalha "${id}" não existe`);
  const [a, z] = b.equipes;
  return {
    semente,
    dificuldade,
    equipes: [
      { piloto: a.piloto, time: [...a.time] },
      { piloto: z.piloto, time: [...z.time] },
    ],
  };
}

export function criarBatalha(c: Conteudo, config: ConfigBatalha): EstadoBatalha {
  const mod = config.dificuldade !== undefined ? c.regras.dificuldades[config.dificuldade] : undefined;
  if (config.dificuldade !== undefined && !mod) throw new Error(`dificuldade "${config.dificuldade}" não existe`);
  let uid = 0;
  const equipes = EQUIPES.map((e): EstadoEquipe => {
    const cfg = config.equipes[e];
    const m = cfg.piloto === 'ia' && mod ? mod : { ataque: 1, hp: 1 };
    // As primeiras criaturas já começam prontas: a entrada delas acontece na contagem "PRONTO?/JÁ!".
    const lutadores = cfg.time.map((esp) => criarLutador(c, esp, e, uid++, m, c.regras.arena.inicio[e]));
    return {
      piloto: cfg.piloto,
      lutadores,
      ativo: 0,
      tatica: 'perseguir',
      proximoGolpe: -1,
      direcao: { x: 0, y: 0 },
      destino: null,
      troca: null,
      esperaTroca: 0,
      substituicao: 0,
    };
  }) as [EstadoEquipe, EstadoEquipe];
  return {
    tick: 0,
    tempo: 0,
    rng: { estado: config.semente | 0 },
    equipes,
    projeteis: [],
    aguardandoEscolha: null,
    vencedor: null,
  };
}

function criarLutador(
  c: Conteudo,
  especie: string,
  equipe: Equipe,
  uid: number,
  mod: { ataque: number; hp: number },
  inicio: Ponto,
): Lutador {
  const esp = c.especies[especie];
  if (!esp) throw new Error(`espécie "${especie}" não existe`);
  const hp = Math.round(esp.hp * mod.hp);
  return {
    uid,
    especie,
    equipe,
    hp,
    hpMax: hp,
    ataque: Math.round(esp.ataque * mod.ataque),
    defesa: esp.defesa,
    velocidade: esp.velocidade,
    x: inicio.x,
    y: inicio.y,
    vx: 0,
    vy: 0,
    olhando: equipe === 0 ? 1 : -1,
    golpes: esp.golpes.map((id) => ({ id, recarga: 0 })),
    recargaGlobal: 0,
    recargaGlobalMax: 1,
    entrando: 0,
    buff: null,
    relogio: equipe * 0.3,
    desmaiado: false,
    danoCausado: 0,
  };
}

/** Aplica os comandos e avança um `PASSO`. Enquanto uma equipe escolhe a próxima criatura, só os comandos rodam. */
export function avancar(b: EstadoBatalha, c: Conteudo, comandos: readonly Comando[] = []): Evento[] {
  const ev = aplicarComandos(b, c, comandos);
  if (b.aguardandoEscolha !== null) return ev;

  b.tick++;
  b.tempo += PASSO;

  for (const eq of b.equipes) {
    eq.lutadores.forEach((l, i) => {
      if (i !== eq.ativo) reduzirRecargas(l);
    });
    if (eq.esperaTroca > 0) eq.esperaTroca = Math.max(0, eq.esperaTroca - PASSO);
  }
  for (const e of EQUIPES) {
    const t = b.equipes[e].troca;
    if (t && (t.restante -= PASSO) <= 0) concluirTroca(b, c, e, ev);
  }
  for (const e of EQUIPES) {
    const eq = b.equipes[e];
    if (eq.substituicao > 0 && (eq.substituicao -= PASSO) <= 0) {
      eq.substituicao = 0;
      if (b.vencedor === null) substituir(b, c, e, ev);
      if (b.aguardandoEscolha !== null) return ev;
    }
  }
  for (const e of EQUIPES) agir(b, c, e, ev);
  moverProjeteis(b, c, ev);
  return ev;
}

/**
 * Aplica comandos sem avançar o tempo: o toque do jogador vale na hora, e o passo seguinte já o considera.
 * Equivale a mandar os mesmos comandos no próximo `avancar`.
 */
export function aplicarComandos(b: EstadoBatalha, c: Conteudo, comandos: readonly Comando[]): Evento[] {
  const ev: Evento[] = [];
  for (const cmd of comandos) aplicarComando(b, c, cmd, ev);
  return ev;
}

function aplicarComando(b: EstadoBatalha, c: Conteudo, cmd: Comando, ev: Evento[]): void {
  const eq = b.equipes[cmd.equipe];
  const recusar = (motivo: string): void => {
    ev.push({ tipo: 'comandoRecusado', comando: cmd, motivo });
  };
  switch (cmd.tipo) {
    case 'direcao':
      eq.direcao = { x: cmd.x, y: cmd.y };
      if (cmd.x || cmd.y) eq.destino = null;
      return;
    case 'destino':
      eq.destino = cmd.ponto ? { x: cmd.ponto.x, y: cmd.ponto.y, fixo: cmd.fixo ?? false } : null;
      return;
    case 'tatica':
      eq.tatica = cmd.tatica;
      return;
    case 'proximoGolpe':
      if (b.vencedor !== null) return recusar('a batalha acabou');
      if (!ativo(b, cmd.equipe).golpes[cmd.indice]) return recusar('esse golpe não existe');
      eq.proximoGolpe = eq.proximoGolpe === cmd.indice ? -1 : cmd.indice;
      return;
    case 'trocar': {
      const l = eq.lutadores[cmd.indice];
      if (!l || l.desmaiado) return recusar('essa criatura não pode lutar');
      if (cmd.indice === eq.ativo) return recusar('essa criatura já está em campo');
      if (b.aguardandoEscolha === cmd.equipe) {
        b.aguardandoEscolha = null;
        colocar(b, c, cmd.equipe, cmd.indice, null, 'substituicao', ev);
        return;
      }
      if (b.vencedor !== null) return recusar('a batalha acabou');
      if (b.aguardandoEscolha !== null) return recusar('a outra equipe está escolhendo');
      if (eq.substituicao > 0 || ativo(b, cmd.equipe).desmaiado) return recusar('esperando a próxima criatura');
      if (eq.troca) return recusar('já está trocando');
      if (eq.esperaTroca > 0) return recusar('a troca está recarregando');
      eq.troca = { para: cmd.indice, restante: c.regras.troca.duracao };
      ev.push({ tipo: 'trocaIniciada', equipe: cmd.equipe, saindo: ativo(b, cmd.equipe).uid, entrando: l.uid });
      return;
    }
  }
}

function agir(b: EstadoBatalha, c: Conteudo, e: Equipe, ev: Evento[]): void {
  const R = c.regras;
  const eq = b.equipes[e];
  const l = ativo(b, e);
  const outro = ativo(b, outra(e));
  if (l.desmaiado) {
    l.vx = 0;
    l.vy = 0;
    l.relogio += PASSO;
    return;
  }
  const alvo = outro.desmaiado || b.equipes[outra(e)].troca ? null : outro;
  if (eq.piloto === 'ia') eq.tatica = taticaDaIa(l, R);

  const ocupado = eq.troca !== null || l.entrando > 0;
  const fila = eq.proximoGolpe >= 0 ? l.golpes[eq.proximoGolpe] : undefined;
  const golpeFila = fila ? golpeDe(c, fila.id) : undefined;
  const { x: ix, y: iy } = eq.direcao;

  if (ocupado) {
    l.vx *= 0.7;
    l.vy *= 0.7;
  } else if (ix || iy) {
    const n = Math.hypot(ix, iy);
    l.vx = (ix / n) * l.velocidade;
    l.vy = (iy / n) * l.velocidade;
    eq.destino = null;
  } else if (eq.destino) {
    const chegou = moverPara(l, eq.destino, eq.destino.fixo ? 2 : 2.5);
    if (chegou && !eq.destino.fixo) eq.destino = null;
  } else if (golpeFila?.contato && alvo && distancia(l, alvo) > (golpeFila.alcance ?? 0) - 4) {
    moverPara(l, alvo, 2);
  } else {
    moverPorTatica(l, alvo, eq.tatica, R);
  }

  const A = R.arena;
  l.x = Math.max(A.xMin, Math.min(A.xMax, l.x + l.vx * PASSO));
  l.y = Math.max(A.yMin, Math.min(A.yMax, l.y + l.vy * PASSO));
  if (!outro.desmaiado) l.olhando = outro.x > l.x ? 1 : -1;

  reduzirRecargas(l);
  if (l.entrando > 0) l.entrando = Math.max(0, l.entrando - PASSO);
  if (l.recargaGlobal > 0) l.recargaGlobal = Math.max(0, l.recargaGlobal - PASSO);
  if (l.buff && (l.buff.restante -= PASSO) <= 0) l.buff = null;

  if (alvo && !ocupado && l.recargaGlobal <= 0 && b.vencedor === null) {
    let i = -1;
    if (fila && golpeFila && fila.recarga <= 0 && (!golpeFila.contato || distancia(l, alvo) <= (golpeFila.alcance ?? 0))) {
      i = eq.proximoGolpe;
      eq.proximoGolpe = -1;
    }
    // Se o golpe da fila está quase pronto, segura os automáticos para não gastar a recarga global.
    const filaQuasePronta = fila !== undefined && fila.recarga > 0 && fila.recarga < R.ia.esperaFila;
    if (i < 0 && !filaQuasePronta) i = escolherGolpe(c, l, alvo);
    if (i >= 0) usarGolpe(b, c, l, alvo, i, ev);
  }
  l.relogio += PASSO;
}

function reduzirRecargas(l: Lutador): void {
  for (const uso of l.golpes) if (uso.recarga > 0) uso.recarga = Math.max(0, uso.recarga - PASSO);
}

function usarGolpe(b: EstadoBatalha, c: Conteudo, l: Lutador, alvo: Lutador, indice: number, ev: Evento[]): void {
  const R = c.regras;
  const uso = l.golpes[indice]!;
  const g = golpeDe(c, uso.id);
  uso.recarga = g.recarga;
  l.recargaGlobal = l.recargaGlobalMax = g.dano ? R.recargaGlobal.ataque : R.recargaGlobal.buff;
  ev.push({ tipo: 'golpe', autor: l.uid, golpe: uso.id, indice });
  if (g.buff) {
    l.buff = { atributo: g.buff.atributo, valor: g.buff.valor, restante: g.buff.duracao };
    ev.push({ tipo: 'buff', lutador: l.uid, atributo: g.buff.atributo, valor: g.buff.valor });
  }
  if (!g.dano) return;
  if (g.contato) {
    acertar(b, c, alvo, l, uso.id, ev);
  } else {
    b.projeteis.push({ x: l.x + l.olhando * 6, y: l.y, alvo: alvo.uid, autor: l.uid, golpe: uso.id });
    ev.push({ tipo: 'projetil', autor: l.uid, alvo: alvo.uid, golpe: uso.id });
  }
}

function acertar(b: EstadoBatalha, c: Conteudo, alvo: Lutador, autor: Lutador, golpe: string, ev: Evento[]): void {
  const g = golpeDe(c, golpe);
  const r = calcularDano(
    c,
    combatente(c, autor),
    combatente(c, alvo),
    { tipo: g.tipo, poder: g.dano?.poder ?? 0 },
    sortear(b.rng),
  );
  alvo.hp = Math.max(0, alvo.hp - r.valor);
  autor.danoCausado += r.valor;
  ev.push({ tipo: 'dano', alvo: alvo.uid, autor: autor.uid, golpe, valor: r.valor, eficacia: r.eficacia });
  if (alvo.hp <= 0 && !alvo.desmaiado) desmaiar(b, c, alvo, ev);
}

function desmaiar(b: EstadoBatalha, c: Conteudo, l: Lutador, ev: Evento[]): void {
  l.desmaiado = true;
  l.buff = null;
  ev.push({ tipo: 'desmaio', lutador: l.uid });
  if (b.vencedor !== null) return;
  const eq = b.equipes[l.equipe];
  if (!eq.lutadores.some((x) => !x.desmaiado)) {
    b.vencedor = outra(l.equipe);
    ev.push({ tipo: 'fim', vencedor: b.vencedor });
    return;
  }
  eq.substituicao = c.regras.substituicao;
  eq.proximoGolpe = -1;
  eq.destino = null;
  eq.troca = null;
}

/** Depois de um desmaio: a IA manda a primeira viva; o jogador escolhe, a menos que só reste uma. */
function substituir(b: EstadoBatalha, c: Conteudo, e: Equipe, ev: Evento[]): void {
  const eq = b.equipes[e];
  const vivos = eq.lutadores.flatMap((l, i) => (l.desmaiado ? [] : [i]));
  if (eq.piloto === 'ia' || vivos.length === 1) {
    colocar(b, c, e, vivos[0]!, null, 'substituicao', ev);
  } else {
    b.aguardandoEscolha = e;
    ev.push({ tipo: 'aguardandoEscolha', equipe: e });
  }
}

function concluirTroca(b: EstadoBatalha, c: Conteudo, e: Equipe, ev: Evento[]): void {
  const eq = b.equipes[e];
  const velho = ativo(b, e);
  const para = eq.troca!.para;
  velho.buff = null;
  eq.troca = null;
  eq.esperaTroca = c.regras.troca.espera;
  colocar(b, c, e, para, { x: velho.x, y: velho.y }, 'troca', ev);
}

/** Põe a criatura `indice` em campo, no ponto `de` (troca) ou na posição inicial da equipe. */
function colocar(b: EstadoBatalha, c: Conteudo, e: Equipe, indice: number, de: Ponto | null, motivo: MotivoEntrada, ev: Evento[]): void {
  const R = c.regras;
  const eq = b.equipes[e];
  eq.ativo = indice;
  const l = ativo(b, e);
  const p = de ?? R.arena.inicio[e];
  l.x = p.x;
  l.y = p.y;
  l.vx = 0;
  l.vy = 0;
  l.entrando = R.entrada;
  l.recargaGlobal = l.recargaGlobalMax = R.recargaGlobal.aoEntrar;
  eq.proximoGolpe = -1;
  eq.destino = null;
  ev.push({ tipo: 'entrou', equipe: e, lutador: l.uid, motivo });
}

function moverProjeteis(b: EstadoBatalha, c: Conteudo, ev: Evento[]): void {
  const R = c.regras;
  for (let i = b.projeteis.length - 1; i >= 0; i--) {
    const p = b.projeteis[i]!;
    const alvo = lutadorPorUid(b, p.alvo);
    const emCampo = ativo(b, alvo.equipe) === alvo && !alvo.desmaiado && !b.equipes[alvo.equipe].troca;
    if (!emCampo) {
      b.projeteis.splice(i, 1);
      ev.push({ tipo: 'projetilPerdido', x: p.x, y: p.y, golpe: p.golpe });
      continue;
    }
    const dx = alvo.x - p.x;
    const dy = alvo.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < R.projetil.raioAcerto) {
      b.projeteis.splice(i, 1);
      acertar(b, c, alvo, lutadorPorUid(b, p.autor), p.golpe, ev);
    } else {
      const k = Math.min(1, (R.projetil.velocidade * PASSO) / d);
      p.x += dx * k;
      p.y += dy * k;
    }
  }
}
