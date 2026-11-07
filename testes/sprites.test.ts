import { describe, expect, it } from 'vitest';
import { carregarConteudo, type SpriteImagem } from '../src/conteudo/esquema';
import { vale } from '../src/conteudo/pacotes';
import { quadroDoMomento, spriteDe, vistaPara, type Momento, type Vista } from '../src/desenho/sprites';
import { fundoDa, ladoPara, mascaraDe, montarTira, pesDo, quadrosDa } from '../ferramentas/folha';
import { gravarPng, lerPng, type Imagem } from '../ferramentas/png';
import { conteudo } from './ajuda';

const momento = (m: Partial<Momento>): Momento => ({ tempo: 0, conjurando: false, desdeOGolpe: 99, ferido: false, andando: false, ...m });

describe('sprite em tira', () => {
  it('a Briserecs do vale vem da tira em imagem, com as quatro animações', () => {
    const s = vale.sprites['briserecs'] as SpriteImagem;
    expect(s.imagem).toMatch(/briserecs\.png$/);
    expect(Object.keys(s.animacoes).sort()).toEqual(['andando', 'ataque', 'dano', 'parado']);
    const m = spriteDe(vale, 'briserecs');
    expect(m).toMatchObject({ n: s.quadro, h: s.altura, pe: s.pe, topo: s.pe - s.altura + 1 });
  });

  it('Áries e Sagitário têm retrato ilustrado, resolvido para a URL do PNG do pacote', () => {
    for (const id of ['aries', 'sagitario']) {
      const s = vale.sprites[id] as SpriteImagem;
      expect(s.retrato, id).toMatch(new RegExp(`retrato-${id}.*\\.png$`));
    }
    expect((vale.sprites['briserecs'] as SpriteImagem).retrato).toBeUndefined();
  });

  it('o retrato é opcional em qualquer sprite e a interface do pacote é "arena" por padrão', () => {
    const c = conteudo();
    c.sprites['gotinha'] = { ...(c.sprites['gotinha'] as object), retrato: 'sprites/retrato-gotinha.png' } as never;
    const carregado = carregarConteudo(c);
    expect((carregado.sprites['gotinha'] as { retrato?: string }).retrato).toBe('sprites/retrato-gotinha.png');
    expect(carregado.regras.interface).toBe('arena');
    expect(vale.regras.interface).toBe('chapada');
  });

  it('recusa tira sem a animação parado', () => {
    const c = conteudo();
    c.sprites['gotinha'] = { imagem: 'x.png', quadro: 32, pe: 30, altura: 20, animacoes: { andando: { quadros: [0], fps: 4 } } } as never;
    expect(() => carregarConteudo(c)).toThrow(/parado/);
  });

  it('escolhe o quadro pelo que a criatura faz: dano, ataque, andando ou parado', () => {
    const s = spriteDe(vale, 'briserecs');
    const a = s.animacoes!;
    // Parado e andando em laço, no ritmo de cada um.
    expect(quadroDoMomento(s, momento({ tempo: 0 }))).toBe(a.parado.quadros[0]);
    expect(quadroDoMomento(s, momento({ tempo: 1.01 / a.parado.fps }))).toBe(a.parado.quadros[1]);
    expect(quadroDoMomento(s, momento({ tempo: a.parado.quadros.length / a.parado.fps }))).toBe(a.parado.quadros[0]);
    expect(quadroDoMomento(s, momento({ tempo: 2.01 / a.andando!.fps, andando: true }))).toBe(a.andando!.quadros[2]);
    // Conjurando, segura o primeiro quadro do ataque; depois que o golpe sai, o ataque toca uma vez e volta.
    expect(quadroDoMomento(s, momento({ conjurando: true, andando: true }))).toBe(a.ataque!.quadros[0]);
    expect(quadroDoMomento(s, momento({ desdeOGolpe: 1.01 / a.ataque!.fps }))).toBe(a.ataque!.quadros[1]);
    expect(quadroDoMomento(s, momento({ desdeOGolpe: a.ataque!.quadros.length / a.ataque!.fps }))).toBe(a.parado.quadros[0]);
    // O dano passa na frente de tudo.
    expect(quadroDoMomento(s, momento({ ferido: true, conjurando: true }))).toBe(a.dano!.quadros[0]);
  });

  it('sprite em grade de pixels tem um quadro só', () => {
    expect(quadroDoMomento(spriteDe(vale, 'gotinha'), momento({ andando: true, tempo: 3 }))).toBe(0);
  });

  it('Áries e Sagitário têm as vistas de frente e de costas na mesma tira, sem repetir quadro', () => {
    for (const id of ['aries', 'sagitario']) {
      const s = vale.sprites[id] as SpriteImagem;
      expect(s.vistas?.frente && s.vistas.costas).toBeTruthy();
      const todos = [s.animacoes, s.vistas!.frente!, s.vistas!.costas!].flatMap((a) => Object.values(a).flatMap((x) => x.quadros));
      expect(new Set(todos).size).toBe(todos.length);
      expect(Object.keys(s.vistas!.frente!).sort()).toEqual(Object.keys(s.animacoes).sort());
    }
  });

  it('o quadro vem da vista pedida; uma tira sem vistas fica de lado', () => {
    const s = spriteDe(vale, 'aries');
    expect(quadroDoMomento(s, momento({}), 'frente')).toBe(s.vistas!.frente!.parado.quadros[0]);
    expect(quadroDoMomento(s, momento({ ferido: true }), 'costas')).toBe(s.vistas!.costas!.dano!.quadros[0]);
    expect(quadroDoMomento(s, momento({}), 'lado')).toBe(s.animacoes!.parado.quadros[0]);
    const b = spriteDe(vale, 'briserecs');
    expect(b.vistas).toBeNull();
    expect(quadroDoMomento(b, momento({}), 'frente')).toBe(b.animacoes!.parado.quadros[0]);
  });
});

describe('vista pela direção em que a criatura anda', () => {
  it('descendo (y maior) fica de frente; subindo, de costas; na horizontal, de lado', () => {
    expect(vistaPara(40, 0, 'lado')).toBe('lado');
    expect(vistaPara(0, 40, 'lado')).toBe('frente');
    expect(vistaPara(0, -40, 'lado')).toBe('costas');
    expect(vistaPara(-20, 50, 'costas')).toBe('frente');
  });

  it('parada (ou com a velocidade zerada por golpe ou empurrão) fica de lado, mesmo se estava de costas', () => {
    expect(vistaPara(0, 0, 'costas')).toBe('lado');
    expect(vistaPara(2, -3, 'frente')).toBe('lado');
  });

  it('tem folga: entra na vertical acima de 45° e só volta ao lado abaixo de 0,7', () => {
    let v: Vista = 'lado';
    v = vistaPara(40, 36, v);
    expect(v).toBe('lado'); // um pouco abaixo de 45°: ainda de lado
    v = vistaPara(40, 44, v);
    expect(v).toBe('frente');
    v = vistaPara(40, 32, v);
    expect(v).toBe('frente'); // na faixa de folga: continua de frente
    v = vistaPara(40, 24, v);
    expect(v).toBe('lado');
    // Na faixa de folga, trocar de frente para costas passa pelo lado.
    expect(vistaPara(40, -40, 'frente')).toBe('lado');
  });
});

/** Folha sintética: fundo liso e retângulos (os "bichos") em duas linhas. */
function folha(linhas: { x: number; y: number; l: number; a: number }[][]): Imagem {
  const largura = 400;
  const altura = 260;
  const dados = new Uint8Array(largura * altura * 4);
  for (let i = 0; i < largura * altura; i++) dados.set([40, 200, 120, 255], i * 4);
  for (const linha of linhas) {
    for (const r of linha) {
      for (let y = r.y; y < r.y + r.a; y++) for (let x = r.x; x < r.x + r.l; x++) dados.set([180, 40, 60, 255], (y * largura + x) * 4);
    }
  }
  return { largura, altura, dados };
}

describe('importador de folhas', () => {
  it('lê de volta o PNG que grava', () => {
    const im = folha([[{ x: 10, y: 10, l: 5, a: 7 }]]);
    const lido = lerPng(gravarPng(im));
    expect(lido.largura).toBe(im.largura);
    expect(lido.altura).toBe(im.altura);
    expect(Buffer.from(lido.dados).equals(Buffer.from(im.dados))).toBe(true);
  });

  it('acha os quadros de cada linha, mesmo de tamanhos diferentes', () => {
    const im = folha([
      [
        { x: 20, y: 20, l: 50, a: 70 },
        { x: 120, y: 25, l: 60, a: 65 },
        { x: 240, y: 20, l: 55, a: 70 },
      ],
      [
        { x: 30, y: 140, l: 70, a: 80 },
        { x: 200, y: 150, l: 45, a: 70 },
      ],
    ]);
    expect(fundoDa(im)).toEqual([40, 200, 120]);
    const linhas = quadrosDa(im, mascaraDe(im, fundoDa(im)));
    expect(linhas.map((l) => l.length)).toEqual([3, 2]);
    expect(linhas[0]![1]).toEqual({ x0: 120, y0: 25, x1: 180, y1: 90 });
    expect(linhas[1]![0]).toEqual({ x0: 30, y0: 140, x1: 100, y1: 220 });
  });

  it('monta a tira com os pés na mesma linha e no meio do quadro', () => {
    const quadro = (l: number, a: number): Imagem => {
      const dados = new Uint8Array(l * a * 4);
      for (let i = 0; i < l * a; i++) dados.set([200, 100, 50, 255], i * 4);
      return { largura: l, altura: a, dados };
    };
    const quadros = [quadro(10, 20), quadro(16, 12)];
    const lado = ladoPara(quadros);
    expect(lado % 8).toBe(0);
    const tira = montarTira(quadros, lado);
    expect(tira.largura).toBe(lado * 2);
    for (let k = 0; k < 2; k++) {
      const recorte: Imagem = { largura: lado, altura: lado, dados: new Uint8Array(lado * lado * 4) };
      for (let y = 0; y < lado; y++) recorte.dados.set(tira.dados.subarray((y * tira.largura + k * lado) * 4, (y * tira.largura + (k + 1) * lado) * 4), y * lado * 4);
      const { base, centro } = pesDo(recorte);
      expect(base).toBe(lado - 2);
      expect(Math.abs(centro - lado / 2)).toBeLessThanOrEqual(0.5);
    }
  });
});
