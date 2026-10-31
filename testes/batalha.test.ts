import { describe, expect, it } from 'vitest';
import { prototipo as c } from '../src/conteudo/pacotes';
import { ativo, avancar, configDaBatalha, criarBatalha, escolherGolpe, type Evento } from '../src/nucleo';
import { batalhaTreino, conteudo, iaContraIa, rodar, rodarAte } from './ajuda';

const golpesDa = (ev: Evento[], uid: number) =>
  ev.flatMap((e) => (e.tipo === 'golpe' && e.autor === uid ? [e] : []));

describe('determinismo', () => {
  it('a mesma semente dá exatamente a mesma batalha', () => {
    const a = iaContraIa(7);
    const b = iaContraIa(7);
    const ea = rodar(a, 60);
    const eb = rodar(b, 60);
    expect(eb).toEqual(ea);
    expect(b).toEqual(a);
  });

  it('outra semente muda o resultado', () => {
    const a = iaContraIa(7);
    const b = iaContraIa(8);
    rodar(a, 60);
    rodar(b, 60);
    expect(b).not.toEqual(a);
  });

  it('o estado sobrevive a um clone e continua igual', () => {
    const a = iaContraIa(3);
    rodar(a, 10);
    const b = structuredClone(a);
    expect(rodar(b, 20)).toEqual(rodar(a, 20));
  });
});

describe('batalha completa', () => {
  it('IA contra IA termina com um vencedor (sem esquiva)', () => {
    // Com a esquiva ligada, as duas IAs fogem para cantos opostos quando estão com pouco HP
    // e a luta não acaba. Ver "Problemas conhecidos" em docs/arquitetura.md.
    const semEsquiva = conteudo();
    semEsquiva.regras.ia.hpEsquiva = 0;
    const b = iaContraIa(11, semEsquiva);
    const ev = rodarAte(b, (e) => e.some((x) => x.tipo === 'fim'), 600, semEsquiva);
    expect(b.vencedor).not.toBeNull();
    expect(ev.filter((e) => e.tipo === 'fim')).toHaveLength(1);
    const perdedora = b.equipes[b.vencedor === 0 ? 1 : 0];
    expect(perdedora.lutadores.every((l) => l.desmaiado)).toBe(true);
  });

  it('a dificuldade muda só a equipe da IA', () => {
    const b = criarBatalha(c, configDaBatalha(c, 'treino', 1, 'dificil'));
    expect(ativo(b, 0).ataque).toBe(14);
    expect(ativo(b, 1).ataque).toBe(Math.round(16 * 1.2));
    expect(ativo(b, 1).hpMax).toBe(Math.round(95 * 1.1));
  });
});

describe('fila de golpes', () => {
  it('o golpe da fila sai primeiro', () => {
    const b = batalhaTreino();
    const ev = rodar(b, 2, [{ tipo: 'proximoGolpe', equipe: 0, indice: 1 }]);
    const [primeiro] = golpesDa(ev, ativo(b, 0).uid);
    expect(primeiro?.golpe).toBe('bolha');
    expect(b.equipes[0].proximoGolpe).toBe(-1);
  });

  it('tocar de novo no mesmo golpe cancela', () => {
    const b = batalhaTreino();
    avancar(b, c, [
      { tipo: 'proximoGolpe', equipe: 0, indice: 2 },
      { tipo: 'proximoGolpe', equipe: 0, indice: 2 },
    ]);
    expect(b.equipes[0].proximoGolpe).toBe(-1);
  });

  it('golpe de contato na fila faz a criatura andar até o alvo', () => {
    const b = batalhaTreino();
    const ev = rodar(b, 6, [
      { tipo: 'tatica', equipe: 0, tatica: 'parado' },
      { tipo: 'proximoGolpe', equipe: 0, indice: 2 },
    ]);
    expect(golpesDa(ev, ativo(b, 0).uid).map((g) => g.golpe)).toContain('investida');
  });
});

describe('movimento', () => {
  it('o destino leva a criatura até o ponto e depois é liberado', () => {
    const b = batalhaTreino();
    rodar(b, 3, [
      { tipo: 'tatica', equipe: 0, tatica: 'parado' }, // senão a tática volta a mover depois que chega
      { tipo: 'destino', equipe: 0, ponto: { x: 40, y: 20 } },
    ]);
    expect(ativo(b, 0).x).toBeCloseTo(40, -1);
    expect(ativo(b, 0).y).toBeCloseTo(20, -1);
    expect(b.equipes[0].destino).toBeNull();
  });

  it('o destino fixo (dedo na tela) não é liberado ao chegar', () => {
    const b = batalhaTreino();
    rodar(b, 3, [{ tipo: 'destino', equipe: 0, ponto: { x: 40, y: 20 }, fixo: true }]);
    expect(b.equipes[0].destino).not.toBeNull();
  });

  it('a direção move na velocidade da espécie e respeita a borda da arena', () => {
    const b = batalhaTreino();
    rodar(b, 0.5); // fim da entrada
    const x0 = ativo(b, 0).x;
    rodar(b, 1, [{ tipo: 'direcao', equipe: 0, x: -1, y: 0 }]);
    expect(x0 - ativo(b, 0).x).toBeCloseTo(59, -1); // Briserecs: velocidade 59
    rodar(b, 5);
    expect(ativo(b, 0).x).toBe(c.regras.arena.xMin);
  });
});

describe('troca', () => {
  it('leva 0,3 s e entra no lugar da antiga', () => {
    const b = batalhaTreino();
    rodar(b, 1);
    const { x, y } = ativo(b, 0);
    const ev = rodar(b, 0.2, [{ tipo: 'trocar', equipe: 0, indice: 1 }]);
    expect(ev.some((e) => e.tipo === 'trocaIniciada')).toBe(true);
    expect(b.equipes[0].ativo).toBe(0);
    rodar(b, 0.15);
    expect(b.equipes[0].ativo).toBe(1);
    expect(ativo(b, 0).x).toBeCloseTo(x, 0);
    expect(ativo(b, 0).y).toBeCloseTo(y, 0);
  });

  it('espera 3 s depois que a troca termina', () => {
    const b = batalhaTreino();
    rodar(b, 0.5, [{ tipo: 'trocar', equipe: 0, indice: 1 }]); // termina em 0,3 s
    const cedo = rodar(b, 2.7, [{ tipo: 'trocar', equipe: 0, indice: 2 }]); // tenta em 0,5 s; vai até 3,2 s
    expect(cedo).toContainEqual(expect.objectContaining({ tipo: 'comandoRecusado', motivo: 'a troca está recarregando' }));
    expect(b.equipes[0].esperaTroca).toBeGreaterThan(0);
    rodar(b, 0.2);
    const depois = rodar(b, 0.1, [{ tipo: 'trocar', equipe: 0, indice: 2 }]);
    expect(depois.some((e) => e.tipo === 'trocaIniciada')).toBe(true);
  });

  it('recusa trocar pela criatura que já está em campo', () => {
    const b = batalhaTreino();
    const ev = avancar(b, c, [{ tipo: 'trocar', equipe: 0, indice: 0 }]);
    expect(ev).toContainEqual(expect.objectContaining({ motivo: 'essa criatura já está em campo' }));
  });

  it('a criatura que sai perde o buff', () => {
    const b = batalhaTreino();
    ativo(b, 0).buff = { atributo: 'defesa', valor: 6, restante: 3 };
    const velha = ativo(b, 0);
    rodar(b, 0.5, [{ tipo: 'trocar', equipe: 0, indice: 1 }]);
    expect(velha.buff).toBeNull();
  });
});

describe('desmaio', () => {
  it('a IA manda a próxima criatura sozinha', () => {
    const b = batalhaTreino();
    ativo(b, 1).hp = 1;
    rodarAte(b, (e) => e.some((x) => x.tipo === 'desmaio'));
    const ev = rodarAte(b, (e) => e.some((x) => x.tipo === 'entrou'), 3);
    expect(ev).toContainEqual(expect.objectContaining({ tipo: 'entrou', equipe: 1, motivo: 'substituicao' }));
    expect(b.equipes[1].ativo).toBe(1);
  });

  it('o jogador escolhe a próxima, e a batalha espera', () => {
    const b = batalhaTreino();
    ativo(b, 0).hp = 1;
    rodarAte(b, (e) => e.some((x) => x.tipo === 'aguardandoEscolha'));
    expect(b.aguardandoEscolha).toBe(0);
    const tick = b.tick;
    rodar(b, 1);
    expect(b.tick).toBe(tick);
    avancar(b, c, [{ tipo: 'trocar', equipe: 0, indice: 3 }]);
    expect(b.aguardandoEscolha).toBeNull();
    expect(b.equipes[0].ativo).toBe(3);
    expect(b.tick).toBe(tick + 1);
  });

  it('com uma criatura só, ela entra sem perguntar', () => {
    const b = batalhaTreino();
    const eq = b.equipes[0];
    eq.lutadores.forEach((l, i) => {
      if (i > 0 && i !== 4) l.desmaiado = true;
    });
    ativo(b, 0).hp = 1;
    rodarAte(b, (e) => e.some((x) => x.tipo === 'entrou' && x.equipe === 0));
    expect(b.aguardandoEscolha).toBeNull();
    expect(eq.ativo).toBe(4);
  });

  it('a última criatura derrubada encerra a batalha', () => {
    const b = batalhaTreino();
    b.equipes[1].lutadores.forEach((l, i) => {
      if (i > 0) l.desmaiado = true;
    });
    ativo(b, 1).hp = 1;
    rodarAte(b, (e) => e.some((x) => x.tipo === 'fim'));
    expect(b.vencedor).toBe(0);
    const depois = rodar(b, 3);
    expect(depois.some((e) => e.tipo === 'golpe')).toBe(false);
  });
});

describe('IA', () => {
  it('não usa golpe sem efeito', () => {
    const b = criarBatalha(c, {
      semente: 1,
      equipes: [
        { piloto: 'ia', time: ['faisca'] },
        { piloto: 'ia', time: ['pedrisco'] },
      ],
    });
    const faisca = ativo(b, 0);
    const pedrisco = ativo(b, 1);
    faisca.hp = faisca.hpMax * 0.4; // sem buff
    pedrisco.x = faisca.x + 10;
    expect(faisca.golpes[escolherGolpe(c, faisca, pedrisco)]?.id).toBe('investida');
  });

  it('esquiva com pouco HP', () => {
    const b = iaContraIa();
    ativo(b, 1).hp = Math.floor(ativo(b, 1).hpMax * 0.2);
    rodar(b, 0.1);
    expect(b.equipes[1].tatica).toBe('evasivo');
  });
});
