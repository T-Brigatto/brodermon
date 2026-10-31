import { describe, expect, it } from 'vitest';
import { prototipo as c } from '../src/conteudo/pacotes';
import { calcularDano, confronto, eficacia, sortear } from '../src/nucleo';

describe('sorteio com semente', () => {
  it('repete a sequência com a mesma semente', () => {
    const a = { estado: 42 };
    const b = { estado: 42 };
    const sa = Array.from({ length: 5 }, () => sortear(a));
    expect(Array.from({ length: 5 }, () => sortear(b))).toEqual(sa);
    expect(sa.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('muda com outra semente', () => {
    expect(sortear({ estado: 1 })).not.toBe(sortear({ estado: 2 }));
  });
});

describe('eficácia', () => {
  it('lê a tabela e usa 1 quando o par não está nela', () => {
    expect(eficacia(c, 'fogo', ['planta'])).toBe(2);
    expect(eficacia(c, 'fogo', ['ar'])).toBe(1);
    expect(eficacia(c, 'normal', ['rocha'])).toBe(0.5);
  });

  it('multiplica contra criatura de dois tipos', () => {
    expect(eficacia(c, 'eletrico', ['rocha', 'planta'])).toBe(0);
    expect(eficacia(c, 'agua', ['rocha', 'planta'])).toBe(0.25);
    expect(eficacia(c, 'rocha', ['rocha', 'planta'])).toBe(0.25);
    expect(eficacia(c, 'fogo', ['rocha', 'planta'])).toBe(1);
  });

  it('resume a vantagem no confronto', () => {
    expect(confronto(c, ['agua'], ['fogo'])).toBe(1);
    expect(confronto(c, ['fogo'], ['agua'])).toBe(-1);
    expect(confronto(c, ['ar'], ['ar'])).toBe(0);
  });
});

describe('dano', () => {
  const brasino = { tipos: ['fogo'], ataque: 16, defesa: 10 };
  const brotinho = { tipos: ['planta'], ataque: 12, defesa: 14 };
  const pedrisco = { tipos: ['rocha', 'planta'], ataque: 14, defesa: 16 };
  const meio = 0.5; // aleatório = 1,0

  it('segue a fórmula da Arena', () => {
    // 50/18 × 16/14 × 3 × 2 (super eficaz) × 1,5 (STAB) × 1,0 × 0,9 = 25,71
    expect(calcularDano(c, brasino, brotinho, { tipo: 'fogo', poder: 50 }, meio)).toEqual({ valor: 25, eficacia: 2 });
  });

  it('dá STAB só quando o golpe é de um tipo do atacante', () => {
    // Investida (normal) do Brasino: 35/18 × 16/14 × 3 × 1 × 1 × 1 × 0,9 = 6,0
    expect(calcularDano(c, brasino, brotinho, { tipo: 'normal', poder: 35 }, meio).valor).toBe(6);
  });

  it('varia de 0,9 a 1,1 com o sorteio', () => {
    expect(calcularDano(c, brasino, brotinho, { tipo: 'fogo', poder: 50 }, 0).valor).toBe(23);
    expect(calcularDano(c, brasino, brotinho, { tipo: 'fogo', poder: 50 }, 0.999).valor).toBe(28);
  });

  it('dá 0 quando não tem efeito e no mínimo 1 nos outros casos', () => {
    expect(calcularDano(c, brasino, pedrisco, { tipo: 'eletrico', poder: 48 }, meio)).toEqual({ valor: 0, eficacia: 0 });
    const fraco = { tipos: ['normal'], ataque: 1, defesa: 1 };
    const muralha = { tipos: ['rocha'], ataque: 1, defesa: 200 };
    expect(calcularDano(c, fraco, muralha, { tipo: 'normal', poder: 35 }, meio).valor).toBe(1);
  });
});
