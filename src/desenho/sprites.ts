// Sprites em pixel vindos de `sprites.json`: medidas, canvas em cache e retratos.

import type { Conteudo, Sprite } from '../conteudo/esquema';

export interface SpriteMedido extends Sprite {
  /** Lado do quadrado em pixels. */
  n: number;
  /** Altura ocupada (da primeira à última linha com pixel). */
  h: number;
  topo: number;
  /** Última linha com pixel: onde ficam os pés. */
  pe: number;
  /** Centro horizontal do desenho. */
  cx: number;
}

const medidos = new WeakMap<Conteudo, Map<string, SpriteMedido>>();
const canvases = new WeakMap<Conteudo, Map<string, HTMLCanvasElement>>();

function porConteudo<T>(mapa: WeakMap<Conteudo, Map<string, T>>, c: Conteudo): Map<string, T> {
  let m = mapa.get(c);
  if (!m) mapa.set(c, (m = new Map()));
  return m;
}

/** Bolinha na cor do tipo para espécies que ainda não têm sprite. */
function substituto(c: Conteudo, especie: string): Sprite {
  const tipo = c.especies[especie]?.tipos[0];
  const cor = (tipo && c.tipos[tipo]?.cor) || '#94b0c2';
  const pixels: string[] = [];
  for (let y = 0; y < 24; y++) {
    let linha = '';
    for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x - 11.5, y - 15.5);
      linha += d < 7 ? '2' : d <= 8 ? '1' : '0';
    }
    pixels.push(linha);
  }
  return { paleta: [null, '#1a1c2c', cor], pixels };
}

export function spriteDe(c: Conteudo, especie: string): SpriteMedido {
  const cache = porConteudo(medidos, c);
  const pronto = cache.get(especie);
  if (pronto) return pronto;
  const s = c.sprites[especie] ?? substituto(c, especie);
  let primeira = -1;
  let ultima = -1;
  let esq = 99;
  let dir = -1;
  s.pixels.forEach((linha, i) => {
    if (/[^0]/.test(linha)) {
      if (primeira < 0) primeira = i;
      ultima = i;
    }
    for (let j = 0; j < linha.length; j++) {
      if (linha[j] !== '0') {
        esq = Math.min(esq, j);
        dir = Math.max(dir, j);
      }
    }
  });
  const medido: SpriteMedido = { ...s, n: s.pixels.length, h: ultima - primeira + 1, topo: primeira, pe: ultima, cx: (esq + dir + 1) / 2 };
  cache.set(especie, medido);
  return medido;
}

/** Canvas do sprite, virado para a direita ou não; com `cor`, vira silhueta dessa cor (flash, desmaio). */
export function canvasDoSprite(c: Conteudo, especie: string, paraDireita: boolean, cor: string | null): HTMLCanvasElement {
  const cache = porConteudo(canvases, c);
  const chave = especie + (paraDireita ? 'R' : 'L') + (cor ?? '');
  const pronto = cache.get(chave);
  if (pronto) return pronto;
  const s = spriteDe(c, especie);
  const el = document.createElement('canvas');
  el.width = s.n;
  el.height = s.n;
  const x = el.getContext('2d')!;
  for (let r = 0; r < s.n; r++) {
    for (let k = 0; k < s.n; k++) {
      const ci = parseInt(s.pixels[r]![k]!, 16);
      if (!ci) continue;
      x.fillStyle = cor ?? s.paleta[ci] ?? '#f4f4f4';
      x.fillRect(paraDireita ? s.n - 1 - k : k, r, 1, 1);
    }
  }
  cache.set(chave, el);
  return el;
}

/** Retrato centralizado num canvas quadrado (24 ou 26 px). Desmaiado vira silhueta escura. */
export function pintarRetrato(el: HTMLCanvasElement, c: Conteudo, especie: string, paraDireita: boolean, desmaiado: boolean): void {
  const x = el.getContext('2d');
  if (!x) return;
  const S = el.width;
  x.imageSmoothingEnabled = false;
  x.clearRect(0, 0, S, S);
  const s = spriteDe(c, especie);
  const centro = paraDireita ? s.n - s.cx : s.cx;
  const img = canvasDoSprite(c, especie, paraDireita, desmaiado ? '#333c57' : null);
  x.drawImage(img, Math.round(S / 2 - centro), Math.round((S - s.h) / 2) - s.topo);
}
