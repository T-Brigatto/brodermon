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
  it('tem os 7 tipos, as 6 criaturas e os 19 golpes da Arena', () => {
    expect(Object.keys(prototipo.tipos)).toHaveLength(7);
    expect(Object.keys(prototipo.especies)).toHaveLength(6);
    expect(Object.keys(prototipo.golpes)).toHaveLength(19);
  });

  it('preenche os padrões: eficácia vazia vira {} e contato vira false', () => {
    expect(prototipo.golpes['ventania']!.contato).toBe(false);
    expect(prototipo.golpes['investida']!.contato).toBe(true);
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

  it('recusa golpe sem dano e sem buff', () => {
    expect(erroAo((c) => delete c.golpes['brisa']!.buff)).toContain('o golpe precisa de dano, buff ou os dois');
  });

  it('recusa golpe com dano e sem alcance', () => {
    expect(erroAo((c) => delete c.golpes['jato']!.alcance)).toContain('golpes.jato.alcance');
  });

  it('recusa espécie com mais golpes que o máximo', () => {
    expect(erroAo((c) => c.especies['gotinha']!.golpes.push('bolha'))).toContain('o máximo é 4');
  });

  it('recusa id com acento ou maiúscula', () => {
    expect(erroAo((c) => (c.categorias['Mágico'] = { nome: 'Mágico' }))).toContain('letras minúsculas');
  });
});
