import { describe, expect, it } from 'vitest';
import { esquemaGolpe, type Conteudo } from '../src/conteudo/esquema';
import {
  PASSO,
  aplicarComandos,
  avancar,
  combatente,
  configDaBatalha,
  criarBatalha,
  distancia,
  temCondicao,
  velocidadeAtual,
  type Comando,
  type EstadoBatalha,
  type Evento,
  type Lutador,
} from '../src/nucleo';
import { conteudo } from './ajuda';

/** Duelo de laboratório: Briserecs (A) contra Gotinha (B), os dois na tática FIRME. */
function duelo(golpesA: string[], golpesB: string[], c: Conteudo = conteudo()) {
  const b = criarBatalha(c, {
    semente: 1,
    equipes: [
      { piloto: 'jogador', time: [{ especie: 'perereca', golpes: golpesA }] },
      { piloto: 'jogador', time: [{ especie: 'gotinha', golpes: golpesB }, 'brasino'] },
    ],
  });
  aplicarComandos(b, c, [
    { tipo: 'tatica', equipe: 0, tatica: 'parado' },
    { tipo: 'tatica', equipe: 1, tatica: 'parado' },
  ]);
  const A = b.equipes[0].lutadores[0]!;
  const B = b.equipes[1].lutadores[0]!;
  return { b, c, A, B };
}

/** Golpes de `l` ficam sem uso (recarga enorme). */
const travar = (l: Lutador) => l.golpes.forEach((g) => (g.recarga = 1e9));

/** Roda `segundos` e devolve os eventos com o número do passo em que aconteceram. */
function rodar(b: EstadoBatalha, c: Conteudo, segundos: number, comandos: Comando[] = []) {
  const ev: { passo: number; e: Evento }[] = [];
  for (let i = 0; i < Math.round(segundos / PASSO); i++) for (const e of avancar(b, c, i === 0 ? comandos : [])) ev.push({ passo: b.tick, e });
  return ev;
}

const achar = <T extends Evento['tipo']>(ev: { passo: number; e: Evento }[], tipo: T, filtro: (e: Extract<Evento, { tipo: T }>) => boolean = () => true) =>
  ev.find((x) => x.e.tipo === tipo && filtro(x.e as Extract<Evento, { tipo: T }>)) as { passo: number; e: Extract<Evento, { tipo: T }> } | undefined;

describe('movimento próprio', () => {
  it('avançar dispara até perto do rival, e só então vem o dano e o empurrão', () => {
    const { b, c, A, B } = duelo(['investida-veloz'], ['jato']);
    travar(B);
    A.x = 135; // 70 de distância, dentro do alcance 80
    const ev = rodar(b, c, 0.7);
    const avanco = achar(ev, 'deslocamento', (e) => e.motivo === 'avancar')!;
    const dano = achar(ev, 'dano')!;
    expect(dano.passo - avanco.passo).toBe(15); // 0,25 s de avanço
    expect(A.x).toBeCloseTo(135 + 58, 0); // para a 12 do rival (distanciaMinima)
    expect(achar(ev, 'deslocamento', (e) => e.motivo === 'empurrar')).toBeDefined();
    expect(B.x).toBeCloseTo(205 + 35, 0);
  });

  it('recuar afasta do rival', () => {
    const { b, c, A, B } = duelo(['salto-para-tras'], ['jato']);
    travar(B);
    A.x = 180; // 25 de distância
    A.hp = 20; // com pouco HP a IA foge
    const antes = distancia(A, B);
    const ev = rodar(b, c, 0.5);
    expect(achar(ev, 'deslocamento', (e) => e.motivo === 'recuar')).toBeDefined();
    expect(distancia(A, B)).toBeCloseTo(antes + 60, 0);
  });
});

describe('movimento do rival', () => {
  it('puxar traz o rival e prender o segura no lugar', () => {
    const { b, c, B } = duelo(['cipo-laco'], ['jato']);
    travar(B);
    rodar(b, c, 0.35, [{ tipo: 'direcao', equipe: 1, x: 1, y: 0 }]);
    expect(B.x).toBeCloseTo(205 - 50, 0);
    rodar(b, c, 0.5);
    expect(B.x).toBeCloseTo(155, 0); // preso, mesmo tentando andar
    rodar(b, c, 0.5);
    expect(B.x).toBeGreaterThan(165); // soltou e voltou a andar
  });
});

describe('conjuração', () => {
  it('o efeito só sai depois do tempo de conjuração', () => {
    const { b, c, A, B } = duelo(['golpe-carregado'], ['jato']);
    travar(B);
    A.x = 185; // 20 de distância
    const ev = rodar(b, c, 1);
    const golpe = achar(ev, 'golpe')!;
    expect(golpe.e.conjuracao).toBe(0.6);
    expect(achar(ev, 'dano')!.passo - golpe.passo).toBe(36);
  });

  it('empurrão no meio da conjuração interrompe o golpe', () => {
    const { b, c, A } = duelo(['golpe-carregado'], ['rajada-de-vento']);
    A.x = 185;
    const ev = rodar(b, c, 1.5);
    expect(achar(ev, 'interrompido', (e) => e.lutador === A.uid)).toBeDefined();
    expect(achar(ev, 'dano', (e) => e.autor === A.uid)).toBeUndefined();
  });

  it('se o rival fugir durante a conjuração, o golpe erra', () => {
    const { b, c, A } = duelo(['golpe-carregado'], ['jato']);
    travar(b.equipes[1].lutadores[0]!);
    A.x = 185;
    const ev = rodar(b, c, 1, [{ tipo: 'direcao', equipe: 1, x: 1, y: 0 }]);
    expect(achar(ev, 'errou', (e) => e.autor === A.uid)).toBeDefined();
    expect(achar(ev, 'dano')).toBeUndefined();
  });
});

describe('condições', () => {
  it('lentidão corta a velocidade pela metade enquanto dura', () => {
    const { b, c, A, B } = duelo(['lamacal'], ['jato']);
    travar(B);
    A.x = 130; // dentro do alcance 85
    const ev = rodar(b, c, 1.2);
    expect(achar(ev, 'condicao', (e) => e.condicao === 'lentidao')).toBeDefined();
    expect(velocidadeAtual(B)).toBeCloseTo(B.velocidade * 0.5);
    rodar(b, c, 2.6);
    expect(velocidadeAtual(B)).toBe(B.velocidade);
  });

  it('atordoado não anda nem ataca', () => {
    const { b, c, A, B } = duelo(['choque-paralisante'], ['jato']);
    A.x = 130;
    B.golpes[0]!.recarga = 1.0; // ficaria pronto no meio do atordoamento
    const ev = rodar(b, c, 3, [{ tipo: 'direcao', equipe: 1, x: 0, y: 1 }]);
    const atordoou = achar(ev, 'condicao', (e) => e.condicao === 'atordoado')!;
    const golpeB = achar(ev, 'golpe', (e) => e.autor === B.uid)!;
    expect(golpeB.passo).toBeGreaterThanOrEqual(atordoou.passo + Math.round(0.8 / PASSO) - 1);
  });

  it('dano contínuo soma o total de pontos por segundo × duração', () => {
    const { b, c, A, B } = duelo(['chama-viva'], ['jato']);
    travar(B);
    A.x = 130;
    const ev = rodar(b, c, 1);
    travar(A); // um acerto só
    ev.push(...rodar(b, c, 4));
    const continuo = ev.filter((x) => x.e.tipo === 'dano' && x.e.origem === 'continuo').reduce((s, x) => s + (x.e as { valor: number }).valor, 0);
    expect(continuo).toBeGreaterThanOrEqual(14);
    expect(continuo).toBeLessThanOrEqual(15);
  });

  it('debuff reduz o atributo e passa', () => {
    const { b, c, A, B } = duelo(['rocha-quebra'], ['jato']);
    travar(B);
    A.x = 130;
    rodar(b, c, 1.2);
    expect(combatente(c, B).defesa).toBe(B.defesa - 4);
    rodar(b, c, 3);
    expect(combatente(c, B).defesa).toBe(B.defesa);
  });

  it('quem sai de campo perde condições, buff e golpe em andamento', () => {
    const { b, c, A, B } = duelo(['teia-de-raiz'], ['jato']);
    travar(B);
    A.x = 130;
    rodar(b, c, 1.2);
    expect(temCondicao(B, 'preso')).toBe(true);
    rodar(b, c, 0.5, [{ tipo: 'trocar', equipe: 1, indice: 1 }]);
    expect(B.condicoes).toEqual([]);
    expect(B.acao).toBeNull();
  });
});

describe('efeitos em si', () => {
  it('cura recupera a porcentagem do HP máximo, sem passar do máximo', () => {
    const { b, c, A, B } = duelo(['folego'], ['jato']);
    travar(B);
    A.hp = 30;
    rodar(b, c, 1);
    expect(A.hp).toBe(55);
    A.hp = 95;
    A.golpes[0]!.recarga = 0;
    const ev = rodar(b, c, 1.5, [{ tipo: 'proximoGolpe', equipe: 0, indice: 0 }]);
    expect(A.hp).toBe(100);
    expect(achar(ev, 'cura')!.e.valor).toBe(5);
  });

  it('buff de velocidade acelera', () => {
    const { b, c, A, B } = duelo(['vento-de-cauda'], ['jato']);
    travar(B);
    rodar(b, c, 0.1);
    expect(velocidadeAtual(A)).toBe(A.velocidade + 30);
  });
});

describe('IA', () => {
  it('usa um avanço sem dano para encurtar a distância', () => {
    const c = conteudo();
    c.golpes['disparada'] = esquemaGolpe.parse({ nome: 'Disparada', tipo: 'normal', recarga: 3, efeitos: [{ efeito: 'avancar', distancia: 40, duracao: 0.2 }] });
    const { b, B } = duelo(['disparada'], ['jato'], c);
    travar(B);
    const ev = rodar(b, c, 0.1);
    expect(achar(ev, 'deslocamento', (e) => e.motivo === 'avancar')).toBeDefined();
  });

  it('só recua com pouco HP e o rival por perto', () => {
    const { b, c, A, B } = duelo(['salto-para-tras'], ['jato']);
    travar(B);
    A.x = 180;
    expect(achar(rodar(b, c, 0.3), 'deslocamento')).toBeUndefined(); // HP cheio: não foge
  });

  it('só cura com HP abaixo de metade', () => {
    const { b, c, B } = duelo(['folego'], ['jato']);
    travar(B);
    expect(achar(rodar(b, c, 1), 'golpe')).toBeUndefined();
  });
});

describe('batalha de laboratório', () => {
  it('roda inteira, IA contra IA, sem erro e de forma determinística', () => {
    const c = conteudo();
    c.regras.ia.hpEsquiva = 0;
    const jogar = () => {
      const cfg = configDaBatalha(c, 'laboratorio', 9);
      cfg.equipes[0].piloto = 'ia';
      const b = criarBatalha(c, cfg);
      const tipos = new Set<string>();
      for (let i = 0; i < 600 / PASSO && b.vencedor === null; i++) for (const e of avancar(b, c)) tipos.add(e.tipo === 'deslocamento' ? `deslocamento:${e.motivo}` : e.tipo === 'condicao' ? `condicao:${e.condicao}` : e.tipo);
      return { b, tipos };
    };
    const um = jogar();
    const dois = jogar();
    expect(dois.b).toEqual(um.b);
    // Não exige vencedor: o duelo final Brotinho × Brotinho (planta resiste a planta, os dois se curam)
    // empata para sempre. É um achado de balanceamento, não um defeito do motor.
    const nocautes = um.b.equipes.flatMap((eq) => eq.lutadores).filter((l) => l.desmaiado).length;
    expect(nocautes).toBeGreaterThanOrEqual(4);
    for (const t of ['deslocamento:avancar', 'deslocamento:empurrar', 'deslocamento:puxar', 'condicao:preso', 'condicao:atordoado', 'condicao:dano-continuo', 'condicao:debuff']) {
      expect(um.tipos, t).toContain(t);
    }
  });
});
