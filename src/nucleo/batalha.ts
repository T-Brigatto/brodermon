// O passo da simulação. Comandos entram, o estado muda, eventos saem.
// Nada aqui lê relógio, tela, teclado ou sorteio global: a mesma semente com os
// mesmos comandos sempre produz a mesma batalha.

import type { Conteudo, EfeitoNoAlvo, Efeito, Golpe, Membro } from '../conteudo/esquema';
import { sortear } from './aleatorio';
import { ativo, combatente, distancia, golpeDe, lutadorPorUid, outra, temCondicao, velocidadeAtual } from './consulta';
import { calcularDano } from './dano';
import { escolherGolpe, taticaDaIa } from './ia';
import type {
  Acao,
  Comando,
  Condicao,
  Equipe,
  EstadoBatalha,
  EstadoEquipe,
  Evento,
  Lutador,
  MotivoEntrada,
  OrigemDano,
  Piloto,
  Ponto,
} from './modelo';
import { moverPara, moverPorTatica } from './movimento';
import { perfilDoGolpe } from './perfil';

/** Duração de um passo: 60 passos por segundo de jogo. */
export const PASSO = 1 / 60;

/** Folga de distância para um efeito direto ainda acertar (o rival pode ter andado um pouco). */
const FOLGA_ALCANCE = 4;

/**
 * Folga para os temporizadores dos efeitos: 0,25 − 15 × (1/60) sobra um resíduo positivo minúsculo
 * em ponto flutuante, e sem a folga um avanço de 0,25 s duraria 16 passos em vez de 15.
 */
const EPS = 1e-9;

const EQUIPES = [0, 1] as const;

export interface ConfigBatalha {
  semente: number;
  equipes: [{ piloto: Piloto; time: Membro[] }, { piloto: Piloto; time: Membro[] }];
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
      { piloto: a.piloto, time: structuredClone(a.time) },
      { piloto: z.piloto, time: structuredClone(z.time) },
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
    const lutadores = cfg.time.map((membro) => criarLutador(c, membro, e, uid++, m, c.regras.arena.inicio[e]));
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
  membro: Membro,
  equipe: Equipe,
  uid: number,
  mod: { ataque: number; hp: number },
  inicio: Ponto,
): Lutador {
  const especie = typeof membro === 'string' ? membro : membro.especie;
  const esp = c.especies[especie];
  if (!esp) throw new Error(`espécie "${especie}" não existe`);
  const golpes = (typeof membro === 'string' ? undefined : membro.golpes) ?? esp.golpes;
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
    golpes: golpes.map((id) => ({ id, recarga: 0 })),
    recargaGlobal: 0,
    recargaGlobalMax: 1,
    entrando: 0,
    buff: null,
    condicoes: [],
    deslocamento: null,
    acao: null,
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
      const saindo = ativo(b, cmd.equipe);
      saindo.acao = null; // quem volta abandona o golpe em andamento
      eq.troca = { para: cmd.indice, restante: c.regras.troca.duracao };
      ev.push({ tipo: 'trocaIniciada', equipe: cmd.equipe, saindo: saindo.uid, entrando: l.uid });
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
  const atordoado = temCondicao(l, 'atordoado');
  const conjurando = l.acao !== null && l.acao.conjuracao > 0;
  const fila = eq.proximoGolpe >= 0 ? l.golpes[eq.proximoGolpe] : undefined;
  const golpeFila = fila ? golpeDe(c, fila.id) : undefined;
  const contatoFila = golpeFila ? perfilDoGolpe(golpeFila).contato : false;
  const { x: ix, y: iy } = eq.direcao;

  if (l.deslocamento) {
    l.vx = l.deslocamento.vx;
    l.vy = l.deslocamento.vy;
  } else if (ocupado || atordoado || conjurando) {
    l.vx *= 0.7;
    l.vy *= 0.7;
  } else if (temCondicao(l, 'preso')) {
    l.vx = 0;
    l.vy = 0;
  } else if (ix || iy) {
    const n = Math.hypot(ix, iy);
    const v = velocidadeAtual(l);
    l.vx = (ix / n) * v;
    l.vy = (iy / n) * v;
    eq.destino = null;
  } else if (eq.destino) {
    const chegou = moverPara(l, eq.destino, eq.destino.fixo ? 2 : 2.5);
    if (chegou && !eq.destino.fixo) eq.destino = null;
  } else if (contatoFila && alvo && distancia(l, alvo) > (golpeFila!.alcance ?? 0) - 4) {
    moverPara(l, alvo, 2);
  } else {
    moverPorTatica(l, alvo, eq.tatica, R);
  }

  const A = R.arena;
  l.x = Math.max(A.xMin, Math.min(A.xMax, l.x + l.vx * PASSO));
  l.y = Math.max(A.yMin, Math.min(A.yMax, l.y + l.vy * PASSO));
  if (!outro.desmaiado) l.olhando = outro.x > l.x ? 1 : -1;
  if (l.deslocamento && (l.deslocamento.restante -= PASSO) <= EPS) {
    // Fim do movimento forçado: para no lugar em vez de deslizar.
    l.deslocamento = null;
    l.vx = 0;
    l.vy = 0;
  }

  reduzirRecargas(l);
  if (l.entrando > 0) l.entrando = Math.max(0, l.entrando - PASSO);
  if (l.recargaGlobal > 0) l.recargaGlobal = Math.max(0, l.recargaGlobal - PASSO);
  if (l.buff && (l.buff.restante -= PASSO) <= 0) l.buff = null;
  passarCondicoes(b, c, l, ev);
  if (l.desmaiado) {
    l.relogio += PASSO;
    return;
  }
  if (l.acao) progredirAcao(b, c, l, ev);

  if (alvo && !ocupado && !atordoado && !l.acao && l.recargaGlobal <= 0 && b.vencedor === null) {
    let i = -1;
    if (fila && golpeFila && fila.recarga <= 0 && (!contatoFila || distancia(l, alvo) <= (golpeFila.alcance ?? 0))) {
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

// ---------- Golpes e efeitos ----------

function usarGolpe(b: EstadoBatalha, c: Conteudo, l: Lutador, alvo: Lutador, indice: number, ev: Evento[]): void {
  const R = c.regras;
  const uso = l.golpes[indice]!;
  const g = golpeDe(c, uso.id);
  uso.recarga = g.recarga;
  l.recargaGlobal = l.recargaGlobalMax = perfilDoGolpe(g).atingeAlvo ? R.recargaGlobal.ataque : R.recargaGlobal.buff;
  ev.push({ tipo: 'golpe', autor: l.uid, golpe: uso.id, indice, conjuracao: g.conjuracao });
  l.acao = { golpe: uso.id, indice, alvo: alvo.uid, conjuracao: g.conjuracao, passo: 0, espera: 0, errou: false };
  if (g.conjuracao <= 0) executarEfeitos(b, c, l, ev);
}

/** Conta a conjuração ou a espera do efeito em andamento; quando acaba, segue a lista. */
function progredirAcao(b: EstadoBatalha, c: Conteudo, l: Lutador, ev: Evento[]): void {
  const a = l.acao!;
  if (a.conjuracao > 0) {
    a.conjuracao -= PASSO;
    if (a.conjuracao > EPS) return;
  } else if (a.espera > 0) {
    a.espera -= PASSO;
    if (a.espera > EPS) return;
  }
  a.conjuracao = 0;
  a.espera = 0;
  executarEfeitos(b, c, l, ev);
}

/** Executa os efeitos em ordem até acabar a lista ou chegar num efeito com duração (avanço, recuo). */
function executarEfeitos(b: EstadoBatalha, c: Conteudo, l: Lutador, ev: Evento[]): void {
  const a = l.acao!;
  const g = golpeDe(c, a.golpe);
  while (l.acao === a && a.passo < g.efeitos.length && a.espera <= 0) {
    const k = a.passo++;
    a.espera = executarEfeito(b, c, l, a, g, g.efeitos[k]!, k, ev);
  }
  if (l.acao === a && a.passo >= g.efeitos.length && a.espera <= 0) l.acao = null;
}

/** Rival da ação, se ainda estiver em campo e atingível. */
function alvoDaAcao(b: EstadoBatalha, uid: number): Lutador | null {
  const alvo = lutadorPorUid(b, uid);
  const eq = b.equipes[alvo.equipe];
  return ativo(b, alvo.equipe) === alvo && !alvo.desmaiado && !eq.troca ? alvo : null;
}

/** Direção (unitária) de `de` para `para`; se estiverem no mesmo ponto, para onde `de` olha. */
function direcao(de: Lutador, para: Lutador | null): { ux: number; uy: number; d: number } {
  if (!para) return { ux: de.olhando, uy: 0, d: 0 };
  const dx = para.x - de.x;
  const dy = para.y - de.y;
  const d = Math.hypot(dx, dy);
  return d > 0.001 ? { ux: dx / d, uy: dy / d, d } : { ux: de.olhando, uy: 0, d };
}

/** Executa um efeito. Devolve quantos segundos esperar antes do próximo (0 = na hora). */
function executarEfeito(b: EstadoBatalha, c: Conteudo, l: Lutador, a: Acao, g: Golpe, ef: Efeito, k: number, ev: Evento[]): number {
  const R = c.regras;
  const alvo = alvoDaAcao(b, a.alvo);
  const errou = (): number => {
    if (!a.errou) ev.push({ tipo: 'errou', autor: l.uid, golpe: a.golpe });
    a.errou = true;
    return 0;
  };
  switch (ef.efeito) {
    case 'buff':
      l.buff = { atributo: ef.atributo, valor: ef.valor, restante: ef.duracao };
      ev.push({ tipo: 'buff', lutador: l.uid, atributo: ef.atributo, valor: ef.valor });
      return 0;
    case 'curar': {
      const valor = Math.min(l.hpMax - l.hp, Math.round((l.hpMax * ef.porcento) / 100));
      l.hp += valor;
      ev.push({ tipo: 'cura', lutador: l.uid, valor });
      return 0;
    }
    case 'avancar':
    case 'recuar': {
      const { ux, uy, d } = direcao(l, alvo);
      const sentido = ef.efeito === 'avancar' ? 1 : -1;
      const dist = ef.efeito === 'avancar' && alvo ? Math.min(ef.distancia, Math.max(0, d - R.distanciaMinima)) : ef.distancia;
      const v = dist / ef.duracao;
      l.deslocamento = { vx: ux * v * sentido, vy: uy * v * sentido, restante: ef.duracao };
      ev.push({ tipo: 'deslocamento', lutador: l.uid, motivo: ef.efeito });
      return ef.duracao;
    }
    case 'projetil':
      if (!alvo) return errou();
      b.projeteis.push({ x: l.x + l.olhando * 6, y: l.y, alvo: alvo.uid, autor: l.uid, golpe: a.golpe, efeito: k });
      ev.push({ tipo: 'projetil', autor: l.uid, alvo: alvo.uid, golpe: a.golpe });
      return 0;
    case 'dano':
      if (!alvo || distancia(l, alvo) > (g.alcance ?? 0) + FOLGA_ALCANCE) return errou();
      acertar(b, c, alvo, l, a.golpe, ef.poder, 'contato', ev);
      return 0;
    default:
      if (!alvo || distancia(l, alvo) > (g.alcance ?? 0) + FOLGA_ALCANCE) return errou();
      aplicarNoAlvo(b, c, alvo, l, a.golpe, ef, ev);
      return 0;
  }
}

/** Efeitos que atingem o rival (direto ou quando um projétil chega). */
function aplicarNoAlvo(b: EstadoBatalha, c: Conteudo, alvo: Lutador, autor: Lutador, golpe: string, ef: EfeitoNoAlvo, ev: Evento[]): void {
  if (alvo.desmaiado) return;
  switch (ef.efeito) {
    case 'empurrar':
    case 'puxar': {
      const { ux, uy, d } = direcao(autor, alvo);
      const puxa = ef.efeito === 'puxar';
      const dist = puxa ? Math.min(ef.distancia, Math.max(0, d - c.regras.distanciaMinima)) : ef.distancia;
      const v = (dist / ef.duracao) * (puxa ? -1 : 1);
      interromper(alvo, ev);
      alvo.deslocamento = { vx: ux * v, vy: uy * v, restante: ef.duracao };
      ev.push({ tipo: 'deslocamento', lutador: alvo.uid, motivo: ef.efeito });
      return;
    }
    case 'atordoar':
      interromper(alvo, ev);
      return adicionarCondicao(alvo, { tipo: 'atordoado', restante: ef.duracao }, ev);
    case 'prender':
      return adicionarCondicao(alvo, { tipo: 'preso', restante: ef.duracao }, ev);
    case 'lentidao':
      return adicionarCondicao(alvo, { tipo: 'lentidao', fator: ef.fator, restante: ef.duracao }, ev);
    case 'dano-continuo':
      return adicionarCondicao(alvo, { tipo: 'dano-continuo', porSegundo: ef.porSegundo, restante: ef.duracao, acumulado: 0, autor: autor.uid, golpe }, ev);
    case 'debuff':
      return adicionarCondicao(alvo, { tipo: 'debuff', atributo: ef.atributo, valor: ef.valor, restante: ef.duracao }, ev);
  }
}

/** Uma condição nova do mesmo tipo (e, no debuff, do mesmo atributo) substitui a anterior. */
function adicionarCondicao(l: Lutador, cd: Condicao, ev: Evento[]): void {
  const mesma = (x: Condicao) => x.tipo === cd.tipo && (x.tipo !== 'debuff' || cd.tipo !== 'debuff' || x.atributo === cd.atributo);
  l.condicoes = l.condicoes.filter((x) => !mesma(x));
  l.condicoes.push(cd);
  ev.push({ tipo: 'condicao', lutador: l.uid, condicao: cd.tipo, duracao: cd.restante });
}

/** Corta o golpe em andamento (conjuração ou sequência de efeitos). */
function interromper(l: Lutador, ev: Evento[]): void {
  if (!l.acao) return;
  ev.push({ tipo: 'interrompido', lutador: l.uid, golpe: l.acao.golpe });
  l.acao = null;
  l.deslocamento = null;
}

/** Desconta o tempo das condições e aplica o dano contínuo (em pontos inteiros, sem sorteio). */
function passarCondicoes(b: EstadoBatalha, c: Conteudo, l: Lutador, ev: Evento[]): void {
  for (let i = l.condicoes.length - 1; i >= 0; i--) {
    const cd = l.condicoes[i]!;
    if (cd.tipo === 'dano-continuo') {
      cd.acumulado += cd.porSegundo * PASSO;
      const n = Math.floor(cd.acumulado);
      if (n >= 1) {
        cd.acumulado -= n;
        aplicarDano(b, c, l, lutadorPorUid(b, cd.autor), cd.golpe, n, 1, 'continuo', ev);
        if (l.desmaiado) return;
      }
    }
    if ((cd.restante -= PASSO) <= EPS) l.condicoes.splice(i, 1);
  }
}

function acertar(b: EstadoBatalha, c: Conteudo, alvo: Lutador, autor: Lutador, golpe: string, poder: number, origem: OrigemDano, ev: Evento[]): void {
  const g = golpeDe(c, golpe);
  const r = calcularDano(c, combatente(c, autor), combatente(c, alvo), { tipo: g.tipo, poder }, sortear(b.rng));
  aplicarDano(b, c, alvo, autor, golpe, r.valor, r.eficacia, origem, ev);
}

function aplicarDano(
  b: EstadoBatalha,
  c: Conteudo,
  alvo: Lutador,
  autor: Lutador,
  golpe: string,
  valor: number,
  eficacia: number,
  origem: OrigemDano,
  ev: Evento[],
): void {
  alvo.hp = Math.max(0, alvo.hp - valor);
  autor.danoCausado += valor;
  ev.push({ tipo: 'dano', alvo: alvo.uid, autor: autor.uid, golpe, valor, eficacia, origem });
  if (alvo.hp <= 0 && !alvo.desmaiado) desmaiar(b, c, alvo, ev);
}

/** Tira de campo tudo o que era só desta passagem: buff, condições, movimento forçado e golpe em andamento. */
function limparAoSair(l: Lutador): void {
  l.buff = null;
  l.condicoes = [];
  l.deslocamento = null;
  l.acao = null;
}

function desmaiar(b: EstadoBatalha, c: Conteudo, l: Lutador, ev: Evento[]): void {
  l.desmaiado = true;
  limparAoSair(l);
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
  limparAoSair(velho);
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
    const ef = golpeDe(c, p.golpe).efeitos[p.efeito];
    if (ef?.efeito !== 'projetil') throw new Error(`o efeito ${p.efeito} de "${p.golpe}" não é um projétil`);
    const dx = alvo.x - p.x;
    const dy = alvo.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < R.projetil.raioAcerto) {
      b.projeteis.splice(i, 1);
      const autor = lutadorPorUid(b, p.autor);
      if (ef.poder > 0) acertar(b, c, alvo, autor, p.golpe, ef.poder, 'projetil', ev);
      for (const sub of ef.efeitos) aplicarNoAlvo(b, c, alvo, autor, p.golpe, sub, ev);
    } else {
      const k = Math.min(1, ((ef.velocidade ?? R.projetil.velocidade) * PASSO) / d);
      p.x += dx * k;
      p.y += dy * k;
    }
  }
}
