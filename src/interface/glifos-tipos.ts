// Glifos de tipo dos selos finais do Claude Design (opção 5a), lidos direto de `design/icones/tipos/` no build:
// `TIPO-glifo.svg` dá o traçado (24×24, em `currentColor`) e `TIPO.svg`, o selo completo, dá a cor do ícone sobre o
// fundo colorido (branco, ou escuro nos tipos claros). Mudar o SVG muda o selo em todo lugar: time, HUD, cards e ajuda.

const brutos = import.meta.glob('../../design/icones/tipos/*.svg', { query: '?raw', eager: true, import: 'default' }) as Record<string, string>;

const semMetadados = (svg: string) => svg.replace(/<metadata[\s\S]*?<\/metadata>/g, '').replace(/\s+/g, ' ').trim();
/** O que fica dentro do `<svg>`: os `<path>` do glifo. */
const miolo = (svg: string) => semMetadados(svg).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').trim();

/** Glifo de cada tipo (miolo de um SVG 24×24 com `currentColor`) e a cor do ícone sobre o selo colorido. */
export const GLIFOS_TIPOS: Record<string, { cor: string; svg: string }> = {};

for (const [caminho, conteudo] of Object.entries(brutos)) {
  const nome = caminho.slice(caminho.lastIndexOf('/') + 1, -'.svg'.length);
  if (!nome.endsWith('-glifo')) continue;
  const tipo = nome.slice(0, -'-glifo'.length);
  const selo = brutos[caminho.replace('-glifo.svg', '.svg')];
  const cor = (selo && /<path[^>]*fill="(#[0-9a-fA-F]{6})"/.exec(semMetadados(selo))?.[1]) ?? '#ffffff';
  GLIFOS_TIPOS[tipo] = { cor, svg: miolo(conteudo) };
}
