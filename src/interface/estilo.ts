// Peças de estilo repetidas da Arena: moldura de pixel, ícones em box-shadow e cor do HP.

/** Borda de 2 px nos quatro lados, sem cantos (a "moldura de pixel"). `extra` soma outras sombras. */
export const moldura = (cor: string, extra?: string): string =>
  `0 -2px 0 0 ${cor}, 0 2px 0 0 ${cor}, -2px 0 0 0 ${cor}, 2px 0 0 0 ${cor}${extra ? `, ${extra}` : ''}`;

const cache = new Map<string, string>();

/** Desenha um ícone de pixel ("#" aceso) como lista de box-shadow, cada pixel com `S` px. */
export function sombraIcone(linhas: readonly string[], S: number, cor: string): string {
  const chave = `${linhas.join('|')}${S}${cor}`;
  const pronto = cache.get(chave);
  if (pronto) return pronto;
  const partes: string[] = [];
  linhas.forEach((linha, y) => {
    for (let x = 0; x < linha.length; x++) if (linha[x] === '#') partes.push(`${(x + 1) * S}px ${(y + 1) * S}px 0 0 ${cor}`);
  });
  const s = partes.join(', ');
  cache.set(chave, s);
  return s;
}

/**
 * Geometria do selo de tipo (5a), copiada do `TIPO.svg` de `design/icones/tipos/`: caixa de 32, cantos de raio 6,5 e o
 * glifo de 24 deslocado 6,5 e reduzido a 0,7917. O selo é um SVG só, escalado: em 16 px, 22 px ou numa célula da
 * tabela, raio, margem e preenchimento ficam na mesma proporção. Os tamanhos usados são os dos selos finais: 22 no
 * card de golpe e 16 em todo o resto.
 */
export const SELO = { caixa: 32, raio: 6.5, glifoDeslocamento: 6.5, glifoEscala: 0.7917, card: 22, lista: 16 } as const;

/**
 * Selo de categoria (6b) encaixado no canto inferior direito do selo de tipo, como no card do 6b do Lab de Selos, nas
 * unidades da caixa de 32: lado 17, saindo 5 para fora, raio de 28%, ícone de 24 reduzido para 66% do lado, fundo
 * claro e ícone escuro (os tons dos selos finais) e um filete de 1,5 da cor do card em volta.
 */
export const SELO_CATEGORIA = { lado: 17, deslocamento: 5, raio: 0.28, icone: 0.66, filete: 1.5, fundo: '#e9ecf2', tinta: '#14243a' } as const;

/** Ícone de quem ainda não desenhou um para o tipo. */
export const ICONE_PADRAO = ['........', '.######.', '.######.', '.######.', '.######.', '.######.', '.######.', '........'];

export const corHp = (p: number): string => (p > 0.5 ? '#a7f070' : p > 0.25 ? '#ffcd75' : '#ef7d57');

/**
 * Botão que responde ao apertar (como na Arena): mais rápido no toque e imune ao painel
 * ser redesenhado entre apertar e soltar. Enter e espaço continuam valendo pelo clique.
 */
export function aoApertar(fn: () => void) {
  return {
    onPointerDown: (ev: PointerEvent) => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      ev.preventDefault();
      fn();
    },
    onClick: (ev: MouseEvent) => {
      if (ev.detail === 0) fn();
    },
  };
}
