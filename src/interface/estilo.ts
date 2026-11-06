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
 * Medidas dos selos finais do Claude Design (`design/Selos Finais.dc.html`), a regra única de tamanho do jogo:
 * selo de tipo (5a) em 22 px com glifo de 14 e raio 5, ou em 16 px com glifo de 10 e raio 4; selo de categoria (6b)
 * em 18 px com ícone de 12 e raio 5, fundo claro e ícone escuro.
 */
export const SELO_TIPO = {
  22: { glifo: 14, raio: 5 },
  16: { glifo: 10, raio: 4 },
} as const;
export const SELO_CATEGORIA = { tam: 18, icone: 12, raio: 5, fundo: '#e9ecf2', tinta: '#14243a' } as const;
/**
 * Selo de categoria encaixado no canto inferior direito do selo de tipo de 22 px, como no card do 6b do Lab de Selos:
 * metade do tamanho do selo, deslocado 4 px para fora, com um filete de 1 px da cor do card em volta.
 */
export const SELO_CATEGORIA_CANTO = { tam: 12, icone: 8, raio: 3, deslocamento: 4, filete: 1 } as const;

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
