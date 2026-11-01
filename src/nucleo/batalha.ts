// O passo da simulação. Comandos entram, o estado muda, eventos saem.
// Nada aqui lê relógio, tela, teclado ou sorteio global: a mesma semente com os
// mesmos comandos sempre produz a mesma batalha.

import type { Conteudo, Efeito, Golpe, Membro } from '../conteudo/esquema';
import {
  colocarForma,
  colocarObjeto,
  copiaQueEngana,
  deixarRastro,
  executarPosicionado,
  forcasDeCampo,
  passarAgendados,
  passarObjetos,
  passarZonas,
  pontosDe,
  saltarDoPino,
  terrenoSob,
} from './campo';
import {
  acertar,
  aplicarCarga,
  aplicarEstado,
  aplicarNoAlvo,
  atingivel,
  direcao,
  emCampo,
  emCampoAgora,
  encerrarAcao,
  limparAoSair,
  passarCondicoes,
  rivalEmCampo,
  tirarEstado,
} from './combate';
import { ativo, distancia, emGolpe, golpeDe, lutadorPorUid, outra, temCondicao, temEstado, velocidadeAtual } from './consulta';
import { EPS, FOLGA_ALCANCE, PASSO } from './constantes';
import { mods, raioCorpo, type Mods } from './estados';
import { posicaoDaForma } from './formas';
import { escolherGolpe, taticaDaIa } from './ia';
import type { Acao, Comando, Equipe, EstadoBatalha, EstadoEquipe, Evento, Lutador, MotivoEntrada, Piloto, Ponto } from './modelo';
import { moverPara, moverPorTatica } from './movimento';
import { perfilDoGolpe } from './perfil';
import { lancarDe, lancarGuiado, moverProjeteis } from './projeteis';

export { PASSO } from './constantes';

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
    zonas: [],
    objetos: [],
    agendados: [],
    proximoId: 1,
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
    fatorEstados: 1,
    curaAcumulada: 0,
    ultimoGolpe: null,
    portalEspera: 0,
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
      if (i !== eq.ativo) reduzirRecargas(l, 1);
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
  passarLigacoes(b, c, ev);
  if (b.objetos.length) passarObjetos(b, c, ev);
  moverProjeteis(b, c, ev);
  passarZonas(b, c, ev);
  passarAgendados(b, c, ev);
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
      encerrarAcao(c, saindo); // quem volta abandona o golpe em andamento
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

  // Estados e campos só existem nos golpes novos; sem eles, o caminho é o da Arena original.
  const m: Mods | null = b.zonas.length || l.condicoes.some((cd) => cd.tipo === 'estado') ? mods(b, c, l) : null;
  l.fatorEstados = m ? m.velocidade : 1;
  const ocupado = eq.troca !== null || l.entrando > 0;
  const atordoado = temCondicao(l, 'atordoado') || m?.trava === 'tudo';
  const semAcao = atordoado || m?.trava === 'acao';
  const preso = temCondicao(l, 'preso') || m?.trava === 'movimento';
  // Conjurando ou canalizando um golpe `parado`; nos golpes `lento` e `livre`, a velocidade já vem com o fator.
  const parado = emGolpe(l) && l.acao!.movimento === 0;
  const fila = eq.proximoGolpe >= 0 ? l.golpes[eq.proximoGolpe] : undefined;
  const golpeFila = fila ? golpeDe(c, fila.id) : undefined;
  const contatoFila = golpeFila ? perfilDoGolpe(golpeFila).contato : false;
  const { x: ix, y: iy } = eq.direcao;
  const antes = { x: l.x, y: l.y, vx: l.vx, vy: l.vy };

  if (l.deslocamento) {
    l.vx = l.deslocamento.vx;
    l.vy = l.deslocamento.vy;
  } else if (ocupado || atordoado || parado) {
    l.vx *= 0.7;
    l.vy *= 0.7;
  } else if (preso) {
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

  if (m && !l.deslocamento && !preso && !atordoado) ajustarPorEstados(l, m, alvo, antes);
  if (b.zonas.length && !l.deslocamento) forcasDeCampo(b, c, l);

  const A = R.arena;
  l.x = Math.max(A.xMin, Math.min(A.xMax, l.x + l.vx * PASSO));
  l.y = Math.max(A.yMin, Math.min(A.yMax, l.y + l.vy * PASSO));
  if (!outro.desmaiado) l.olhando = outro.x > l.x ? 1 : -1;
  const desl = l.deslocamento;
  if (desl?.carga && !desl.carga.atingiu && alvo && atingivel(b, c, alvo, desl.carga.golpe)) {
    // Avanço que acerta ao passar pelo rival.
    if (distancia(l, alvo) <= raioCorpo(b, c, l) + raioCorpo(b, c, alvo)) {
      desl.carga.atingiu = true;
      aplicarCarga(b, c, alvo, l, desl.carga.golpe, desl.carga, 'contato', ev);
    }
  }
  if (desl && l.deslocamento === desl && (desl.restante -= PASSO) <= EPS) {
    // Fim do movimento forçado: para no lugar em vez de deslizar.
    if (desl.rastro) deixarRastro(b, c, l, desl.rastro, l);
    l.deslocamento = null;
    l.vx = 0;
    l.vy = 0;
  }
  if (m) acumularCargas(c, l, Math.hypot(l.x - antes.x, l.y - antes.y));

  reduzirRecargas(l, m?.recarga ?? 1);
  if (l.entrando > 0) l.entrando = Math.max(0, l.entrando - PASSO);
  if (l.recargaGlobal > 0) l.recargaGlobal = Math.max(0, l.recargaGlobal - PASSO);
  if (l.buff && (l.buff.restante -= PASSO) <= 0) l.buff = null;
  if (l.portalEspera > 0) l.portalEspera = Math.max(0, l.portalEspera - PASSO);
  passarCondicoes(b, c, l, ev);
  if (l.desmaiado) {
    l.relogio += PASSO;
    return;
  }
  if (l.acao) progredirAcao(b, c, l, ev, m?.conjuracao ?? 1);

  if (alvo && !ocupado && !semAcao && !l.acao && l.recargaGlobal <= 0 && b.vencedor === null) {
    let i = -1;
    if (fila && golpeFila && fila.recarga <= 0 && (!contatoFila || distancia(l, alvo) <= (golpeFila.alcance ?? 0))) {
      i = eq.proximoGolpe;
      eq.proximoGolpe = -1;
    }
    // Se o golpe da fila está quase pronto, segura os automáticos para não gastar a recarga global.
    const filaQuasePronta = fila !== undefined && fila.recarga > 0 && fila.recarga < R.ia.esperaFila;
    if (i < 0 && !filaQuasePronta) {
      const meusCampos = b.zonas.flatMap((z) => (z.campo && z.autor === l.uid ? [z.campo] : []));
      i = escolherGolpe(c, l, alvo, m, meusCampos);
    }
    if (i >= 0) usarGolpe(b, c, l, alvo, i, ev);
  }
  l.relogio += PASSO;
}

/** Caçada (mais rápida em direção à presa), inquietude (não para) e escorregão (a velocidade muda devagar). */
function ajustarPorEstados(l: Lutador, m: Mods, alvo: Lutador | null, antes: { vx: number; vy: number }): void {
  if (m.cacada && alvo && m.cacada.alvo === alvo.uid && l.vx * (alvo.x - l.x) + l.vy * (alvo.y - l.y) > 0) {
    l.vx *= m.cacada.velocidade;
    l.vy *= m.cacada.velocidade;
  }
  if (m.inquieto && Math.hypot(l.vx, l.vy) < l.velocidade * 0.2) {
    const ang = l.relogio * 1.7;
    l.vx = Math.cos(ang) * l.velocidade * 0.35;
    l.vy = Math.sin(ang) * l.velocidade * 0.35;
  }
  if (m.aderencia < 1) {
    l.vx = antes.vx + (l.vx - antes.vx) * m.aderencia;
    l.vy = antes.vy + (l.vy - antes.vy) * m.aderencia;
  }
}

/** Estados com cargas (estática): cada `distancia` andada vira uma carga, até o máximo. */
function acumularCargas(c: Conteudo, l: Lutador, andou: number): void {
  for (const cd of l.condicoes) {
    if (cd.tipo !== 'estado') continue;
    const k = c.estados[cd.estado]?.cargas;
    if (!k) continue;
    cd.andado += andou;
    while (cd.andado >= k.distancia && cd.cargas < k.maximo) {
      cd.cargas++;
      cd.andado -= k.distancia;
    }
  }
}

/** A recarga do golpe em andamento só começa a correr quando ele acaba (ver encerrarAcao). */
function reduzirRecargas(l: Lutador, ritmo: number): void {
  l.golpes.forEach((uso, i) => {
    if (uso.recarga > 0 && i !== l.acao?.indice) uso.recarga = Math.max(0, uso.recarga - PASSO * ritmo);
  });
}

/** Correntes e atrações entre duas criaturas. */
function passarLigacoes(b: EstadoBatalha, c: Conteudo, ev: Evento[]): void {
  const A = c.regras.arena;
  const prender = (l: Lutador) => {
    l.x = Math.max(A.xMin, Math.min(A.xMax, l.x));
    l.y = Math.max(A.yMin, Math.min(A.yMax, l.y));
  };
  for (const l of emCampoAgora(b)) {
    if (!l.condicoes.some((cd) => cd.tipo === 'acorrentado' || cd.tipo === 'atraido')) continue;
    for (const cd of [...l.condicoes]) {
      if (cd.tipo !== 'acorrentado' && cd.tipo !== 'atraido') continue;
      const autor = lutadorPorUid(b, cd.autor);
      const fora = () => (l.condicoes = l.condicoes.filter((x) => x !== cd));
      if (!emCampo(b, autor)) {
        fora();
        continue;
      }
      const d = distancia(l, autor);
      if (d < 0.01) continue;
      const ux = (autor.x - l.x) / d;
      const uy = (autor.y - l.y) / d;
      if (cd.tipo === 'acorrentado') {
        if (d > cd.distancia) {
          l.x = autor.x - ux * cd.distancia;
          l.y = autor.y - uy * cd.distancia;
          prender(l);
        }
        continue;
      }
      const passo = Math.min(cd.velocidade * PASSO, d / 2);
      l.x += ux * passo;
      l.y += uy * passo;
      autor.x -= ux * passo;
      autor.y -= uy * passo;
      prender(l);
      prender(autor);
      if (distancia(l, autor) <= raioCorpo(b, c, l) + raioCorpo(b, c, autor)) {
        fora();
        if (cd.aoEncostar > 0) acertar(b, c, l, autor, cd.golpe, cd.aoEncostar, 'contato', ev);
      }
    }
  }
}

// ---------- Golpes e efeitos ----------

function usarGolpe(b: EstadoBatalha, c: Conteudo, l: Lutador, alvo: Lutador, indice: number, ev: Evento[]): void {
  const R = c.regras;
  const uso = l.golpes[indice]!;
  const g = golpeDe(c, uso.id);
  // A recarga recomeça cheia quando o golpe acaba (encerrarAcao); até lá o card já aparece gasto.
  uso.recarga = g.recarga;
  l.recargaGlobal = l.recargaGlobalMax = perfilDoGolpe(g).atingeAlvo ? R.recargaGlobal.ataque : R.recargaGlobal.buff;
  l.ultimoGolpe = uso.id;
  ev.push({ tipo: 'golpe', autor: l.uid, golpe: uso.id, indice, conjuracao: g.conjuracao });
  const { ux, uy } = direcao(l, alvo);
  // A mira fica onde o rival estava agora: quem vê a marca durante a conjuração tem tempo de sair.
  let mira = { x: alvo.x, y: alvo.y, ux, uy };
  let enganado = false;
  if (b.objetos.length) {
    const falsa = copiaQueEngana(b, alvo);
    if (falsa) {
      const d = direcao(l, falsa);
      mira = { x: falsa.x, y: falsa.y, ux: d.ux, uy: d.uy };
      enganado = true;
    }
  }
  l.acao = {
    golpe: uso.id,
    indice,
    alvo: alvo.uid,
    conjuracao: g.conjuracao,
    passo: 0,
    espera: 0,
    canal: false,
    zona: null,
    movimento: g.durante === 'livre' ? 1 : g.durante === 'lento' ? R.golpeLento : 0,
    mira,
    ponta: null,
    enganado,
    bonus: gastarCargas(c, l, g),
    errou: false,
  };
  if (g.conjuracao <= 0) executarEfeitos(b, c, l, ev);
}

/** Golpe do tipo das cargas (estática): ganha o bônus e gasta o estado. */
function gastarCargas(c: Conteudo, l: Lutador, g: Golpe): number {
  for (const cd of l.condicoes) {
    if (cd.tipo !== 'estado') continue;
    const k = c.estados[cd.estado]?.cargas;
    if (k && k.tipo === g.tipo) {
      tirarEstado(l, cd.estado);
      return 1 + cd.cargas * k.bonus;
    }
  }
  return 1;
}

/** Conta a conjuração ou a espera do efeito em andamento; quando acaba, segue a lista. */
function progredirAcao(b: EstadoBatalha, c: Conteudo, l: Lutador, ev: Evento[], ritmoConjuracao: number): void {
  const a = l.acao!;
  if (a.conjuracao > 0) {
    a.conjuracao -= PASSO * ritmoConjuracao;
    if (a.conjuracao > EPS) return;
  } else if (a.espera > 0) {
    a.espera -= PASSO;
    if (a.espera > EPS) return;
  }
  a.conjuracao = 0;
  a.espera = 0;
  a.canal = false;
  executarEfeitos(b, c, l, ev);
}

/** Executa os efeitos em ordem até acabar a lista ou chegar num efeito com duração (avanço, recuo, canalização, espera). */
function executarEfeitos(b: EstadoBatalha, c: Conteudo, l: Lutador, ev: Evento[]): void {
  const a = l.acao!;
  const g = golpeDe(c, a.golpe);
  while (l.acao === a && a.passo < g.efeitos.length && a.espera <= 0) {
    const k = a.passo++;
    a.espera = executarEfeito(b, c, l, a, g, g.efeitos[k]!, ev);
  }
  if (l.acao === a && a.passo >= g.efeitos.length && a.espera <= 0) encerrarAcao(c, l);
}

/** Rival da ação, se ainda estiver em campo e atingível. */
function alvoDaAcao(b: EstadoBatalha, uid: number): Lutador | null {
  const alvo = lutadorPorUid(b, uid);
  return rivalEmCampo(b, outra(alvo.equipe)) === alvo ? alvo : null;
}

/** Alcance do corpo a corpo agora: o do golpe, maior com o estado "gigante" e com a caçada contra a presa. */
function alcanceDe(b: EstadoBatalha, c: Conteudo, l: Lutador, g: Golpe, alvo: Lutador): number {
  const base = g.alcance ?? 0;
  if (!l.condicoes.some((cd) => cd.tipo === 'estado')) return base;
  const m = mods(b, c, l);
  return base * m.areaPerto + (m.cacada && m.cacada.alvo === alvo.uid ? m.cacada.alcance : 0);
}

/** Executa um efeito. Devolve quantos segundos esperar antes do próximo (0 = na hora). */
function executarEfeito(b: EstadoBatalha, c: Conteudo, l: Lutador, a: Acao, g: Golpe, ef: Efeito, ev: Evento[]): number {
  const R = c.regras;
  const alvo = alvoDaAcao(b, a.alvo);
  const errou = (): number => {
    if (!a.errou) ev.push({ tipo: 'errou', autor: l.uid, golpe: a.golpe });
    a.errou = true;
    return 0;
  };
  const aoAlcance = (r: Lutador | null): r is Lutador =>
    !!r && !a.enganado && distancia(l, r) <= alcanceDe(b, c, l, g, r) + FOLGA_ALCANCE && atingivel(b, c, r, a.golpe);
  switch (ef.efeito) {
    case 'buff':
      l.buff = { atributo: ef.atributo, valor: ef.valor, restante: ef.duracao };
      ev.push({ tipo: 'buff', lutador: l.uid, atributo: ef.atributo, valor: ef.valor });
      return 0;
    case 'curar': {
      const impede = (b.zonas.length || l.condicoes.some((cd) => cd.tipo === 'estado')) && mods(b, c, l).impedeCura;
      if (impede) return 0;
      const valor = Math.min(l.hpMax - l.hp, Math.round((l.hpMax * ef.porcento) / 100));
      l.hp += valor;
      ev.push({ tipo: 'cura', lutador: l.uid, valor });
      return 0;
    }
    case 'avancar':
    case 'recuar': {
      const { ux, uy, d } = direcao(l, alvo);
      const sentido = ef.efeito === 'avancar' ? 1 : -1;
      const avanca = ef.efeito === 'avancar';
      const dist = avanca && alvo && !ef.atravessa ? Math.min(ef.distancia, Math.max(0, d - R.distanciaMinima)) : ef.distancia;
      const v = dist / ef.duracao;
      l.deslocamento = { vx: ux * v * sentido, vy: uy * v * sentido, restante: ef.duracao };
      if (avanca && (ef.poder > 0 || ef.efeitos.length)) l.deslocamento.carga = { golpe: a.golpe, poder: ef.poder * a.bonus, efeitos: ef.efeitos, atingiu: false };
      if (avanca && ef.rastro) l.deslocamento.rastro = { ...ef.rastro, golpe: a.golpe, x: l.x, y: l.y };
      if (avanca && ef.estado) aplicarEstado(b, c, l, l, ef.estado, ef.duracao, alvo?.uid ?? null, ev);
      ev.push({ tipo: 'deslocamento', lutador: l.uid, motivo: ef.efeito });
      return ef.duracao;
    }
    case 'teleporte': {
      if (!alvo) return errou();
      const { ux, uy } = direcao(l, alvo);
      const A = R.arena;
      const de = { x: l.x, y: l.y };
      const para = ef.para === 'no-rival' ? { x: alvo.x, y: alvo.y } : { x: alvo.x + ux * ef.distancia, y: alvo.y + uy * ef.distancia };
      l.x = Math.max(A.xMin, Math.min(A.xMax, para.x));
      l.y = Math.max(A.yMin, Math.min(A.yMax, para.y));
      l.vx = 0;
      l.vy = 0;
      if (ef.rastro) deixarRastro(b, c, l, { ...ef.rastro, golpe: a.golpe, ...de }, l);
      ev.push({ tipo: 'deslocamento', lutador: l.uid, motivo: 'teleporte' });
      return 0;
    }
    case 'esperar':
      a.canal = true;
      return ef.duracao;
    case 'projetil':
      if (ef.trajetoria === 'guiado') {
        if (!alvo || a.enganado) return errou();
        lancarGuiado(b, l, alvo, a.golpe, ef, ev);
        return 0;
      }
      lancarDe(b, c, l, a.golpe, ef, { x: l.x, y: l.y }, ev, {
        mira: a.enganado ? a.mira : null,
        alvoUid: a.alvo,
        bonus: a.bonus,
        herda: ef.herdaCampo ? terrenoSob(b, c, l) : null,
      });
      if (b.objetos.length) saltarDoPino(b, c, l, a.golpe, ef, ev);
      return 0;
    case 'area':
    case 'cone':
    case 'linha':
    case 'parede': {
      const A = R.arena;
      const pos = posicaoDaForma(l, a, ef, { x: (A.xMin + A.xMax) / 2, y: A.yMin });
      const r = colocarForma(b, c, l, a.golpe, ef, pos, ev, { acao: a, bonus: a.bonus });
      if (r.espera > 0) return r.espera;
      const instantanea = ef.atraso === undefined && ef.duracao === undefined && !ef.move;
      if (instantanea && r.temCarga && !r.acertou) errou();
      if (r.temCarga && b.objetos.length) saltarDoPino(b, c, l, a.golpe, ef, ev);
      return 0;
    }
    case 'varias': {
      pontosDe(b, c, l, a, ef).forEach((pos, i) => {
        const espera = i * ef.intervalo;
        if (espera <= 0) executarPosicionado(b, c, l, a.golpe, ef.faz, pos, ev, a.bonus);
        else b.agendados.push({ espera, autor: l.uid, golpe: a.golpe, efeito: ef.faz, ...pos });
      });
      return 0;
    }
    case 'cada-campo': {
      const meus = b.zonas.filter((z) => z.campo === ef.campo && z.autor === l.uid);
      const { ux, uy } = a.mira;
      if (!meus.length) {
        for (const f of ef.senao) executarPosicionado(b, c, l, a.golpe, f, { x: l.x, y: l.y, ux, uy }, ev, a.bonus);
        return 0;
      }
      for (const z of meus) {
        if (ef.apaga) b.zonas.splice(b.zonas.indexOf(z), 1);
        for (const f of ef.faz) executarPosicionado(b, c, l, a.golpe, f, { x: z.x, y: z.y, ux, uy }, ev, a.bonus);
      }
      return 0;
    }
    case 'objeto':
      colocarObjeto(b, c, l, a.golpe, ef, a);
      return 0;
    case 'copiar': {
      const copiado = alvo?.ultimoGolpe;
      if (!copiado || golpeDe(c, copiado).efeitos.some((e) => e.efeito === 'copiar')) return errou();
      // Segue com o golpe do rival, sem a conjuração dele; a recarga continua sendo a do Espelho.
      l.acao = { ...a, golpe: copiado, passo: 0, espera: 0, canal: false, zona: null, conjuracao: 0, ponta: null, errou: false };
      ev.push({ tipo: 'golpe', autor: l.uid, golpe: copiado, indice: a.indice, conjuracao: 0 });
      executarEfeitos(b, c, l, ev);
      return 0;
    }
    case 'dano': {
      if (!aoAlcance(alvo)) return errou();
      let poder = ef.poder;
      if (ef.escalaHp) poder += (ef.escalaHp.ate - ef.poder) * Math.min(1, Math.max(0, (1 - l.hp / l.hpMax) / 0.9));
      if (ef.seEstado && temEstado(alvo, ef.seEstado.estado)) {
        poder = ef.seEstado.poder;
        if (ef.seEstado.remove) tirarEstado(alvo, ef.seEstado.estado);
      }
      acertar(b, c, alvo, l, a.golpe, poder, 'contato', ev, { bonus: a.bonus, drena: ef.drena });
      if (b.objetos.length) saltarDoPino(b, c, l, a.golpe, { poder, efeitos: [] }, ev);
      return 0;
    }
    case 'estado':
      if (ef.em === 'si') {
        aplicarEstado(b, c, l, l, ef.estado, ef.duracao, a.alvo, ev);
        return 0;
      }
      if (!aoAlcance(alvo)) return errou();
      aplicarNoAlvo(b, c, alvo, l, a.golpe, ef, ev);
      return 0;
    default:
      if (!aoAlcance(alvo)) return errou();
      aplicarNoAlvo(b, c, alvo, l, a.golpe, ef, ev);
      return 0;
  }
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
  limparAoSair(c, velho);
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
