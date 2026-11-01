// Peças de combate que todo o núcleo usa: quem pode ser atingido, dano, cura, efeitos no
// alvo, condições e estados, interrupção, saída de campo e desmaio.

import type { Conteudo, EfeitoNoAlvo } from '../conteudo/esquema';
import { sortear } from './aleatorio';
import { ativo, combatente, golpeDe, lutadorPorUid, outra, recargaDe } from './consulta';
import { EPS, PASSO } from './constantes';
import { calcularDano } from './dano';
import { mods, multiplicadorPorTipo } from './estados';
import type { Condicao, Equipe, EstadoBatalha, Evento, Lutador, OrigemDano, Ponto } from './modelo';

/** Está ativa, de pé e não está voltando para a troca. */
export function emCampo(b: EstadoBatalha, l: Lutador): boolean {
  return ativo(b, l.equipe) === l && !l.desmaiado && !b.equipes[l.equipe].troca;
}

/** Quem a equipe `e` pode atingir agora: o ativo da outra equipe, se não estiver desmaiado nem voltando. */
export function rivalEmCampo(b: EstadoBatalha, e: Equipe): Lutador | null {
  const r = ativo(b, outra(e));
  return r.desmaiado || b.equipes[r.equipe].troca ? null : r;
}

/** As duas criaturas em campo agora. */
export function emCampoAgora(b: EstadoBatalha): Lutador[] {
  return [ativo(b, 0), ativo(b, 1)].filter((l) => emCampo(b, l));
}

/** Direção (unitária) de `de` para `para`; se estiverem no mesmo ponto, para onde `de` olha. */
export function direcao(de: Lutador, para: Ponto | null): { ux: number; uy: number; d: number } {
  if (!para) return { ux: de.olhando, uy: 0, d: 0 };
  const dx = para.x - de.x;
  const dy = para.y - de.y;
  const d = Math.hypot(dx, dy);
  return d > 0.001 ? { ux: dx / d, uy: dy / d, d } : { ux: de.olhando, uy: 0, d };
}

const temEstados = (l: Lutador) => l.condicoes.some((cd) => cd.tipo === 'estado');

/** Pode ser atingida? Intangível não; com `atingivelPor`, só por áreas em volta de quem usa (`anel`) desses tipos. */
export function atingivel(b: EstadoBatalha, c: Conteudo, alvo: Lutador, golpe: string, anel = false): boolean {
  if (!temEstados(alvo)) return true;
  const m = mods(b, c, alvo);
  if (!m.intangivel) return true;
  return anel && m.atingivelPor.includes(golpeDe(c, golpe).tipo);
}

/** Fim do golpe, completo ou cortado: a recarga passa a contar daqui. */
export function encerrarAcao(c: Conteudo, l: Lutador): void {
  const a = l.acao;
  if (!a) return;
  const uso = l.golpes[a.indice];
  if (uso?.id === a.golpe) uso.recarga = recargaDe(c, golpeDe(c, a.golpe));
  l.acao = null;
}

/** Corta o golpe em andamento (conjuração, canalização ou sequência de efeitos). */
export function interromper(c: Conteudo, l: Lutador, ev: Evento[]): void {
  if (!l.acao) return;
  ev.push({ tipo: 'interrompido', lutador: l.uid, golpe: l.acao.golpe });
  encerrarAcao(c, l);
  l.deslocamento = null;
}

/** Uma condição nova do mesmo tipo (no debuff, do mesmo atributo; no estado, do mesmo estado) substitui a anterior. */
export function adicionarCondicao(l: Lutador, cd: Condicao, ev: Evento[]): void {
  const mesma = (x: Condicao) =>
    x.tipo === cd.tipo &&
    (x.tipo !== 'debuff' || cd.tipo !== 'debuff' || x.atributo === cd.atributo) &&
    (x.tipo !== 'estado' || cd.tipo !== 'estado' || x.estado === cd.estado);
  l.condicoes = l.condicoes.filter((x) => !mesma(x));
  l.condicoes.push(cd);
  ev.push({ tipo: 'condicao', lutador: l.uid, condicao: cd.tipo, duracao: cd.restante, ...(cd.tipo === 'estado' ? { estado: cd.estado } : {}) });
}

/** Aplica um estado de `estados.json`. Um estado que trava a ação corta o golpe em andamento. */
export function aplicarEstado(b: EstadoBatalha, c: Conteudo, l: Lutador, autor: Lutador, id: string, duracao: number, alvo: number | null, ev: Evento[]): void {
  const e = c.estados[id];
  if (!e) throw new Error(`estado "${id}" não existe`);
  if (l.desmaiado) return;
  if (e.trava === 'acao' || e.trava === 'tudo') interromper(c, l, ev);
  adicionarCondicao(l, { tipo: 'estado', estado: id, restante: duracao, autor: autor.uid, alvo, cargas: 0, andado: 0 }, ev);
}

export function tirarEstado(l: Lutador, id: string): void {
  l.condicoes = l.condicoes.filter((cd) => cd.tipo !== 'estado' || cd.estado !== id);
}

/** Dano e efeitos de uma forma, de um projétil ou de um campo em quem foi atingido. */
export function aplicarCarga(
  b: EstadoBatalha,
  c: Conteudo,
  alvo: Lutador,
  autor: Lutador,
  golpe: string,
  carga: { poder: number; efeitos: EfeitoNoAlvo[]; drena?: number },
  origem: OrigemDano,
  ev: Evento[],
  bonus = 1,
): void {
  if (carga.poder > 0) acertar(b, c, alvo, autor, golpe, carga.poder, origem, ev, { bonus, drena: carga.drena });
  for (const sub of carga.efeitos) aplicarNoAlvo(b, c, alvo, autor, golpe, sub, ev);
}

/** Efeitos em quem foi atingido (direto, por forma, por projétil ou por campo). */
export function aplicarNoAlvo(b: EstadoBatalha, c: Conteudo, alvo: Lutador, autor: Lutador, golpe: string, ef: EfeitoNoAlvo, ev: Evento[]): void {
  if (alvo.desmaiado) return;
  // Só sorteia quando há chance de falhar: os golpes sem `chance` não mexem no sorteio.
  if (ef.chance !== undefined && ef.chance < 1 && sortear(b.rng) >= ef.chance) return;
  switch (ef.efeito) {
    case 'empurrar':
    case 'puxar': {
      const fator = temEstados(alvo) ? mods(b, c, alvo).empurrao : 1;
      if (fator === 0) return;
      const { ux, uy, d } = direcao(autor, alvo);
      const puxa = ef.efeito === 'puxar';
      const dist = puxa ? Math.min(ef.distancia * fator, Math.max(0, d - c.regras.distanciaMinima)) : ef.distancia * fator;
      const v = (dist / ef.duracao) * (puxa ? -1 : 1);
      interromper(c, alvo, ev);
      alvo.deslocamento = { vx: ux * v, vy: uy * v, restante: ef.duracao };
      ev.push({ tipo: 'deslocamento', lutador: alvo.uid, motivo: ef.efeito });
      return;
    }
    case 'atordoar':
      interromper(c, alvo, ev);
      return adicionarCondicao(alvo, { tipo: 'atordoado', restante: ef.duracao }, ev);
    case 'prender':
      return adicionarCondicao(alvo, { tipo: 'preso', restante: ef.duracao }, ev);
    case 'lentidao': {
      let fator = ef.fator;
      const antes = alvo.condicoes.find((cd) => cd.tipo === 'lentidao');
      if (ef.acumula && antes?.tipo === 'lentidao') fator = Math.max(ef.minimo ?? 0.1, antes.fator * ef.fator);
      return adicionarCondicao(alvo, { tipo: 'lentidao', fator, restante: ef.duracao }, ev);
    }
    case 'dano-continuo':
      if (ef.nome && temEstados(alvo) && mods(b, c, alvo).protege.includes(ef.nome)) return;
      return adicionarCondicao(
        alvo,
        { tipo: 'dano-continuo', porSegundo: ef.porSegundo, restante: ef.duracao, acumulado: 0, autor: autor.uid, golpe, ...(ef.nome ? { nome: ef.nome } : {}) },
        ev,
      );
    case 'debuff':
      return adicionarCondicao(alvo, { tipo: 'debuff', atributo: ef.atributo, valor: ef.valor, restante: ef.duracao }, ev);
    case 'estado':
      if (ef.em === 'si') return aplicarEstado(b, c, autor, autor, ef.estado, ef.duracao, alvo.uid, ev);
      return aplicarEstado(b, c, alvo, autor, ef.estado, ef.duracao, null, ev);
    case 'interromper':
      return interromper(c, alvo, ev);
    case 'acorrentar':
      return adicionarCondicao(alvo, { tipo: 'acorrentado', autor: autor.uid, distancia: ef.distancia, restante: ef.duracao }, ev);
    case 'atrair':
      return adicionarCondicao(
        alvo,
        { tipo: 'atraido', autor: autor.uid, velocidade: ef.velocidade, aoEncostar: ef.aoEncostar, golpe, restante: ef.duracao },
        ev,
      );
  }
}

/**
 * Dano pela fórmula, com os multiplicadores dos estados e dos campos (dano recebido, dano causado, alvo andando
 * ou parado), o `bonus` do golpe e o roubo de vida (`drena`).
 */
export function acertar(
  b: EstadoBatalha,
  c: Conteudo,
  alvo: Lutador,
  autor: Lutador,
  golpe: string,
  poder: number,
  origem: OrigemDano,
  ev: Evento[],
  extra: { bonus?: number; drena?: number } = {},
): void {
  const g = golpeDe(c, golpe);
  const de = combatente(c, autor);
  const para = combatente(c, alvo);
  let mult = extra.bonus ?? 1;
  if (temEstados(autor) || temEstados(alvo) || b.zonas.length) {
    const ma = mods(b, c, autor);
    const mt = mods(b, c, alvo);
    de.ataque *= ma.ataque;
    para.defesa *= mt.defesa;
    mult *= multiplicadorPorTipo(mt.danoRecebido, g.tipo) * multiplicadorPorTipo(ma.danoCausado, g.tipo);
    for (const d of ma.danoPorMovimento) if (d.tipo === g.tipo) mult *= Math.hypot(alvo.vx, alvo.vy) > 5 ? d.andando : d.parado;
  }
  const r = calcularDano(c, de, para, { tipo: g.tipo, poder }, sortear(b.rng));
  const valor = mult === 1 ? r.valor : Math.max(c.regras.dano.minimo, Math.round(r.valor * mult));
  aplicarDano(b, c, alvo, autor, golpe, valor, r.eficacia, origem, ev);
  if (extra.drena && valor > 0 && !autor.desmaiado) curar(b, c, autor, Math.round(valor * extra.drena), ev);
}

export function aplicarDano(
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

/** Recupera HP, a menos que algo impeça a cura (miasma). */
export function curar(b: EstadoBatalha, c: Conteudo, l: Lutador, valor: number, ev: Evento[]): void {
  if (b.zonas.length || temEstados(l)) {
    if (mods(b, c, l).impedeCura) return;
  }
  const v = Math.min(l.hpMax - l.hp, valor);
  if (v <= 0) return;
  l.hp += v;
  ev.push({ tipo: 'cura', lutador: l.uid, valor: v });
}

/**
 * Desconta o tempo das condições, aplica o dano contínuo (em pontos inteiros, sem sorteio), a cura por segundo
 * dos estados e campos, e tira os danos contínuos de que um estado protege.
 */
export function passarCondicoes(b: EstadoBatalha, c: Conteudo, l: Lutador, ev: Evento[]): void {
  if (b.zonas.length || temEstados(l)) {
    const m = mods(b, c, l);
    if (m.protege.length) l.condicoes = l.condicoes.filter((cd) => cd.tipo !== 'dano-continuo' || !cd.nome || !m.protege.includes(cd.nome));
    if (m.cura > 0 && !m.impedeCura) {
      l.curaAcumulada += m.cura * PASSO;
      const n = Math.floor(l.curaAcumulada);
      if (n >= 1) {
        l.curaAcumulada -= n;
        curar(b, c, l, n, ev);
      }
    }
  }
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

/** Tira de campo tudo o que era só desta passagem: buff, condições, movimento forçado e golpe em andamento. */
export function limparAoSair(c: Conteudo, l: Lutador): void {
  l.buff = null;
  l.condicoes = [];
  l.deslocamento = null;
  l.fatorEstados = 1;
  l.curaAcumulada = 0;
  encerrarAcao(c, l);
}

export function desmaiar(b: EstadoBatalha, c: Conteudo, l: Lutador, ev: Evento[]): void {
  l.desmaiado = true;
  limparAoSair(c, l);
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
