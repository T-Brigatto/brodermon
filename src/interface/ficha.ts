// Ficha de um golpe em português, lida do dicionário: os números do cabeçalho, uma linha por
// efeito e um glossário dos terrenos, névoas e estados que ele usa. Serve o catálogo de golpes
// (golpes.html); como tudo sai dos dados, mudar o JSON muda a ficha.

import type { Campo, Conteudo, Efeito, EfeitoForma, EfeitoNoAlvo, EfeitoPosicionado, EfeitoProjetil, Estado, Golpe } from '../conteudo/esquema';
import { perfilDoGolpe, recargaDe } from '../nucleo';

export interface Ficha {
  numeros: { rotulo: string; valor: string }[];
  efeitos: string[];
  glossario: { nome: string; texto: string }[];
}

const num = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const seg = (n: number) => `${num(n)} s`;
const pct = (n: number) => `${num(Math.round(n * 1000) / 10)}%`;
const juntar = (partes: (string | false | 0 | undefined | null)[], sep = ', ') => partes.filter(Boolean).join(sep);

const ATRIBUTO = { ataque: 'ataque', defesa: 'defesa', velocidade: 'velocidade' } as const;
const DURANTE = { parado: 'parado', lento: 'lento', livre: 'livre' } as const;
const TRAJETORIA = { guiado: 'guiado (sempre acerta)', reto: 'reto', persegue: 'que persegue', quica: 'que quica' } as const;
const DISPOSICAO = {
  'linha-ate-rival': () => 'em linha até o rival',
  'em-volta-do-rival': (d: number) => `em volta do rival (a ${num(d)})`,
  'sorteio-no-rival': (d: number) => `sorteadas a até ${num(d)} do rival`,
  entre: () => 'entre os dois',
  'em-volta-de-si': (d: number) => `em volta de si (a ${num(d)})`,
} as const;

/** Monta a ficha do golpe. */
export function fichaDoGolpe(g: Golpe, c: Conteudo): Ficha {
  const d = new Descritor(c);
  const p = perfilDoGolpe(g);
  const numeros: Ficha['numeros'] = [];
  const doCampo = poderDoCampo(g, c);
  numeros.push({ rotulo: 'Poder', valor: p.poder !== null ? num(p.poder) : doCampo ? `${num(doCampo)} (campo)` : '—' });
  const recarga = recargaDe(c, g);
  numeros.push({ rotulo: 'Recarga', valor: c.regras.recargaGolpes !== 1 ? `${seg(recarga)} (guia ${seg(g.recarga)})` : seg(recarga) });
  numeros.push({ rotulo: 'Alcance', valor: g.alcance !== undefined ? num(g.alcance) : 'em si' });
  numeros.push({ rotulo: 'Conjuração', valor: g.conjuracao > 0 ? seg(g.conjuracao) : 'na hora' });
  const velocidade = velocidadeDe(g, c);
  if (velocidade) numeros.push({ rotulo: 'Velocidade', valor: velocidade });
  const duracao = duracaoDe(g);
  if (duracao) numeros.push({ rotulo: 'Duração', valor: seg(duracao) });
  if (g.conjuracao > 0 || g.efeitos.some((e) => ('duracao' in e && e.efeito !== 'estado' && 'pulso' in e) || e.efeito === 'esperar')) {
    numeros.push({ rotulo: 'Quem usa', valor: DURANTE[g.durante] });
  }
  const efeitos = g.efeitos.map((e) => d.efeito(e));
  return { numeros, efeitos, glossario: d.glossario() };
}

/** A velocidade que mais importa: do projétil, da forma que anda ou do avanço. */
function velocidadeDe(g: Golpe, c: Conteudo): string | null {
  for (const e of g.efeitos) {
    const proj = e.efeito === 'projetil' ? e : e.efeito === 'varias' && e.faz.efeito === 'projetil' ? e.faz : null;
    if (proj) return `${num(proj.velocidade ?? c.regras.projetil.velocidade)}/s`;
    if ((e.efeito === 'area' || e.efeito === 'cone' || e.efeito === 'linha' || e.efeito === 'parede') && e.move) return `${num(e.move.velocidade)}/s`;
    if (e.efeito === 'avancar' || e.efeito === 'recuar') return `${num(Math.round(e.distancia / e.duracao))}/s`;
  }
  return null;
}

/** Poder por pulso do primeiro campo que o golpe deixa (para os golpes que só ferem pelo campo). */
function poderDoCampo(g: Golpe, c: Conteudo): number | null {
  for (const e of g.efeitos) {
    const formas = e.efeito === 'varias' ? [e.faz] : e.efeito === 'projetil' ? e.estouro : [e];
    for (const f of formas) {
      const deixa = 'deixa' in f ? f.deixa : undefined;
      if (!deixa) continue;
      const poder = deixa.poder ?? c.campos[deixa.campo]?.poder ?? 0;
      if (poder > 0) return poder;
    }
  }
  return null;
}

/** O maior tempo que alguma coisa do golpe fica valendo (forma, campo, estado, espera). */
export function duracaoDe(g: Golpe): number {
  let d = 0;
  const forma = (f: EfeitoForma | EfeitoProjetil) => {
    if (f.efeito === 'projetil') return;
    d = Math.max(d, f.duracao ?? 0, f.atraso ?? 0, f.deixa?.duracao ?? 0);
  };
  for (const e of g.efeitos) {
    if (e.efeito === 'area' || e.efeito === 'cone' || e.efeito === 'linha' || e.efeito === 'parede') forma(e);
    if (e.efeito === 'estado' || e.efeito === 'esperar' || e.efeito === 'buff') d = Math.max(d, e.duracao);
    if (e.efeito === 'objeto') d = Math.max(d, e.duracao);
    if (e.efeito === 'varias') forma(e.faz);
    if (e.efeito === 'projetil') for (const f of e.estouro) forma(f);
  }
  return d;
}

class Descritor {
  private readonly campos = new Set<string>();
  private readonly estados = new Set<string>();

  constructor(private readonly c: Conteudo) {}

  private nomeCampo(id: string): string {
    this.campos.add(id);
    return this.c.campos[id]?.nome ?? id;
  }

  private nomeEstado(id: string): string {
    this.estados.add(id);
    return this.c.estados[id]?.nome ?? id;
  }

  private nomeTipo(id: string): string {
    return this.c.tipos[id]?.nome ?? id;
  }

  private tipos(ids: string[]): string {
    return ids.map((t) => this.nomeTipo(t)).join(', ');
  }

  efeito(e: Efeito): string {
    switch (e.efeito) {
      case 'dano':
        return juntar([
          `Corpo a corpo: poder ${num(e.poder)}`,
          e.escalaHp && `até ${num(e.escalaHp.ate)} quanto menos HP quem usa tem (o máximo com 10%)`,
          e.seEstado && `${num(e.seEstado.poder)} se o alvo estiver ${this.nomeEstado(e.seEstado.estado)}${e.seEstado.remove ? ', e quebra o estado' : ''}`,
          e.drena && `devolve ${pct(e.drena)} do dano como cura`,
        ]);
      case 'projetil':
        return this.projetil(e);
      case 'area':
      case 'cone':
      case 'linha':
      case 'parede':
        return this.forma(e, true);
      case 'buff':
        return `Em si: ${ATRIBUTO[e.atributo]} +${num(e.valor)} por ${seg(e.duracao)}`;
      case 'curar':
        return `Em si: cura ${num(e.porcento)}% do HP`;
      case 'avancar':
        return juntar([
          `Avança ${num(e.distancia)} em ${seg(e.duracao)}${e.atravessa ? ', atravessando o rival' : ' até perto do rival'}`,
          (e.poder > 0 || e.efeitos.length > 0) && `acerta ao passar: ${this.carga(e.poder, e.efeitos)}`,
          e.rastro && `deixa ${this.nomeCampo(e.rastro.campo)} no caminho por ${seg(e.rastro.duracao)}`,
          e.estado && `fica ${this.nomeEstado(e.estado)} durante o avanço`,
        ]);
      case 'recuar':
        return `Salta ${num(e.distancia)} para longe do rival em ${seg(e.duracao)}`;
      case 'teleporte':
        return juntar([
          e.para === 'no-rival' ? 'Some e reaparece em cima do rival' : `Some e reaparece atrás do rival, a ${num(e.distancia)} dele`,
          e.rastro && `deixa ${this.nomeCampo(e.rastro.campo)} no caminho por ${seg(e.rastro.duracao)}`,
        ]);
      case 'esperar':
        return `Continua no golpe por ${seg(e.duracao)}`;
      case 'varias':
        return `${e.quantidade}× ${DISPOSICAO[e.disposicao](e.distancia)}${e.intervalo > 0 ? `, uma a cada ${seg(e.intervalo)}` : ''}: ${this.posicionado(e.faz)}`;
      case 'cada-campo':
        return juntar(
          [
            `Para cada ${this.nomeCampo(e.campo)} de quem usa: ${e.faz.map((f) => this.posicionado(f)).join(' + ')}${e.apaga ? ' (e o campo some)' : ''}`,
            e.senao.length > 0 && `sem nenhum: ${e.senao.map((f) => this.posicionado(f)).join(' + ')} em volta de si`,
          ],
          '; ',
        );
      case 'objeto':
        return this.objeto(e);
      case 'copiar':
        return 'Usa o último golpe que o rival usou';
      default:
        return e.efeito === 'estado' && e.em === 'si' ? `Em si: ${this.nomeEstado(e.estado)} por ${seg(e.duracao)}` : `No rival: ${this.noAlvo(e)}`;
    }
  }

  private objeto(e: Extract<Efeito, { efeito: 'objeto' }>): string {
    const onde = e.centro === 'si' ? 'em quem usa' : e.centro === 'rival' ? `a ${num(e.distancia)} do rival` : 'entre os dois';
    switch (e.objeto) {
      case 'pilar':
        return juntar([`Pilar de raio ${num(e.raio)} ${onde} por ${seg(e.duracao)}: bloqueia a passagem e os projéteis`, e.destruidoPor.length > 0 && `${this.tipos(e.destruidoPor)} destrói`]);
      case 'portais':
        return `Dois portais (raio ${num(e.raio)}), um em quem usa e outro a ${num(e.distancia)} do rival, por ${seg(e.duracao)}: quem entra num sai no outro`;
      case 'copia':
        return `Cópia falsa a ${num(e.distancia)} de lado por ${seg(e.duracao)}: cada golpe do rival tem ${pct(e.chance ?? 1)} de chance de mirar nela`;
      case 'pino':
        return `Pino ${onde} por ${seg(e.duracao)}: os golpes deste tipo também saltam para quem estiver a até ${num(e.raio)} dele`;
    }
  }

  private projetil(e: EfeitoProjetil, solto = false): string {
    const R = this.c.regras.projetil;
    return juntar([
      `${solto ? 'projétil' : 'Projétil'} ${TRAJETORIA[e.trajetoria]} a ${num(e.velocidade ?? R.velocidade)}/s`,
      e.quantidade > 1 && `${e.quantidade} de uma vez, em leque de ${num(e.abertura)}°`,
      e.raio !== undefined && `raio ${num(e.raio)}`,
      e.trajetoria !== 'guiado' && `vive ${seg(e.vida ?? R.vida)}`,
      e.trajetoria === 'persegue' && `curva de até ${num(e.curva ?? R.curva)}°/s`,
      e.acertos === 0 ? 'não acerta encostando' : e.acertos > 1 && `até ${e.acertos} acertos`,
      e.atravessa && 'atravessa o alvo',
      e.quicas !== undefined && `quica ${e.quicas}× e estoura na borda seguinte`,
      e.gruda !== undefined && `gruda em quem acerta e estoura ${seg(e.gruda)} depois`,
      e.volta !== undefined && `vai até ${num(e.volta)} e volta`,
      (e.poder > 0 || e.efeitos.length > 0) && this.carga(e.poder, e.efeitos, e.drena),
      e.aura && `aura de raio ${num(e.aura.raio)}: ${this.carga(e.aura.poder, e.aura.efeitos)} a cada ${seg(e.aura.pulso)}`,
      e.consome &&
        `come ${e.consome.campos.map((x) => this.nomeCampo(x)).join(', ')} no caminho: +${num(e.consome.poder)} de poder cada${e.consome.maximo ? ` (até ${num(e.consome.maximo)})` : ''}, cresce ×${num(e.consome.crescimento)}`,
      e.herdaCampo && 'leva o efeito do terreno de onde sai',
      e.estouro.length > 0 && `estoura: ${e.estouro.map((f) => this.forma(f, false)).join(' + ')}`,
    ]);
  }

  private posicionado(f: EfeitoPosicionado): string {
    return f.efeito === 'projetil' ? this.projetil(f, true) : this.forma(f, false);
  }

  /** Forma com tamanho, onde cai, comportamento e o que faz. `comCentro` = solta no golpe (o centro conta). */
  private forma(e: EfeitoForma, comCentro: boolean): string {
    let base: string;
    switch (e.efeito) {
      case 'area':
        base = `Área de raio ${num(e.raio)}${comCentro ? (e.centro === 'rival' ? ' no rival (marca onde ele estava)' : e.centro === 'si' ? ' em volta de si' : ' entre os dois') : ''}`;
        break;
      case 'cone':
        base = `Cone de ${num(e.alcance)} e ${num(e.angulo)}°${e.origem === 'ponta' ? ', da ponta da forma anterior' : ''}${e.inverte ? ', voltando' : ''}`;
        break;
      case 'linha':
        base = `Linha de ${num(e.alcance)} × ${num(e.largura)}${e.ateRival ? ' até o rival' : ''}${e.reflete > 0 ? `, reflete ${e.reflete}× na borda` : ''}`;
        break;
      case 'parede':
        base = `Parede de ${num(e.largura)} × ${num(e.espessura)}${comCentro ? (e.centro === 'topo' ? ' que nasce na borda de cima' : e.centro === 'si' ? ' em quem usa' : e.centro === 'rival' ? ' no rival' : ' entre os dois') : ''}`;
        break;
    }
    const canal = (e.efeito === 'cone' || e.efeito === 'linha') && e.duracao !== undefined && !e.atraso && !e.move;
    return juntar([
      base,
      e.atraso !== undefined && `acerta ${seg(e.atraso)} depois`,
      e.duracao !== undefined && `${canal ? 'canaliza' : 'dura'} ${seg(e.duracao)}${e.pulso !== undefined ? `, pulso de ${seg(e.pulso)}` : ''}`,
      e.move && `anda a ${num(e.move.velocidade)}/s${e.move.ate !== undefined ? ` até ${num(e.move.ate)}` : ''}${e.move.persegue ? ', indo atrás do rival' : ''}`,
      e.efeito === 'area' && e.raioFinal !== undefined && `cresce até raio ${num(e.raioFinal)}`,
      e.umaVez && 'uma vez por alvo',
      e.arrasta && 'arrasta quem pega',
      e.puxa !== undefined && `puxa para o centro a ${num(e.puxa)}/s`,
      (e.poder > 0 || e.efeitos.length > 0) && this.carga(e.poder, e.efeitos, e.drena),
      e.alterna && `alterna a cada pulso: ${e.alterna.map((l) => l.map((x) => this.noAlvo(x)).join(' e ')).join(' / ')}`,
      e.deixa && this.deixa(e.deixa),
      e.rastro && `deixa ${this.nomeCampo(e.rastro.campo)} no caminho por ${seg(e.rastro.duracao)}`,
      e.apaga && this.apaga(e.apaga),
    ]);
  }

  /** Campo deixado, com os números próprios do golpe (quando ele troca os do campo). */
  private deixa(d: NonNullable<EfeitoForma['deixa']>): string {
    const proprio = juntar(
      [
        d.pulso !== undefined && `${this.carga(d.poder ?? 0, d.efeitos ?? []) || 'nada'} a cada ${seg(d.pulso)}`,
        d.aoEntrar && `ao entrar: ${this.carga(d.aoEntrar.poder, d.aoEntrar.efeitos)}`,
      ],
      '; ',
    );
    return `deixa ${this.nomeCampo(d.campo)} por ${seg(d.duracao)}${proprio ? ` (${proprio})` : ''}`;
  }

  private apaga(a: NonNullable<EfeitoForma['apaga']>): string {
    const o = juntar([a.camadas?.map((x) => (x === 'terreno' ? 'terrenos' : 'névoas')).join(' e '), a.tipos && `campos de ${this.tipos(a.tipos)}`], ' e ') || 'campos';
    return juntar([a.converteEm ? `troca ${o} por ${this.nomeCampo(a.converteEm)}` : `apaga ${o}`, a.objetos && 'derruba estruturas']);
  }

  /** Dano e efeitos de quem é atingido. */
  carga(poder: number, efeitos: EfeitoNoAlvo[], drena?: number): string {
    return juntar([poder > 0 && `poder ${num(poder)}`, ...efeitos.map((x) => this.noAlvo(x)), drena && `devolve ${pct(drena)} do dano como cura`]);
  }

  noAlvo(e: EfeitoNoAlvo): string {
    const chance = e.chance !== undefined && e.chance < 1 ? ` (${pct(e.chance)})` : '';
    switch (e.efeito) {
      case 'empurrar':
        return `empurra ${num(e.distancia)}${chance}`;
      case 'puxar':
        return `puxa ${num(e.distancia)}${chance}`;
      case 'lentidao':
        return `lentidão de ${pct(1 - e.fator)} por ${seg(e.duracao)}${e.acumula ? `, acumula (até ${pct(1 - (e.minimo ?? 0.1))})` : ''}${chance}`;
      case 'prender':
        return `prende ${seg(e.duracao)}${chance}`;
      case 'atordoar':
        return `atordoa ${seg(e.duracao)}${chance}`;
      case 'dano-continuo':
        return `${e.nome ? e.nome[0]!.toUpperCase() + e.nome.slice(1) : 'dano contínuo'}: ${num(e.porSegundo)}/s por ${seg(e.duracao)}${chance}`;
      case 'debuff':
        return `${ATRIBUTO[e.atributo]} −${num(e.valor)} por ${seg(e.duracao)}${chance}`;
      case 'estado':
        return `${e.em === 'si' ? 'em quem usa: ' : ''}${this.nomeEstado(e.estado)} por ${seg(e.duracao)}${chance}`;
      case 'interromper':
        return `interrompe a conjuração${chance}`;
      case 'acorrentar':
        return `acorrenta a ${num(e.distancia)} por ${seg(e.duracao)}${chance}`;
      case 'atrair':
        return `atrai os dois a ${num(e.velocidade)}/s por ${seg(e.duracao)}${e.aoEncostar > 0 ? `; ao encostarem, poder ${num(e.aoEncostar)}` : ''}${chance}`;
    }
  }

  /** Os campos e estados citados, cada um com o que faz (os de dentro dos campos entram também). */
  glossario(): Ficha['glossario'] {
    const itens: Ficha['glossario'] = [];
    const vistos = new Set<string>();
    // Descrever um campo pode citar estados novos: repete até não aparecer mais nada.
    for (let mudou = true; mudou; ) {
      mudou = false;
      for (const id of [...this.campos]) {
        if (vistos.has(`c:${id}`)) continue;
        vistos.add(`c:${id}`);
        const campo = this.c.campos[id];
        if (campo) itens.push({ nome: campo.nome, texto: this.campo(campo) });
        mudou = true;
      }
      for (const id of [...this.estados]) {
        if (vistos.has(`e:${id}`)) continue;
        vistos.add(`e:${id}`);
        const estado = this.c.estados[id];
        if (estado) itens.push({ nome: estado.nome, texto: this.estado(estado) });
        mudou = true;
      }
    }
    return itens;
  }

  private campo(f: Campo): string {
    const pr = f.projeteis;
    return juntar(
      [
        `${f.camada === 'terreno' ? 'Terreno' : 'Névoa'} de ${this.nomeTipo(f.tipo)}`,
        f.pulso !== undefined && (f.poder > 0 || f.efeitos.length > 0) && `a cada ${seg(f.pulso)}: ${this.carga(f.poder, f.efeitos)}`,
        f.aoEntrar && `ao entrar: ${this.carga(f.aoEntrar.poder, f.aoEntrar.efeitos)}`,
        f.consome && 'some no primeiro que entra',
        f.estado && `quem está dentro: ${this.nomeEstado(f.estado)}`,
        f.dono && `quem criou, dentro: ${this.nomeEstado(f.dono)}`,
        f.estadoImunes && `os imunes, dentro: ${this.nomeEstado(f.estadoImunes)}`,
        f.permanencia && `${seg(f.permanencia.segundos)} seguidos dentro: ${f.permanencia.efeitos.map((x) => this.noAlvo(x)).join(', ')}`,
        pr?.dano !== undefined && `projéteis que passam causam ×${num(pr.dano)} de dano`,
        pr?.desvio !== undefined && `projéteis que passam desviam até ${num(pr.desvio)}°`,
        pr?.atrai !== undefined && `projéteis que passam curvam para o centro`,
        pr?.tempo !== undefined && `projéteis andam a ${pct(pr.tempo)}`,
        f.empuxo?.lado !== undefined && `empurra de lado a ${num(Math.abs(f.empuxo.lado))}/s`,
        f.empuxo?.frente !== undefined && `empurra para a frente a ${num(f.empuxo.frente)}/s`,
        f.rampa !== undefined && `no sentido da rampa, ${num(f.rampa)}× mais rápido; contra, escorrega de volta`,
        f.tempo !== undefined && `o tempo dos outros campos dentro dele corre a ${pct(f.tempo)}`,
        f.apaga && this.apaga(f.apaga),
        f.dispara && `dispara no rival a cada ${seg(f.dispara.intervalo)}: ${this.projetil(f.dispara.projetil, true)}`,
        f.detona && `um golpe de ${this.nomeTipo(f.detona.tipo)} o detona: ${this.carga(f.detona.poder, f.detona.efeitos)} em quem está dentro`,
        f.imunes.length > 0 && `${this.tipos(f.imunes)} ${f.imunes.length > 1 ? 'são imunes' : 'é imune'}`,
        f.afeta === 'rival' && 'só afeta o rival de quem criou',
      ],
      '; ',
    );
  }

  private estado(e: Estado): string {
    const porTipo = (r: Record<string, number>) =>
      Object.entries(r)
        .map(([t, f]) => `${t === '*' ? 'todos' : this.nomeTipo(t)} ×${num(f)}`)
        .join(', ');
    const trava = { movimento: 'não anda', acao: 'não usa golpes', tudo: 'não anda nem age' } as const;
    return (
      juntar(
        [
          e.trava && trava[e.trava],
          e.velocidade !== undefined && `velocidade ×${num(e.velocidade)}`,
          e.atributos?.ataque && `ataque ×${num(e.atributos.ataque)}`,
          e.atributos?.defesa && `defesa ×${num(e.atributos.defesa)}`,
          e.danoRecebido && `dano recebido: ${porTipo(e.danoRecebido)}`,
          e.danoCausado && `dano causado: ${porTipo(e.danoCausado)}`,
          e.danoPorMovimento && `golpes de ${this.nomeTipo(e.danoPorMovimento.tipo)}: ×${num(e.danoPorMovimento.andando)} em alvo andando, ×${num(e.danoPorMovimento.parado)} em parado`,
          e.recarga !== undefined && `recargas correm a ${pct(e.recarga)}`,
          e.conjuracao !== undefined && `conjura a ${pct(e.conjuracao)}`,
          e.desvio && `projéteis saem com desvio de até ${num(e.desvio)}°`,
          e.empurrao !== undefined && (e.empurrao === 0 ? 'imune a empurrão' : `empurrões ×${num(e.empurrao)}`),
          e.inquieto && 'não consegue ficar parado',
          e.intangivel && (e.atingivelPor?.length ? `só anéis de ${this.tipos(e.atingivelPor)} o atingem` : 'não pode ser atingido'),
          e.tamanho !== undefined && `tamanho ×${num(e.tamanho)}`,
          e.areaPerto !== undefined && `anéis e corpo a corpo ×${num(e.areaPerto)}`,
          e.curaPorSegundo && `cura ${num(e.curaPorSegundo)} HP/s${e.soEmCampo ? ` em cima de ${this.nomeCampo(e.soEmCampo)}` : ''}${e.soTipos ? ` (só ${this.tipos(e.soTipos)})` : ''}`,
          e.impedeCura && 'não pode se curar',
          e.protege && `protege de ${e.protege.join(', ')}`,
          e.desviaProjeteis && `desvia ${num(e.desviaProjeteis.graus)}° os projéteis que chegam perto`,
          e.refleteProjeteis && 'devolve os projéteis para quem atirou',
          e.aderencia !== undefined && 'escorrega (a velocidade muda devagar)',
          e.cargas && `cada ${num(e.cargas.distancia)} andados vira uma carga (até ${e.cargas.maximo}); o próximo golpe de ${this.nomeTipo(e.cargas.tipo)} ganha ${pct(e.cargas.bonus)} por carga`,
          e.cacada && `${num(e.cacada.velocidade)}× mais rápido indo até a presa e +${num(e.cacada.alcance)} de alcance contra ela`,
        ],
        '; ',
      ) || 'só uma marca'
    );
  }
}
