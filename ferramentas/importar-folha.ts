// Importa uma folha de sprites (gerada no GPT) para uma espécie de um pacote: recorta os quadros escolhidos, reduz para
// a altura do jogo, reduz as cores, alinha os pés e grava `conteudo/PACOTE/sprites/ESPECIE.png` (a tira) e a entrada
// da espécie em `conteudo/PACOTE/sprites.json`.
//
//   node ferramentas/importar-folha.ts FOLHA.png --pacote vale --especie briserecs --altura 40 \
//     --anim parado=1:1-4 --anim andando=2:1-4 --anim ataque=3:1-4 --anim dano=4:6 --previa previa.png
//
// `--anim NOME=LINHA:COLUNAS` escolhe os quadros de cada animação (linhas e colunas contam de 1, como se vê na folha;
// colunas aceitam `1-4` e `1,3,5`). Sem `--anim`, só mostra a grade que achou. Outras opções: `--fps parado=4,andando=8`,
// `--olha esquerda` (o padrão é direita, como as folhas do GPT), `--cores 32`.
//
// A folha principal é a vista de lado. `--frente FOLHA.png` e `--costas FOLHA.png` juntam as vistas de frente e de
// costas, com o mesmo layout e as mesmas `--anim`, na mesma tira e na mesma escala (a da vista de lado).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { aplicarPaleta, alturaDo, fundoDa, ladoPara, mascaraDe, montarTira, paletaComum, quadrosDa, reduzir, type Caixa } from './folha.ts';
import { gravarPng, lerPng, type Imagem } from './png.ts';

const FPS_PADRAO: Record<string, number> = { parado: 4, andando: 8, ataque: 10, dano: 1 };
const RAIZ = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

function argumentos(): { folha: string; opcoes: Map<string, string[]> } {
  const args = process.argv.slice(2);
  const opcoes = new Map<string, string[]>();
  let folha = '';
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith('--')) opcoes.set(a.slice(2), [...(opcoes.get(a.slice(2)) ?? []), args[++i] ?? '']);
    else folha = a;
  }
  if (!folha) throw new Error('falta a folha: node ferramentas/importar-folha.ts FOLHA.png --pacote vale --especie ID ...');
  return { folha, opcoes };
}

/** `1-4` ou `1,3,5` (contando de 1) em índices contando de 0. */
function colunas(texto: string): number[] {
  return texto.split(',').flatMap((parte) => {
    const [a, b] = parte.split('-').map(Number);
    if (b === undefined) return [a! - 1];
    return Array.from({ length: b - a! + 1 }, (_, k) => a! - 1 + k);
  });
}

function previa(tira: Imagem, zoom: number): Imagem {
  const largura = tira.largura * zoom;
  const altura = tira.altura * zoom;
  const dados = new Uint8Array(largura * altura * 4);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = (Math.floor(y / zoom) * tira.largura + Math.floor(x / zoom)) * 4;
      // Chão de areia da arena atrás, para ver como fica no jogo.
      dados.set(tira.dados[i + 3] ? tira.dados.subarray(i, i + 4) : [217, 160, 102, 255], (y * largura + x) * 4);
    }
  }
  return { largura, altura, dados };
}

interface Folha {
  caminho: string;
  im: Imagem;
  m: Uint8Array;
  linhas: Caixa[][];
}

/** Lê a folha, acha o fundo e os quadros, e mostra a grade que achou. */
function lerFolha(caminho: string): Folha {
  const im = lerPng(readFileSync(caminho));
  const fundo = fundoDa(im);
  const m = mascaraDe(im, fundo);
  const linhas = quadrosDa(im, m);
  console.log(`${caminho}: ${im.largura}×${im.altura}, fundo rgb(${fundo.join(', ')}), ${linhas.length} linhas: ${linhas.map((l) => l.length).join(', ')} quadros`);
  return { caminho, im, m, linhas };
}

/** Quadros de cada animação pedida, na ordem em que vão para a tira. */
function animacoesDa(f: Folha, pedidas: string[]): { nome: string; caixas: Caixa[] }[] {
  return pedidas.map((p) => {
    const [nome, onde] = p.split('=') as [string, string];
    const [l, cs] = onde.split(':') as [string, string];
    const linha = f.linhas[Number(l) - 1];
    if (!linha) throw new Error(`${f.caminho}, ${nome}: a folha não tem a linha ${l}`);
    return {
      nome,
      caixas: colunas(cs).map((c) => {
        const caixa = linha[c];
        if (!caixa) throw new Error(`${f.caminho}, ${nome}: a linha ${l} não tem a coluna ${c + 1}`);
        return caixa;
      }),
    };
  });
}

const { folha, opcoes } = argumentos();
const um = (k: string) => opcoes.get(k)?.[0];
const lado = lerFolha(folha);
const extras = (['frente', 'costas'] as const).flatMap((vista) => {
  const caminho = um(vista);
  return caminho ? [{ vista, folha: lerFolha(caminho) }] : [];
});

const pedidas = opcoes.get('anim') ?? [];
if (!pedidas.length) process.exit(0);
const pacote = um('pacote') ?? 'vale';
const especie = um('especie');
const altura = Number(um('altura') ?? 40);
if (!especie) throw new Error('falta --especie');

const vistas = [{ vista: 'lado' as const, folha: lado }, ...extras].map((v) => ({ ...v, animacoes: animacoesDa(v.folha, pedidas) }));
const parado = vistas[0]!.animacoes.find((a) => a.nome === 'parado');
if (!parado) throw new Error('falta a animação "parado"');

// Uma escala para todas as folhas: a altura mediana dos quadros parados de lado vira a altura pedida.
const alturas = parado.caixas.map((c) => c.y1 - c.y0).sort((a, b) => a - b);
const escala = altura / alturas[Math.floor(alturas.length / 2)]!;
const reduzidos = vistas.flatMap((v) => v.animacoes.flatMap((a) => a.caixas.map((c) => reduzir(v.folha.im, v.folha.m, c, escala))));
const paleta = paletaComum(reduzidos, Number(um('cores') ?? 32));
const quadros = reduzidos.map((q) => aplicarPaleta(q, paleta));
const ladoQuadro = ladoPara(quadros);
const tira = montarTira(quadros, ladoQuadro);

const fps = new Map((um('fps') ?? '').split(',').filter(Boolean).map((x) => x.split('=') as [string, string]).map(([k, v]) => [k, Number(v)]));
let k = 0;
const animacoesDe = (lista: { nome: string; caixas: Caixa[] }[]) =>
  Object.fromEntries(lista.map((a) => [a.nome, { quadros: a.caixas.map(() => k++), fps: fps.get(a.nome) ?? FPS_PADRAO[a.nome] ?? 6 }]));
const entrada: {
  imagem: string;
  quadro: number;
  pe: number;
  altura: number;
  olhaPara: string;
  animacoes: Record<string, { quadros: number[]; fps: number }>;
  vistas?: Record<string, Record<string, { quadros: number[]; fps: number }>>;
} = {
  imagem: `sprites/${especie}.png`,
  quadro: ladoQuadro,
  pe: ladoQuadro - 2,
  altura: alturaDo(quadros[0]!),
  olhaPara: um('olha') ?? 'direita',
  animacoes: animacoesDe(vistas[0]!.animacoes),
};
if (extras.length) entrada.vistas = Object.fromEntries(vistas.slice(1).map((v) => [v.vista, animacoesDe(v.animacoes)]));

const pasta = join(RAIZ, 'conteudo', pacote);
mkdirSync(join(pasta, 'sprites'), { recursive: true });
writeFileSync(join(pasta, entrada.imagem), gravarPng(tira));
const caminhoJson = join(pasta, 'sprites.json');
const sprites = JSON.parse(readFileSync(caminhoJson, 'utf8')) as Record<string, unknown>;
sprites[especie] = entrada;
writeFileSync(caminhoJson, JSON.stringify(sprites, null, 2) + '\n');
const arquivoPrevia = um('previa');
if (arquivoPrevia) writeFileSync(arquivoPrevia, gravarPng(previa(tira, 4)));
console.log(`${especie}: ${quadros.length} quadros de ${ladoQuadro}×${ladoQuadro}, altura ${entrada.altura}, ${paleta.length} cores → ${join('conteudo', pacote, entrada.imagem)}`);
const mostrar = (vista: string, animacoes: Record<string, { quadros: number[]; fps: number }>) => {
  console.log(`  ${vista}:`);
  for (const [nome, a] of Object.entries(animacoes)) console.log(`    ${nome}: quadros ${a.quadros.join(', ')} a ${a.fps} por segundo`);
};
mostrar('lado', entrada.animacoes);
for (const [vista, animacoes] of Object.entries(entrada.vistas ?? {})) mostrar(vista, animacoes);
