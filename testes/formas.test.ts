// Base espacial dos golpes: projéteis que podem errar, formas (área, cone, linha),
// zonas com pulso, canalização, chance e como quem usa se move durante o golpe.

import { describe, expect, it } from 'vitest';
import { esquemaGolpe, type Conteudo } from '../src/conteudo/esquema';
import {
  PASSO,
  acertaForma,
  aplicarComandos,
  avancar,
  configDaBatalha,
  criarBatalha,
  golpeDe,
  type Comando,
  type EstadoBatalha,
  type Evento,
  type Geometria,
  type Lutador,
} from '../src/nucleo';
import { conteudo } from './ajuda';

/** Conteúdo do protótipo com golpes de teste (tipo normal, recarga 10, alcance 300, salvo se dito). */
function comGolpes(golpes: Record<string, Record<string, unknown>>): Conteudo {
  const c = conteudo();
  for (const [id, g] of Object.entries(golpes)) {
    c.golpes[id] = esquemaGolpe.parse({ nome: id, tipo: 'normal', recarga: 10, alcance: 300, ...g });
  }
  return c;
}

/** Briserecs (A) com `golpe` contra Gotinha (B) sem golpes prontos; os dois parados na tática FIRME. */
function duelo(c: Conteudo, golpe: string) {
  const b = criarBatalha(c, {
    semente: 1,
    equipes: [
      { piloto: 'jogador', time: [{ especie: 'perereca', golpes: [golpe] }] },
      { piloto: 'jogador', time: [{ especie: 'gotinha', golpes: ['jato'] }, 'brasino'] },
    ],
  });
  aplicarComandos(b, c, [
    { tipo: 'tatica', equipe: 0, tatica: 'parado' },
    { tipo: 'tatica', equipe: 1, tatica: 'parado' },
  ]);
  const A = b.equipes[0].lutadores[0]!;
  const B = b.equipes[1].lutadores[0]!;
  travar(B);
  return { b, A, B };
}

const travar = (l: Lutador) => l.golpes.forEach((g) => (g.recarga = 1e9));

function pos(l: Lutador, x: number, y: number) {
  l.x = x;
  l.y = y;
}

/** Roda `segundos`; os comandos entram no primeiro passo. */
function rodar(b: EstadoBatalha, c: Conteudo, segundos: number, comandos: Comando[] = []): Evento[] {
  const ev: Evento[] = [];
  for (let i = 0; i < Math.round(segundos / PASSO); i++) ev.push(...avancar(b, c, i === 0 ? comandos : []));
  return ev;
}

const danos = (ev: Evento[], origem?: string) => ev.filter((e) => e.tipo === 'dano' && (origem === undefined || e.origem === origem));

describe('projétil reto', () => {
  // Fórmula da análise: um projétil reto a V acerta quem anda de lado a v só até a distância
  // r·√(V² + v²) ÷ v, com r = raio da criatura + raio do projétil. Ele sai 6 à frente de quem atira.
  const casos = [
    { V: 180, v: 50 },
    { V: 120, v: 46 },
    { V: 200, v: 64 },
  ];
  for (const { V, v } of casos) {
    it(`a ${V}/s contra quem anda de lado a ${v}/s, acerta até r·√(V²+v²)/v e erra depois`, () => {
      const c = comGolpes({ tiro: { efeitos: [{ efeito: 'projetil', poder: 20, trajetoria: 'reto', velocidade: V }] } });
      const r = c.regras.raioCriatura + c.regras.projetil.raio;
      const limite = 6 + (r * Math.hypot(V, v)) / v;
      const tentar = (D: number) => {
        const { b, A, B } = duelo(c, 'tiro');
        pos(B, 205, 40);
        pos(A, 205 - D, 40);
        B.velocidade = v;
        return danos(rodar(b, c, 1.5, [{ tipo: 'direcao', equipe: 1, x: 0, y: 1 }]), 'projetil').length;
      };
      expect(tentar(limite - 3)).toBe(1);
      expect(tentar(limite + 3)).toBe(0);
    });
  }

  it('acerta quem fica parado e some sem acertar quem sai da frente', () => {
    const c = comGolpes({ tiro: { efeitos: [{ efeito: 'projetil', poder: 20, trajetoria: 'reto', velocidade: 120 }] } });
    const parado = duelo(c, 'tiro');
    expect(danos(rodar(parado.b, c, 1.5), 'projetil')).toHaveLength(1);

    const foge = duelo(c, 'tiro');
    const ev = rodar(foge.b, c, 3, [{ tipo: 'direcao', equipe: 1, x: 0, y: 1 }]);
    expect(danos(ev, 'projetil')).toHaveLength(0);
    expect(ev.some((e) => e.tipo === 'projetilPerdido')).toBe(true);
    expect(foge.b.projeteis).toHaveLength(0);
  });

  it('atravessa: acerta e segue voando até sair da arena', () => {
    const c = comGolpes({ corte: { efeitos: [{ efeito: 'projetil', poder: 20, trajetoria: 'reto', velocidade: 200, atravessa: true }] } });
    const { b } = duelo(c, 'corte');
    const ev = rodar(b, c, 0.5);
    expect(danos(ev, 'projetil')).toHaveLength(1);
    expect(b.projeteis).toHaveLength(1);
    expect(rodar(b, c, 1.5).some((e) => e.tipo === 'projetilPerdido')).toBe(true);
    expect(b.projeteis).toHaveLength(0);
  });

  it('vários projéteis saem abertos em leque', () => {
    const c = comGolpes({ leque: { efeitos: [{ efeito: 'projetil', poder: 5, trajetoria: 'reto', quantidade: 3, abertura: 40 }] } });
    const { b } = duelo(c, 'leque');
    const ev = rodar(b, c, PASSO);
    expect(ev.filter((e) => e.tipo === 'projetil')).toHaveLength(3);
    const angulos = b.projeteis.map((p) => (Math.atan2(p.vy, p.vx) * 180) / Math.PI).sort((a, z) => a - z);
    expect(angulos[0]).toBeCloseTo(-20, 5);
    expect(angulos[1]).toBeCloseTo(0, 5);
    expect(angulos[2]).toBeCloseTo(20, 5);
  });
});

describe('projétil que persegue e que quica', () => {
  it('persegue alcança quem anda de lado onde o reto erraria, e some ao fim da vida', () => {
    const tiro = (trajetoria: string, vida = 2.5) => {
      const c = comGolpes({ tiro: { efeitos: [{ efeito: 'projetil', poder: 20, trajetoria, velocidade: 120, curva: 120, vida }] } });
      const { b, A, B } = duelo(c, 'tiro');
      pos(B, 205, 30);
      pos(A, 115, 30);
      return { ev: rodar(b, c, 2, [{ tipo: 'direcao', equipe: 1, x: 0, y: 1 }]), b };
    };
    expect(danos(tiro('reto').ev, 'projetil')).toHaveLength(0);
    expect(danos(tiro('persegue').ev, 'projetil')).toHaveLength(1);
    const curto = tiro('persegue', 0.3);
    expect(danos(curto.ev, 'projetil')).toHaveLength(0);
    expect(curto.ev.some((e) => e.tipo === 'projetilPerdido')).toBe(true);
  });

  it('a curva é limitada: quem corre perpendicular perto de quem atira escapa', () => {
    const c = comGolpes({ tiro: { efeitos: [{ efeito: 'projetil', poder: 20, trajetoria: 'persegue', velocidade: 60, curva: 30, vida: 1.5 }] } });
    const { b, A, B } = duelo(c, 'tiro');
    pos(B, 205, 20);
    pos(A, 150, 20);
    expect(danos(rodar(b, c, 2, [{ tipo: 'direcao', equipe: 1, x: 0, y: 1 }]), 'projetil')).toHaveLength(0);
  });

  it('quica na borda, volta e acerta de novo; cada acerto exige sair do rival', () => {
    const c = comGolpes({ orbe: { efeitos: [{ efeito: 'projetil', poder: 10, trajetoria: 'quica', velocidade: 150, vida: 3, acertos: 2 }] } });
    const { b, A, B } = duelo(c, 'orbe');
    pos(A, 100, 60);
    pos(B, 200, 60);
    const acertos: number[] = [];
    for (let i = 0; i < 3 / PASSO; i++) for (const e of avancar(b, c)) if (e.tipo === 'dano') acertos.push(b.tempo);
    expect(acertos).toHaveLength(2);
    // Entre os acertos ele foi até a parede (x 308) e voltou: uns 2 × (108 − 16) de caminho a 150/s.
    expect(acertos[1]! - acertos[0]!).toBeGreaterThan(1.2);
    expect(b.projeteis).toHaveLength(0);
  });
});

describe('formas', () => {
  const area: Geometria = { forma: 'area', raio: 20 };
  const cone: Geometria = { forma: 'cone', alcance: 50, angulo: 70 };
  const linha: Geometria = { forma: 'linha', alcance: 90, largura: 10 };
  const z = { x: 0, y: 0, ux: 1, uy: 0 };

  it('área: acerta quem tem alguma parte do corpo dentro do círculo', () => {
    expect(acertaForma(area, z, { x: 31, y: 0 }, 12)).toBe(true);
    expect(acertaForma(area, z, { x: 33, y: 0 }, 12)).toBe(false);
  });

  it('cone: alcance e abertura, contando o corpo', () => {
    expect(acertaForma(cone, z, { x: 40, y: 0 }, 0)).toBe(true);
    expect(acertaForma(cone, z, { x: 40, y: 27 }, 0)).toBe(true); // 34°, dentro dos 35° de cada lado
    expect(acertaForma(cone, z, { x: 40, y: 30 }, 0)).toBe(false); // 36,9°
    expect(acertaForma(cone, z, { x: 40, y: 30 }, 12)).toBe(true); // o corpo encosta na borda
    expect(acertaForma(cone, z, { x: 63, y: 0 }, 12)).toBe(false);
    expect(acertaForma(cone, z, { x: -20, y: 0 }, 12)).toBe(false); // atrás
  });

  it('linha: comprimento e largura, contando o corpo', () => {
    expect(acertaForma(linha, z, { x: 90, y: 16 }, 12)).toBe(true);
    expect(acertaForma(linha, z, { x: 90, y: 18 }, 12)).toBe(false);
    expect(acertaForma(linha, z, { x: 103, y: 0 }, 12)).toBe(false);
  });

  it('área no rival marca onde ele estava: se ele sair durante a conjuração, erra', () => {
    const c = comGolpes({ raio: { conjuracao: 0.6, efeitos: [{ efeito: 'area', centro: 'rival', raio: 8, poder: 40 }] } });
    const fica = duelo(c, 'raio');
    const ev = rodar(fica.b, c, 0.8);
    expect(danos(ev, 'forma')).toHaveLength(1);
    const forma = ev.find((e) => e.tipo === 'forma');
    expect(forma).toMatchObject({ x: 205, y: 70 });

    const sai = duelo(c, 'raio');
    const ev2 = rodar(sai.b, c, 0.8, [{ tipo: 'direcao', equipe: 1, x: 0, y: 1 }]);
    expect(danos(ev2, 'forma')).toHaveLength(0);
    expect(ev2.some((e) => e.tipo === 'errou')).toBe(true);
  });

  it('cone instantâneo acerta quem está na frente e aplica os efeitos', () => {
    const c = comGolpes({
      rajada: { alcance: 50, efeitos: [{ efeito: 'cone', alcance: 45, angulo: 90, poder: 30, efeitos: [{ efeito: 'empurrar', distancia: 30 }] }] },
    });
    const { b, A, B } = duelo(c, 'rajada');
    pos(A, 165, 70);
    const ev = rodar(b, c, 0.5);
    expect(danos(ev, 'forma')).toHaveLength(1);
    expect(B.x).toBeCloseTo(235, 0);
  });
});

describe('formas que duram', () => {
  it('área com duração fica no lugar e acerta a cada pulso; quem usa fica livre', () => {
    const c = comGolpes({
      raizes: {
        conjuracao: 0.5,
        efeitos: [{ efeito: 'area', centro: 'rival', raio: 22, poder: 4, duracao: 5, pulso: 0.5, efeitos: [{ efeito: 'lentidao', fator: 0.6, duracao: 0.6 }] }],
      },
    });
    const { b, A, B } = duelo(c, 'raizes');
    rodar(b, c, 0.5 + PASSO);
    expect(b.zonas).toHaveLength(1);
    expect(A.acao).toBeNull();
    const ev = rodar(b, c, 6);
    expect(danos(ev, 'forma')).toHaveLength(9); // 10 pulsos; o primeiro saiu antes
    expect(b.zonas).toHaveLength(0);
    expect(B.condicoes).toHaveLength(0);
  });

  it('cone canalizado: 2 s com pulso de 0,25 s dá 8 pulsos e a recarga conta do fim', () => {
    const c = comGolpes({
      chamas: { conjuracao: 0.3, recarga: 4, alcance: 50, durante: 'lento', efeitos: [{ efeito: 'cone', alcance: 50, angulo: 70, poder: 7, duracao: 2, pulso: 0.25 }] },
    });
    const { b, A } = duelo(c, 'chamas');
    pos(A, 175, 70);
    // Passo 1: começa. A conjuração acaba no passo 19, quando o cone surge; ele cobre 2 s (passos 19 a 138)
    // e a ação acaba no passo 139.
    const ev = rodar(b, c, 0.3 + 2 - PASSO);
    expect(danos(ev, 'forma')).toHaveLength(8);
    expect(A.acao).not.toBeNull();
    expect(A.golpes[0]!.recarga).toBe(4); // parada enquanto canaliza
    expect(b.zonas).toHaveLength(1);
    rodar(b, c, 2 * PASSO);
    expect(A.acao).toBeNull();
    expect(A.golpes[0]!.recarga).toBeCloseTo(4, 5);
    expect(b.zonas).toHaveLength(0);
  });

  it('interromper a canalização apaga a zona e a recarga recomeça dali', () => {
    const c = comGolpes({ chamas: { alcance: 50, recarga: 4, efeitos: [{ efeito: 'cone', alcance: 50, angulo: 70, poder: 7, duracao: 2, pulso: 0.25 }] } });
    const { b, A, B } = duelo(c, 'chamas');
    pos(A, 175, 70);
    rodar(b, c, 0.5);
    expect(b.zonas).toHaveLength(1);
    B.golpes = [{ id: 'rajada-de-vento', recarga: 0 }];
    const ev = rodar(b, c, 0.5);
    expect(ev.some((e) => e.tipo === 'interrompido')).toBe(true);
    expect(b.zonas).toHaveLength(0);
    expect(A.golpes[0]!.recarga).toBeGreaterThan(3.5);
  });

  it('chance: o efeito pega mais ou menos na proporção pedida', () => {
    const c = comGolpes({
      nuvem: { efeitos: [{ efeito: 'area', centro: 'rival', raio: 30, poder: 0, duracao: 10, pulso: 0.05, efeitos: [{ efeito: 'debuff', atributo: 'defesa', valor: 1, duracao: 0.01, chance: 0.3 }] }] },
    });
    const { b } = duelo(c, 'nuvem');
    const pegou = rodar(b, c, 10.1).filter((e) => e.tipo === 'condicao').length;
    expect(pegou).toBeGreaterThan(200 * 0.3 - 25);
    expect(pegou).toBeLessThan(200 * 0.3 + 25);
  });
});

describe('quem usa durante o golpe', () => {
  /** Começa uma conjuração de 1 s e anda para baixo por 0,5 s; devolve quanto andou e quanto andaria solto. */
  const andou = (durante: string) => {
    const c = comGolpes({ lento: { conjuracao: 1, durante, efeitos: [{ efeito: 'area', centro: 'rival', raio: 8, poder: 10 }] } });
    const { b, A } = duelo(c, 'lento');
    pos(A, A.x, 30);
    rodar(b, c, PASSO);
    expect(A.acao).not.toBeNull();
    rodar(b, c, 0.5, [{ tipo: 'direcao', equipe: 0, x: 0, y: 1 }]);
    return { andou: A.y - 30, solto: A.velocidade * 0.5 };
  };

  it('parado não sai do lugar, lento anda à metade e livre anda inteiro', () => {
    expect(andou('parado').andou).toBe(0);
    const lento = andou('lento');
    expect(lento.andou).toBeCloseTo(lento.solto * 0.5, 5);
    const livre = andou('livre');
    expect(livre.andou).toBeCloseTo(livre.solto, 5);
  });
});

describe('laboratório de formas', () => {
  it('roda inteira, IA contra IA, de forma determinística, usando todas as peças novas', () => {
    const c = conteudo();
    c.regras.ia.hpEsquiva = 0;
    const jogar = () => {
      const cfg = configDaBatalha(c, 'formas', 3);
      cfg.equipes[0].piloto = 'ia';
      const b = criarBatalha(c, cfg);
      const vistos = new Set<string>();
      for (let i = 0; i < 300 / PASSO && b.vencedor === null; i++) {
        for (const e of avancar(b, c)) {
          if (e.tipo === 'dano') vistos.add(`dano:${e.origem}`);
          else if (e.tipo === 'forma') vistos.add(`forma:${e.geo.forma}`);
          else vistos.add(e.tipo);
        }
        for (const z of b.zonas) vistos.add(z.canal ? 'zona:canal' : 'zona:fixa');
        for (const p of b.projeteis) vistos.add(`projetil:${p.def.trajetoria}`);
      }
      return { b, vistos };
    };
    const um = jogar();
    expect(jogar().b).toEqual(um.b);
    expect(um.b.vencedor).not.toBeNull();
    for (const v of ['dano:forma', 'dano:projetil', 'forma:area', 'forma:cone', 'forma:linha', 'zona:canal', 'zona:fixa', 'projetil:reto', 'projetil:persegue', 'projetil:quica', 'projetilPerdido']) {
      expect(um.vistos, v).toContain(v);
    }
  });
});
