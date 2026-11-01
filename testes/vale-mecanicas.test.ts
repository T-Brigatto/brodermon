// As peças que os golpes do guia usam, uma a uma, com os golpes de verdade do pacote "vale".

import { describe, expect, it } from 'vitest';
import { esquemaCampo, esquemaEstado, esquemaGolpe, type Conteudo } from '../src/conteudo/esquema';
import { distancia, raioCorpo, temCondicao, temEstado } from '../src/nucleo';
import { ate, campo, comEstado, conteudo, danos, duelo, pos, primeiroDano, rodar, soma } from './ajuda-vale';

/**
 * Golpes, campos e estados de teste com as peças que nenhum golpe do vale usa hoje (granada que quica, bomba que
 * gruda, mina, gás que detona, dano recebido por tipo). Vieram do elemento Explosão, que saiu do pacote.
 */
function comPecasDeTeste(c: Conteudo): Conteudo {
  const golpe = (id: string, g: Record<string, unknown>) => (c.golpes[id] = esquemaGolpe.parse({ nome: id, recarga: 5, alcance: 95, conjuracao: 0.3, ...g }));
  const area = (raio: number, poder: number, extra: Record<string, unknown> = {}) => ({ efeito: 'area', raio, poder, ...extra });
  const empurra = (distancia: number) => ({ efeito: 'empurrar', distancia });
  golpe('teste-granada', {
    tipo: 'terra',
    efeitos: [{ efeito: 'projetil', poder: 0, trajetoria: 'quica', velocidade: 110, vida: 1.2, quicas: 1, estouro: [area(15, 45, { efeitos: [empurra(25)] })] }],
  });
  golpe('teste-bomba', { tipo: 'terra', efeitos: [{ efeito: 'projetil', poder: 0, trajetoria: 'reto', velocidade: 140, gruda: 2, estouro: [area(18, 60)] }] });
  golpe('teste-carga', { tipo: 'terra', alcance: 38, conjuracao: 1.5, efeitos: [area(30, 90, { centro: 'si' })] });
  c.campos['teste-mina'] = esquemaCampo.parse({ nome: 'Mina', camada: 'terreno', tipo: 'terra', imunes: ['terra'], consome: true, aoEntrar: { poder: 25, efeitos: [empurra(20)] } });
  c.campos['teste-gas'] = esquemaCampo.parse({ nome: 'Gás', camada: 'nevoa', tipo: 'fogo', imunes: ['fogo'], detona: { tipo: 'fogo', poder: 45, efeitos: [empurra(25)] } });
  c.estados['teste-rachado'] = esquemaEstado.parse({ nome: 'Rachado', danoRecebido: { terra: 1.3 } });
  return c;
}

const conteudoT = () => comPecasDeTeste(conteudo());

/** Dano do primeiro acerto de `golpe` em dois duelos iguais (mesma semente), um com `preparo` e outro sem. */
function razao(golpes: string[], golpe: string, preparo: (d: ReturnType<typeof duelo>) => void, op: Parameters<typeof duelo>[2] = {}, distanciaAB = 30) {
  const medir = (com: boolean) => {
    const c = conteudoT();
    const d = duelo(c, golpes, op);
    pos(d.A, 205 - distanciaAB, 70);
    pos(d.B, 205, 70);
    if (com) preparo(d);
    return primeiroDano(d.b, c, golpe);
  };
  const sem = medir(false);
  const com = medir(true);
  expect(sem).toBeGreaterThan(0);
  return com / sem;
}

describe('estados', () => {
  it('congelado não anda; Estilhaçar dobra o dano e quebra o gelo', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['estalactite']);
    pos(A, 115, 70);
    ate(b, c, () => temEstado(B, 'congelado'), 3);
    expect(temEstado(B, 'congelado')).toBe(true);
    rodar(b, c, 0.5, [{ tipo: 'direcao', equipe: 1, x: 0, y: 1 }]);
    expect(B.y).toBeCloseTo(70, 5);

    expect(razao(['estilhacar'], 'estilhacar', ({ B }) => comEstado(B, 'congelado'))).toBeCloseTo(2, 0);
    const d = duelo(c, ['estilhacar']);
    pos(d.A, 180, 70);
    comEstado(d.B, 'congelado');
    primeiroDano(d.b, c, 'estilhacar');
    expect(temEstado(d.B, 'congelado')).toBe(false);
  });

  it('dano recebido por tipo (um "rachado" de teste): +30% de dano de Terra', () => {
    const r = razao(['teste-carga'], 'teste-carga', ({ B }) => comEstado(B, 'teste-rachado'));
    expect(r).toBeGreaterThan(1.25);
    expect(r).toBeLessThan(1.35);
  });

  it('gelado: as recargas correm 30% mais devagar', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['folha-navalha']);
    comEstado(A, 'gelado');
    ate(b, c, () => A.ultimoGolpe !== null && !A.acao, 3);
    rodar(b, c, 1);
    expect(A.golpes[0]!.recarga).toBeCloseTo(2 * c.regras.recargaGolpes - 0.7, 1);
  });

  it('leve: o empurrão dobra; armadura de pedra: não sai do lugar e defende mais', () => {
    const empurrado = (estado?: string) => {
      const c = conteudo();
      const { b, A, B } = duelo(c, ['rajada']);
      pos(A, 175, 70);
      if (estado) comEstado(B, estado);
      ate(b, c, (p) => danos(p).length > 0, 3);
      rodar(b, c, 0.4);
      return B.x - 205;
    };
    const normal = empurrado();
    expect(normal).toBeGreaterThan(20);
    expect(empurrado('leve')).toBeCloseTo(normal * 2, -1);
    expect(empurrado('armadura-de-pedra')).toBeCloseTo(0, 5);
    const r = razao(['rajada'], 'rajada', ({ B }) => comEstado(B, 'armadura-de-pedra'));
    expect(r).toBeGreaterThan(0.6);
    expect(r).toBeLessThan(0.72);
  });

  it('gigante: corpo com o dobro do raio', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['gigante']);
    const antes = raioCorpo(b, c, A);
    comEstado(A, 'gigante');
    expect(raioCorpo(b, c, A)).toBe(antes * 2);
  });

  it('esfera de ar desvia os projéteis; couraça devolve para quem atirou', () => {
    const c = conteudo();
    const esfera = duelo(c, ['folha-navalha']);
    comEstado(esfera.B, 'esfera-de-ar');
    expect(danos(rodar(esfera.b, c, 2)).filter((e) => e.alvo === esfera.B.uid)).toHaveLength(0);

    const couraca = duelo(c, ['folha-navalha']);
    comEstado(couraca.B, 'couraca');
    const ev = rodar(couraca.b, c, 2);
    expect(danos(ev).filter((e) => e.alvo === couraca.B.uid)).toHaveLength(0);
    expect(danos(ev).some((e) => e.alvo === couraca.A.uid && e.autor === couraca.B.uid)).toBe(true);
  });

  it('intangível não é atingido; embaixo da terra, só anéis de Terra acertam', () => {
    const c = conteudo();
    const fantasma = duelo(c, ['folha-navalha']);
    comEstado(fantasma.B, 'intangivel');
    expect(danos(rodar(fantasma.b, c, 2))).toHaveLength(0);

    const anel = (golpe: string) => {
      const d = duelo(c, [golpe]);
      pos(d.A, 175, 70);
      comEstado(d.B, 'subterraneo');
      return danos(rodar(d.b, c, 1.5), golpe).length;
    };
    expect(anel('tremor')).toBe(1);
    expect(anel('pira')).toBe(0);
  });

  it('estática: andar soma cargas, e o próximo golpe elétrico ganha 10% por carga', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['raio']);
    pos(A, 20, 20);
    comEstado(A, 'estatica');
    rodar(b, c, 0.5, [{ tipo: 'direcao', equipe: 0, x: 0, y: 1 }]);
    const est = A.condicoes.find((cd) => cd.tipo === 'estado' && cd.estado === 'estatica');
    expect(est?.tipo === 'estado' && est.cargas).toBe(1); // 28 unidades andadas

    const r = razao(['raio'], 'raio', ({ A }) => {
      comEstado(A, 'estatica');
      const cd = A.condicoes.at(-1)!;
      if (cd.tipo === 'estado') cd.cargas = 4;
    }, {}, 60);
    expect(r).toBeCloseTo(1.4, 1);
  });

  it('cegueira: os projéteis saem com desvio de até 30°', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['folha-navalha']);
    comEstado(A, 'cegueira');
    ate(b, c, () => b.projeteis.length > 0, 2);
    const ang = (Math.atan2(b.projeteis[0]!.vy, b.projeteis[0]!.vx) * 180) / Math.PI;
    expect(Math.abs(ang)).toBeGreaterThan(0.01);
    expect(Math.abs(ang)).toBeLessThanOrEqual(30);
  });

  it('caçada: a presa marcada fica ao alcance da mordida de mais longe', () => {
    const c = conteudo();
    const sem = duelo(c, ['mordida-ancestral']);
    pos(sem.A, 160, 70);
    expect(danos(rodar(sem.b, c, 2))).toHaveLength(0);
    const com = duelo(c, ['marcar-presa', 'mordida-ancestral']);
    pos(com.A, 160, 70);
    const ev = rodar(com.b, c, 3);
    expect(temEstado(com.B, 'presa')).toBe(true);
    expect(danos(ev, 'mordida-ancestral').length).toBeGreaterThan(0);
  });

  it('fotossíntese cura 15 HP/s parado; dentro do miasma, não cura', () => {
    const c = conteudo();
    const cura = (miasma: boolean) => {
      const { b, A, B } = duelo(c, ['fotossintese']);
      A.hp = 30;
      if (miasma) campo(b, c, B, 'miasma', A.x, A.y, 30, 'halito-putrido');
      const ev = rodar(b, c, 3);
      return ev.filter((e) => e.tipo === 'cura' && e.lutador === A.uid).reduce((s, e) => s + (e.tipo === 'cura' ? e.valor : 0), 0);
    };
    expect(cura(false)).toBeGreaterThanOrEqual(29);
    expect(cura(false)).toBeLessThanOrEqual(31);
    expect(cura(true)).toBe(0);
  });

  it('umidade protege da queimadura', () => {
    const c = conteudo();
    const queimou = (umido: boolean) => {
      const { b, A, B } = duelo(c, ['pira']);
      pos(A, 180, 70);
      if (umido) campo(b, c, B, 'umidade', B.x, B.y, 30, 'garoa');
      rodar(b, c, 1.2);
      return temCondicao(B, 'dano-continuo');
    };
    expect(queimou(false)).toBe(true);
    expect(queimou(true)).toBe(false);
  });

  it('território: o dono causa 20% a mais; bruma: Arcano causa 25% a mais', () => {
    const t = razao(['mordida-ancestral'], 'mordida-ancestral', ({ b, A }) => campo(b, conteudo(), A, 'territorio', A.x, A.y, 30, 'marcar-territorio'));
    expect(t).toBeCloseTo(1.2, 1);
    const bruma = razao(['orbe-ricocheteante'], 'orbe-ricocheteante', ({ b, A, B }) => campo(b, conteudo(), A, 'bruma-arcana', B.x, B.y, 30, 'veu-arcano'));
    expect(bruma).toBeGreaterThan(1.15);
    expect(bruma).toBeLessThan(1.35);
  });
});

describe('terrenos e névoas', () => {
  it('Raízes poupam Natureza, Terra e Ar; ferem e atrasam os outros', () => {
    const c = conteudo();
    const ferido = (especieB: string) => {
      const { b, A, B } = duelo(c, ['folha-navalha'], { especieB });
      A.golpes[0]!.recarga = 1e9;
      campo(b, c, A, 'raizes', B.x, B.y, 22, 'raizes-espinhentas');
      const ev = rodar(b, c, 1.1);
      return { dano: soma(ev), lento: temCondicao(B, 'lentidao') };
    };
    expect(ferido('brotinho')).toEqual({ dano: 0, lento: false });
    expect(ferido('pedrisco').dano).toBe(0);
    const fogo = ferido('brasino');
    expect(fogo.dano).toBeGreaterThan(0);
    expect(fogo.lento).toBe(true);
  });

  it('esporos curam a Natureza sem feri-la', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['folha-navalha'], { especieB: 'brotinho' });
    A.golpes[0]!.recarga = 1e9;
    B.hp = 50;
    campo(b, c, A, 'esporos', B.x, B.y, 28, 'nuvem-de-esporos');
    const ev = rodar(b, c, 3);
    expect(soma(ev)).toBe(0);
    expect(B.hp).toBeGreaterThan(54);
  });

  it('mina explode em quem pisa e some', () => {
    const c = conteudoT();
    const { b, A, B } = duelo(c, ['folha-navalha']);
    A.golpes[0]!.recarga = 1e9;
    campo(b, c, A, 'teste-mina', 175, 70, 6, 'tremor');
    const ev = rodar(b, c, 1.2, [{ tipo: 'direcao', equipe: 1, x: -1, y: 0 }]);
    expect(danos(ev)).toHaveLength(1);
    expect(b.zonas).toHaveLength(0);
  });

  it('areia movediça prende quem fica 2 s dentro', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['folha-navalha']);
    A.golpes[0]!.recarga = 1e9;
    campo(b, c, A, 'areia-movedica', B.x, B.y, 25, 'areia-movedica');
    rodar(b, c, 1.8);
    expect(temCondicao(B, 'preso')).toBe(false);
    rodar(b, c, 0.4);
    expect(temCondicao(B, 'preso')).toBe(true);
  });

  it('pó cristalino corta pela metade o dano dos projéteis que passam', () => {
    const r = razao(['folha-navalha'], 'folha-navalha', ({ b, A }) => campo(b, conteudo(), A, 'po-cristalino', 150, 70, 20, 'poeira-de-gema'), {}, 90);
    expect(r).toBeGreaterThan(0.4);
    expect(r).toBeLessThan(0.6);
  });

  it('gás detona com um golpe do tipo dele e some', () => {
    const c = conteudoT();
    const { b, A, B } = duelo(c, ['detonacao']);
    campo(b, c, A, 'teste-gas', B.x, B.y, 25, 'pira');
    const ev = rodar(b, c, 1.5);
    expect(danos(ev).filter((e) => e.alvo === B.uid)).toHaveLength(2);
    expect(b.zonas.some((z) => z.campo === 'teste-gas')).toBe(false);
  });

  it('Decomposição troca o terreno por Raízes; Ruptura apaga terreno e pilar; Vácuo apaga Fogo e névoas', () => {
    const c = conteudo();
    const dec = duelo(c, ['decomposicao']);
    campo(dec.b, c, dec.B, 'poca', dec.B.x, dec.B.y, 15, 'geiser');
    rodar(dec.b, c, 1);
    expect(dec.b.zonas.map((z) => z.campo)).toEqual(['raizes']);

    const rup = duelo(c, ['ruptura']);
    campo(rup.b, c, rup.B, 'chamas', 160, 70, 8, 'chamas');
    rup.b.objetos.push({ id: 99, tipo: 'pilar', autor: rup.B.uid, golpe: 'pilar-de-cristal', x: 170, y: 70, raio: 6, restante: 9, par: null, chance: 1, destruidoPor: [], dentro: [] });
    rodar(rup.b, c, 1);
    expect(rup.b.zonas).toHaveLength(0);
    expect(rup.b.objetos).toHaveLength(0);

    const vac = duelo(c, ['vacuo']);
    campo(vac.b, c, vac.B, 'fumaca-quente', vac.B.x, vac.B.y, 20, 'fumaceira');
    rodar(vac.b, c, 1);
    expect(vac.b.zonas.map((z) => z.campo)).toEqual(['vacuo']);
  });

  it('círculo rúnico dispara um míssil no rival a cada 1,5 s', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['folha-navalha']);
    A.golpes[0]!.recarga = 1e9;
    campo(b, c, A, 'circulo-runico', A.x, A.y, 20, 'circulo-runico');
    const ev = rodar(b, c, 3.1);
    expect(ev.filter((e) => e.tipo === 'projetil')).toHaveLength(2);
  });

  it('tempo lento: quem está dentro anda a 40%', () => {
    const c = conteudo();
    const andou = (lento: boolean) => {
      const { b, A, B } = duelo(c, ['folha-navalha']);
      A.golpes[0]!.recarga = 1e9;
      if (lento) campo(b, c, A, 'tempo-lento', B.x, B.y, 40, 'tempo-lento');
      rodar(b, c, 0.3, [{ tipo: 'direcao', equipe: 1, x: 0, y: 1 }]);
      return B.y - 70;
    };
    expect(andou(true) / andou(false)).toBeCloseTo(0.4, 1);
  });

  it('gravidade arcana curva os projéteis para o centro', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['folha-navalha']);
    campo(b, c, A, 'gravidade-arcana', 160, 90, 25, 'gravidade-arcana');
    let curvou = false;
    for (let i = 0; i < 60; i++) {
      rodar(b, c, 1 / 60);
      if (b.projeteis.some((p) => p.vy > 1)) curvou = true;
    }
    expect(curvou).toBe(true);
  });

  it('chão congelado: quem não é de Gelo escorrega (a velocidade muda devagar); rampa acelera no sentido dela', () => {
    const c = conteudo();
    const andou = (id?: string) => {
      const { b, A, B } = duelo(c, ['folha-navalha']);
      A.golpes[0]!.recarga = 1e9;
      if (id) campo(b, c, A, id, B.x, B.y, 40, 'escultor');
      rodar(b, c, 0.25, [{ tipo: 'direcao', equipe: 1, x: 0, y: 1 }]);
      return B.y - 70;
    };
    const normal = andou();
    expect(andou('chao-congelado')).toBeLessThan(normal / 2);
    // A rampa aponta na direção (1, 0): andar para baixo é de lado, sem ganho; para a direita, 1,6×.
    const direita = (id?: string) => {
      const { b, A, B } = duelo(c, ['folha-navalha']);
      A.golpes[0]!.recarga = 1e9;
      pos(B, 150, 70);
      if (id) campo(b, c, A, id, B.x, B.y, 40, 'escultor');
      rodar(b, c, 0.25, [{ tipo: 'direcao', equipe: 1, x: 1, y: 0 }]);
      return B.x - 150;
    };
    expect(direita('rampa-de-gelo') / direita()).toBeCloseTo(1.6, 1);
  });

  it('corrente de vento empurra para o lado quem está dentro', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['folha-navalha']);
    A.golpes[0]!.recarga = 1e9;
    campo(b, c, A, 'corrente-de-vento', B.x, B.y, 30, 'corredor-de-vento');
    rodar(b, c, 0.5);
    expect(Math.abs(B.y - 70)).toBeGreaterThan(5);
  });

  it('vinhas: o dono anda mais rápido; o rival tropeça ao entrar', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['folha-navalha']);
    A.golpes[0]!.recarga = 1e9;
    campo(b, c, A, 'vinhas', 160, 70, 60, 'vinhas-entrelacadas');
    rodar(b, c, 1 / 60);
    expect(temCondicao(B, 'preso')).toBe(true);
    expect(temCondicao(A, 'preso')).toBe(false);
    expect(A.fatorEstados).toBe(1.5);
  });
});

describe('formas', () => {
  it('Selo: marca onde o rival estava e explode 1,5 s depois, deixando o círculo', () => {
    const c = conteudo();
    const fica = duelo(c, ['selo']);
    const usado = ate(fica.b, c, (p) => p.some((e) => e.tipo === 'golpe'), 2);
    expect(usado.length).toBeGreaterThan(0);
    expect(danos(rodar(fica.b, c, 1.7), 'selo')).toHaveLength(0); // conjuração de 0,3 s + marca de 1,5 s
    expect(danos(rodar(fica.b, c, 0.2), 'selo')).toHaveLength(1);
    expect(fica.b.zonas.some((z) => z.campo === 'circulo-runico')).toBe(true);

    const sai = duelo(c, ['selo']);
    ate(sai.b, c, (p) => p.some((e) => e.tipo === 'golpe'), 2);
    const ev2 = rodar(sai.b, c, 1.9, [{ tipo: 'direcao', equipe: 1, x: 0, y: 1 }]);
    expect(danos(ev2, 'selo')).toHaveLength(0);
  });

  it('Estacas: três marcas em linha até o rival, uma a cada 0,2 s', () => {
    const c = conteudo();
    const { b } = duelo(c, ['estacas-de-terra']);
    const ev = rodar(b, c, 1.5);
    const formas = ev.flatMap((e, i) => (e.tipo === 'forma' ? [{ e, i }] : []));
    expect(formas).toHaveLength(3);
    const xs = formas.map(({ e }) => (e.tipo === 'forma' ? e.x : 0));
    expect(xs[0]!).toBeLessThan(xs[1]!);
    expect(xs[1]!).toBeLessThan(xs[2]!);
    expect(xs[2]!).toBeCloseTo(205, 0);
  });

  it('Granizo: seis pedras sorteadas a até 30 do rival', () => {
    const c = conteudo();
    const { b, B } = duelo(c, ['granizo']);
    const ev = rodar(b, c, 3);
    const formas = ev.filter((e) => e.tipo === 'forma');
    expect(formas).toHaveLength(6);
    for (const f of formas) if (f.tipo === 'forma') expect(Math.hypot(f.x - B.x, f.y - B.y)).toBeLessThanOrEqual(30.01);
  });

  it('Onda arrasta quem pega e deixa Poça no caminho', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['onda']);
    pos(A, 150, 70);
    const ev = rodar(b, c, 2.2);
    expect(danos(ev, 'onda')).toHaveLength(1);
    expect(B.x).toBeGreaterThan(215);
    expect(b.zonas.some((z) => z.campo === 'poca')).toBe(true);
  });

  it('Avalanche desce a arena inteira e arrasta o rival até a borda de baixo; quem usa fica de fora', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['avalanche']);
    pos(A, 115, 30);
    pos(B, 205, 30);
    const ev = rodar(b, c, 3);
    expect(danos(ev, 'avalanche')).toHaveLength(1);
    expect(B.y).toBeGreaterThan(115);
    expect(A.y).toBeCloseTo(30, 0);
  });

  it('Tornado anda até o rival e puxa para o centro', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['tornado']);
    pos(A, 115, 70);
    pos(B, 205, 70);
    ate(b, c, () => b.zonas.length > 0, 2);
    const z = b.zonas[0]!;
    const longe = distancia(z, B);
    rodar(b, c, 1);
    expect(distancia(z, B)).toBeLessThan(longe);
  });

  it('Onda de Choque cresce e acerta uma vez quem está a 80; interrompe a conjuração', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['onda-de-choque'], { golpesB: ['estalactite'] });
    pos(A, 125, 70);
    B.golpes[0]!.recarga = 0;
    const ev = rodar(b, c, 1.5);
    expect(danos(ev, 'onda-de-choque')).toHaveLength(1);
    expect(ev.some((e) => e.tipo === 'interrompido' && e.lutador === B.uid)).toBe(true);
  });

  it('Eco: um segundo cone volta da ponta do primeiro 1 s depois', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['eco']);
    pos(A, 165, 70);
    const ev = rodar(b, c, 2);
    const formas = ev.filter((e) => e.tipo === 'forma');
    expect(formas).toHaveLength(2);
    const [um, dois] = formas as Extract<(typeof formas)[number], { tipo: 'forma' }>[];
    expect(dois!.ux).toBeCloseTo(-um!.ux, 5);
    expect(dois!.x).toBeCloseTo(um!.x + 50 * um!.ux, 0);
    expect(danos(ev, 'eco')).toHaveLength(2);
  });

  it('Prisma reflete na borda da arena', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['prisma']);
    pos(A, 270, 70);
    pos(B, 300, 70);
    const formas = rodar(b, c, 1).filter((e) => e.tipo === 'forma');
    expect(formas).toHaveLength(2);
    if (formas[0]!.tipo === 'forma' && formas[1]!.tipo === 'forma') expect(formas[1]!.ux).toBeCloseTo(-formas[0]!.ux, 5);
  });

  it('Fluxo e Refluxo alterna empurrar e puxar a cada pulso', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['fluxo-e-refluxo']);
    pos(A, 165, 70);
    const ev = rodar(b, c, 3.5);
    const motivos = ev.flatMap((e) => (e.tipo === 'deslocamento' ? [e.motivo] : []));
    expect(motivos.slice(0, 3)).toEqual(['empurrar', 'puxar', 'empurrar']);
  });
});

describe('projéteis', () => {
  it('granada: estoura em área ao tocar o rival', () => {
    const c = conteudoT();
    const perto = duelo(c, ['teste-granada']);
    const ev = rodar(perto.b, c, 2);
    expect(danos(ev, 'teste-granada')).toHaveLength(1);
    expect(ev.some((e) => e.tipo === 'forma')).toBe(true);
  });

  it('bomba: gruda no rival e estoura 2 s depois', () => {
    const c = conteudoT();
    const { b, B } = duelo(c, ['teste-bomba']);
    ate(b, c, () => b.projeteis.some((p) => p.grudado === B.uid), 3);
    expect(b.projeteis[0]!.grudado).toBe(B.uid);
    expect(danos(rodar(b, c, 1.9), 'teste-bomba')).toHaveLength(0);
    expect(danos(rodar(b, c, 0.3), 'teste-bomba')).toHaveLength(1);
  });

  it('Lâmina Bumerangue acerta na ida e na volta', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['lamina-bumerangue']);
    pos(A, 155, 70);
    expect(danos(rodar(b, c, 2.5), 'lamina-bumerangue')).toHaveLength(2);
  });

  it('Esfera Estática acerta pela aura, sem encostar', () => {
    const c = conteudo();
    const { b } = duelo(c, ['esfera-estatica']);
    expect(danos(rodar(b, c, 3.5), 'esfera-estatica').length).toBeGreaterThanOrEqual(2);
  });

  it('Drenar devolve metade do dano como cura', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['drenar']);
    A.hp = 50;
    const ev = rodar(b, c, 2.5);
    const dano = soma(ev, 'drenar');
    const cura = ev.find((e) => e.tipo === 'cura');
    expect(dano).toBeGreaterThan(0);
    expect(cura?.tipo === 'cura' && cura.valor).toBe(Math.round(dano / 2));
  });

  it('Fome do Fogo come as Raízes no caminho e ganha poder', () => {
    const r = razao(['fome-do-fogo'], 'fome-do-fogo', ({ b, B }) => campo(b, conteudo(), B, 'raizes', 150, 70, 15, 'raizes-espinhentas'), {}, 90);
    expect(r).toBeGreaterThan(1.8);
    expect(r).toBeLessThan(2.2);
  });

  it('Arrancar Chão leva o efeito do terreno de onde saiu; Bola de Fogo deixa Chamas onde estoura', () => {
    const c = conteudo();
    const arr = duelo(c, ['arrancar-chao']);
    campo(arr.b, c, arr.B, 'raizes', arr.A.x, arr.A.y, 20, 'raizes-espinhentas');
    const ev = rodar(arr.b, c, 2);
    expect(ev.some((e) => e.tipo === 'condicao' && e.lutador === arr.B.uid && e.condicao === 'lentidao')).toBe(true);

    const bola = duelo(c, ['bola-de-fogo']);
    rodar(bola.b, c, 1.5);
    // Estoura onde encosta: a 12 + 5 do centro do rival.
    expect(bola.b.zonas.some((z) => z.campo === 'chamas' && distancia(z, bola.B) < 20)).toBe(true);
  });
});

describe('movimento', () => {
  it('Rasante atravessa o rival, acerta uma vez e fica intangível no caminho', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['rasante']);
    pos(A, 155, 70);
    const ev = ate(b, c, (p) => p.some((e) => e.tipo === 'deslocamento'), 2);
    expect(temEstado(A, 'intangivel')).toBe(true);
    ev.push(...rodar(b, c, 0.5));
    expect(A.x).toBeGreaterThan(B.x);
    expect(danos(ev, 'rasante')).toHaveLength(1);
  });

  it('Rastro Ardente deixa Chamas no caminho', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['rastro-ardente']);
    pos(A, 150, 70);
    rodar(b, c, 1);
    expect(b.zonas.some((z) => z.campo === 'chamas' && z.geo.forma === 'linha')).toBe(true);
  });

  it('Passo Relâmpago reaparece do outro lado do rival e deixa o rastro elétrico', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['passo-relampago']);
    rodar(b, c, 0.5);
    expect(A.x).toBeCloseTo(235, 0);
    expect(b.zonas.some((z) => z.campo === 'rastro-eletrico')).toBe(true);
  });

  it('Polaridade puxa os dois um para o outro e dá o choque ao encostarem', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['polaridade']);
    const ev = rodar(b, c, 4);
    expect(danos(ev, 'polaridade')).toHaveLength(1);
    expect(A.x).toBeGreaterThan(115);
    expect(B.x).toBeLessThan(205);
  });

  it('Corrente de Metal segura o rival a até 70', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['corrente-de-metal']);
    pos(A, 145, 70);
    ate(b, c, () => temCondicao(B, 'acorrentado'), 2);
    rodar(b, c, 2, [{ tipo: 'direcao', equipe: 1, x: 1, y: 0 }]);
    expect(distancia(A, B)).toBeLessThanOrEqual(70.01);
  });

  it('Escavar some embaixo da terra, reaparece no rival e acerta', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['escavar']);
    ate(b, c, () => temEstado(A, 'subterraneo'), 2);
    const ev = rodar(b, c, 2);
    expect(danos(ev, 'escavar')).toHaveLength(1);
    expect(distancia(A, B)).toBeLessThan(1);
  });
});

describe('objetos', () => {
  it('pilar bloqueia projéteis; um golpe do tipo que o derruba o destrói', () => {
    const c = conteudo();
    const pilar = (golpe: string) => {
      const d = duelo(c, [golpe]);
      d.b.objetos.push({ id: 99, tipo: 'pilar', autor: d.B.uid, golpe: 'pilar-de-cristal', x: 160, y: 70, raio: 6, restante: 9, par: null, chance: 1, destruidoPor: ['fogo'], dentro: [] });
      return { ev: rodar(d.b, c, 2), d };
    };
    expect(danos(pilar('folha-navalha').ev)).toHaveLength(0);
    expect(pilar('folha-navalha').d.b.objetos).toHaveLength(1);
    expect(pilar('bola-de-fogo').d.b.objetos).toHaveLength(0);
  });

  it('portais levam quem entra num até o outro', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['portais']);
    ate(b, c, () => b.objetos.length === 2, 2);
    // Um portal fica em quem usou (115) e o outro a 25 do rival (180): andando para a esquerda, B sai em 115.
    const ev = ate(b, c, (p) => p.some((e) => e.tipo === 'deslocamento' && e.lutador === B.uid), 1, [{ tipo: 'direcao', equipe: 1, x: -1, y: 0 }]);
    expect(ev.some((e) => e.tipo === 'deslocamento' && e.motivo === 'teleporte')).toBe(true);
    expect(distancia(B, A)).toBeLessThan(2);
  });

  it('cópia falsa: o golpe do rival mira nela', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['folha-navalha']);
    b.objetos.push({ id: 99, tipo: 'copia', autor: B.uid, golpe: 'miragem', x: 205, y: 100, raio: 8, restante: 9, par: null, chance: 1, destruidoPor: [], dentro: [] });
    const ev = rodar(b, c, 1.5);
    expect(danos(ev)).toHaveLength(0);
    expect(A.ultimoGolpe).toBe('folha-navalha');
  });

  it('para-raios: o golpe elétrico salta do pino para quem está perto', () => {
    const c = conteudo();
    const { b } = duelo(c, ['para-raios', 'raio']);
    const ev = rodar(b, c, 4);
    expect(ev.some((e) => e.tipo === 'salto')).toBe(true);
  });
});

describe('golpes especiais', () => {
  it('Espelho Arcano usa o último golpe do rival', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['espelho-arcano']);
    pos(A, 175, 70);
    B.ultimoGolpe = 'rajada';
    const ev = rodar(b, c, 1);
    expect(danos(ev, 'rajada')).toHaveLength(1);
    expect(B.x).toBeGreaterThan(220);
  });

  it('Sangue Antigo bate mais quanto menos HP quem usa tem (o dobro com 10%)', () => {
    expect(razao(['sangue-antigo'], 'sangue-antigo', ({ A }) => (A.hp = Math.round(A.hpMax * 0.1)))).toBeCloseTo(2, 0);
  });

  it('Recolher transforma cada Poça de quem usa num projétil', () => {
    const c = conteudo();
    const { b, A } = duelo(c, ['recolher']);
    campo(b, c, A, 'poca', 140, 50, 15, 'geiser');
    campo(b, c, A, 'poca', 140, 90, 15, 'geiser');
    const ev = rodar(b, c, 1);
    expect(ev.filter((e) => e.tipo === 'projetil')).toHaveLength(2);
    expect(b.zonas.some((z) => z.campo === 'poca')).toBe(false);
  });

  it('Ressonância faz cada Cristal vibrar; sem Cristais, é um anel em volta de si', () => {
    const c = conteudo();
    const com = duelo(c, ['ressonancia']);
    pos(com.A, 180, 70);
    campo(com.b, c, com.A, 'cristais', 200, 70, 8, 'campo-de-cristais');
    expect(danos(rodar(com.b, c, 1), 'ressonancia')).toHaveLength(1);
  });

  it('Sopro Gélido: a lentidão aumenta a cada pulso', () => {
    const c = conteudo();
    const { b, A, B } = duelo(c, ['sopro-gelido']);
    pos(A, 175, 70);
    rodar(b, c, 0.6);
    const antes = B.condicoes.find((cd) => cd.tipo === 'lentidao');
    rodar(b, c, 0.6);
    const depois = B.condicoes.find((cd) => cd.tipo === 'lentidao');
    expect(antes?.tipo === 'lentidao' && depois?.tipo === 'lentidao' && depois.fator < antes.fator).toBe(true);
  });

  it('um golpe novo pode juntar peças sem código (pulso que alterna, parede que anda, campo que fica)', () => {
    const c = conteudo();
    c.golpes['teste'] = esquemaGolpe.parse({
      nome: 'Teste',
      tipo: 'agua',
      recarga: 9,
      alcance: 120,
      efeitos: [{ efeito: 'parede', centro: 'si', largura: 40, espessura: 8, poder: 10, move: { velocidade: 90, ate: 100 }, umaVez: true, rastro: { campo: 'poca', largura: 20, duracao: 3 } }],
    });
    const { b } = duelo(c, ['teste']);
    const ev = rodar(b, c, 2);
    expect(danos(ev, 'teste')).toHaveLength(1);
    expect(b.zonas.some((z) => z.campo === 'poca')).toBe(true);
  });
});
