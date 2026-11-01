import { describe, expect, it } from 'vitest';
import { carregarConteudo } from '../src/conteudo/esquema';
import { prototipo } from '../src/conteudo/pacotes';
import { conteudo } from './ajuda';

const erroAo = (mexer: (c: ReturnType<typeof conteudo>) => void): string => {
  const c = conteudo();
  mexer(c);
  try {
    carregarConteudo(c);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('o conteúdo deveria ser inválido');
};

describe('pacote do protótipo', () => {
  it('tem os 7 tipos e as 6 criaturas da Arena, usando os 19 golpes originais', () => {
    expect(Object.keys(prototipo.tipos)).toHaveLength(7);
    expect(Object.keys(prototipo.especies)).toHaveLength(6);
    const usados = new Set(Object.values(prototipo.especies).flatMap((e) => e.golpes));
    expect(usados.size).toBe(19);
  });

  it('preenche os padrões: conjuração 0, parado durante o golpe e projétil guiado da Arena', () => {
    const ventania = prototipo.golpes['ventania']!;
    expect(ventania.conjuracao).toBe(0);
    expect(ventania.durante).toBe('parado');
    expect(ventania.efeitos[0]).toEqual({
      efeito: 'projetil',
      poder: 45,
      efeitos: [],
      trajetoria: 'guiado',
      quantidade: 1,
      abertura: 0,
      acertos: 1,
      atravessa: false,
      herdaCampo: false,
      estouro: [],
    });
  });
});

describe('validação', () => {
  it('aceita um tipo novo só com entrada no dicionário', () => {
    const c = conteudo();
    c.tipos['gelo'] = { nome: 'Gelo', cor: '#7fc8ec', fundo: '#24405a', eficacia: { planta: 2, fogo: 0.5 } };
    c.especies['gelinho'] = { ...c.especies['gotinha']!, nome: 'Gelinho', tipos: ['gelo'] };
    expect(() => carregarConteudo(c)).not.toThrow();
  });

  it('aponta golpe com tipo que não existe', () => {
    expect(erroAo((c) => (c.golpes['jato']!.tipo = 'lava'))).toContain('golpes.jato.tipo: tipo "lava" não existe');
  });

  it('aponta espécie com golpe que não existe', () => {
    expect(erroAo((c) => (c.especies['gotinha']!.golpes[0] = 'tsunami'))).toContain(
      'especies.gotinha.golpes.0: golpe "tsunami" não existe',
    );
  });

  it('aponta eficácia contra tipo que não existe', () => {
    expect(erroAo((c) => (c.tipos['fogo']!.eficacia['metal'] = 2))).toContain('tipos.fogo.eficacia.metal');
  });

  it('aponta time com espécie que não existe', () => {
    expect(erroAo((c) => (c.batalhas['treino']!.equipes[1].time[0] = 'dragao'))).toContain('espécie "dragao" não existe');
  });

  it('recusa golpe sem efeitos', () => {
    expect(erroAo((c) => (c.golpes['brisa']!.efeitos = []))).toContain('golpes.brisa.efeitos');
  });

  it('recusa golpe que atinge o rival sem alcance', () => {
    expect(erroAo((c) => delete c.golpes['jato']!.alcance)).toContain('golpe que atinge o rival precisa de alcance');
  });

  it('aceita golpe só de movimento ou buff sem alcance', () => {
    const c = conteudo();
    expect(c.golpes['salto-para-tras']!.alcance).toBeUndefined();
    expect(() => carregarConteudo(c)).not.toThrow();
  });

  it('recusa efeito desconhecido e campo errado no efeito', () => {
    expect(erroAo((c) => ((c.golpes['jato']!.efeitos as unknown[])[0] = { efeito: 'teletransporte' }))).toContain('golpes.jato.efeitos.0');
    expect(erroAo((c) => ((c.golpes['lamacal']!.efeitos as unknown[])[0] = { efeito: 'projetil', poder: 10, efeitos: [{ efeito: 'lentidao', fator: 2, duracao: 1 }] }))).toContain('fator');
  });

  it('time de batalha pode escolher os golpes de cada criatura', () => {
    const c = conteudo();
    c.batalhas['treino']!.equipes[0].time[0] = { especie: 'perereca', golpes: ['investida-veloz', 'salto-para-tras'] };
    expect(() => carregarConteudo(c)).not.toThrow();
    expect(erroAo((x) => (x.batalhas['treino']!.equipes[0].time[0] = { especie: 'perereca', golpes: ['voo'] }))).toContain('golpe "voo" não existe');
  });

  it('recusa espécie com mais golpes que o máximo', () => {
    expect(erroAo((c) => c.especies['gotinha']!.golpes.push('bolha'))).toContain('o máximo é 4');
  });

  it('tem um sprite quadrado para cada criatura do protótipo', () => {
    expect(Object.keys(prototipo.sprites).sort()).toEqual(Object.keys(prototipo.especies).sort());
  });

  it('recusa sprite que não é quadrado', () => {
    expect(erroAo((c) => (c.sprites['gotinha']!.pixels[3] = '0000'))).toContain('precisa ser quadrado');
  });

  it('recusa sprite que usa cor fora da paleta', () => {
    expect(erroAo((c) => (c.sprites['gotinha']!.pixels[5] = 'f'.repeat(24)))).toContain('a paleta só tem');
  });

  it('recusa sprite de espécie que não existe', () => {
    expect(erroAo((c) => (c.sprites['dragao'] = c.sprites['gotinha']!))).toContain('sprites.dragao: espécie "dragao" não existe');
  });

  it('aceita tipo sem ícone nem cores de projétil (a interface usa um padrão)', () => {
    const c = conteudo();
    delete c.tipos['ar']!.icone;
    delete c.tipos['ar']!.projetil;
    expect(() => carregarConteudo(c)).not.toThrow();
  });

  it('recusa id com acento ou maiúscula', () => {
    expect(erroAo((c) => (c.categorias['Mágico'] = { nome: 'Mágico' }))).toContain('letras minúsculas');
  });
});
