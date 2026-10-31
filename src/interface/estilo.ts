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
