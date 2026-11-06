// Sprites de `sprites.json`: medidas, canvas em cache e retratos. Um sprite é uma grade de pixels (um quadro só, olhando
// para a esquerda) ou uma tira em imagem com animações (parado, andando, ataque, dano), de lado e, se houver, de frente
// e de costas. As tiras precisam estar carregadas antes do primeiro desenho: `carregarSprites` no começo do app.

import type { Conteudo, SpriteImagem, SpritePixels, VISTAS_SPRITE } from '../conteudo/esquema';

export type Vista = (typeof VISTAS_SPRITE)[number];

export interface SpriteMedido {
  /** Lado do quadrado em pixels. */
  n: number;
  /** Altura ocupada (da primeira à última linha com pixel). */
  h: number;
  topo: number;
  /** Última linha com pixel: onde ficam os pés. */
  pe: number;
  /** Centro horizontal do desenho, olhando para a esquerda. */
  cx: number;
  /** Animações da tira (vista de lado); null num sprite de grade de pixels (um quadro só). */
  animacoes: SpriteImagem['animacoes'] | null;
  /** Animações das vistas de frente e de costas, se a tira as tiver. */
  vistas: NonNullable<SpriteImagem['vistas']> | null;
}

/**
 * Andando a mais de 45° da horizontal (|vy| > |vx|) a criatura fica de frente ou de costas, e volta para o lado só
 * abaixo de ~35° (|vy| < 0,7·|vx|): a folga evita a vista piscar numa diagonal.
 */
const ENTRA_VERTICAL = 1.0;
const SAI_VERTICAL = 0.7;
/** Abaixo desta velocidade (|vx| + |vy|, unidades/s) a criatura conta como parada: o mesmo limiar da animação de andar. */
export const ANDANDO = 6;

/**
 * Vista para desenhar uma criatura que anda com velocidade (vx, vy), no plano da arena (y cresce para a frente, em
 * direção à câmera): de costas subindo para o fundo, de frente descendo, de lado na horizontal. Parada, ou com a
 * velocidade zerada por quem chama (golpe em andamento, empurrão), fica de lado, virada para o rival. `atual` é a
 * vista do quadro anterior, para a histerese.
 */
export function vistaPara(vx: number, vy: number, atual: Vista): Vista {
  const avx = Math.abs(vx);
  const avy = Math.abs(vy);
  if (avx + avy <= ANDANDO) return 'lado';
  const vertical: Vista = vy > 0 ? 'frente' : 'costas';
  if (avy > avx * ENTRA_VERTICAL) return vertical;
  if (avy < avx * SAI_VERTICAL) return 'lado';
  return atual === vertical ? atual : 'lado';
}

const eImagem = (s: SpritePixels | SpriteImagem): s is SpriteImagem => 'imagem' in s;

const medidos = new WeakMap<Conteudo, Map<string, SpriteMedido>>();
const canvases = new WeakMap<Conteudo, Map<string, HTMLCanvasElement>>();
/** Imagens das tiras, pela URL. */
const imagens = new Map<string, HTMLImageElement>();

function porConteudo<T>(mapa: WeakMap<Conteudo, Map<string, T>>, c: Conteudo): Map<string, T> {
  let m = mapa.get(c);
  if (!m) mapa.set(c, (m = new Map()));
  return m;
}

/** Carrega as tiras de sprite do pacote; resolve quando todas acabaram (as que falharem viram o substituto redondo). */
export function carregarSprites(c: Conteudo): Promise<void> {
  const urls = Object.values(c.sprites).flatMap((s) => (eImagem(s) ? [s.imagem] : []));
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((pronto) => {
          const ja = imagens.get(url);
          if (ja?.complete) return pronto();
          const img = ja ?? new Image();
          img.addEventListener('load', () => pronto(), { once: true });
          img.addEventListener('error', () => pronto(), { once: true });
          if (!ja) {
            img.src = url;
            imagens.set(url, img);
          }
        }),
    ),
  ).then(() => undefined);
}

/** A tira, se já carregou. */
function tiraDe(s: SpriteImagem): HTMLImageElement | null {
  const img = imagens.get(s.imagem);
  return img?.complete && img.naturalWidth > 0 ? img : null;
}

/** Bolinha na cor do tipo para espécies que ainda não têm sprite. */
function substituto(c: Conteudo, especie: string): SpritePixels {
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

/** O sprite da espécie; uma tira que não carregou vira o substituto. */
function brutoDe(c: Conteudo, especie: string): SpritePixels | SpriteImagem {
  const s = c.sprites[especie];
  if (!s || (eImagem(s) && imagens.has(s.imagem) && !tiraDe(s) && imagens.get(s.imagem)!.complete)) return substituto(c, especie);
  return s;
}

export function spriteDe(c: Conteudo, especie: string): SpriteMedido {
  const cache = porConteudo(medidos, c);
  const pronto = cache.get(especie);
  if (pronto) return pronto;
  const s = brutoDe(c, especie);
  if (eImagem(s)) {
    // Na tira, os pés ficam na linha `pe`, no meio do quadro.
    const medido: SpriteMedido = { n: s.quadro, h: s.altura, topo: s.pe - s.altura + 1, pe: s.pe, cx: s.quadro / 2, animacoes: s.animacoes, vistas: s.vistas ?? null };
    cache.set(especie, medido);
    return medido;
  }
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
  const medido: SpriteMedido = { n: s.pixels.length, h: ultima - primeira + 1, topo: primeira, pe: ultima, cx: (esq + dir + 1) / 2, animacoes: null, vistas: null };
  cache.set(especie, medido);
  return medido;
}

/**
 * Canvas do sprite (o `quadro` da tira, num sprite em imagem), virado para a direita ou não; com `cor`, vira silhueta
 * dessa cor (flash, desmaio). Um quadro de frente ou de costas (`vista`) não é espelhado: o desenho é simétrico.
 */
export function canvasDoSprite(c: Conteudo, especie: string, paraDireita: boolean, cor: string | null, quadro = 0, vista: Vista = 'lado'): HTMLCanvasElement {
  const cache = porConteudo(canvases, c);
  const s = brutoDe(c, especie);
  // A tira olha para `olhaPara`; vira quando o pedido é o outro lado. A grade de pixels olha para a esquerda.
  const vira = eImagem(s) ? vista === 'lado' && (s.olhaPara === 'direita') !== paraDireita : paraDireita;
  const chave = especie + (vira ? 'V' : 'N') + (cor ?? '') + '#' + quadro;
  const pronto = cache.get(chave);
  if (pronto) return pronto;
  const el = document.createElement('canvas');
  const x = el.getContext('2d')!;
  if (eImagem(s)) {
    el.width = el.height = s.quadro;
    const tira = tiraDe(s);
    if (!tira) return el; // ainda carregando: vazio, sem guardar
    x.imageSmoothingEnabled = false;
    if (vira) {
      x.translate(s.quadro, 0);
      x.scale(-1, 1);
    }
    x.drawImage(tira, quadro * s.quadro, 0, s.quadro, s.quadro, 0, 0, s.quadro, s.quadro);
    if (cor) {
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = cor;
      x.fillRect(0, 0, s.quadro, s.quadro);
    }
    cache.set(chave, el);
    return el;
  }
  const n = s.pixels.length;
  el.width = n;
  el.height = n;
  for (let r = 0; r < n; r++) {
    for (let k = 0; k < n; k++) {
      const ci = parseInt(s.pixels[r]![k]!, 16);
      if (!ci) continue;
      x.fillStyle = cor ?? s.paleta[ci] ?? '#f4f4f4';
      x.fillRect(vira ? n - 1 - k : k, r, 1, 1);
    }
  }
  cache.set(chave, el);
  return el;
}

/** Caixa do que tem pixel no canvas. */
function caixaDe(el: HTMLCanvasElement): { x0: number; y0: number; x1: number; y1: number } | null {
  const d = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data;
  let x0 = el.width;
  let y0 = el.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < el.height; y++) {
    for (let x = 0; x < el.width; x++) {
      if (!d[(y * el.width + x) * 4 + 3]) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

/**
 * Retrato centralizado num canvas quadrado de `tam` px (24 ou 26), mostrado em dobro. Um sprite em imagem é desenhado no
 * dobro da resolução (cada pixel dele vira um pixel da tela), centrado pelo que tem pixel no primeiro quadro. Desmaiado
 * vira silhueta escura.
 */
export function pintarRetrato(el: HTMLCanvasElement, c: Conteudo, especie: string, paraDireita: boolean, desmaiado: boolean, tam: number): void {
  const s = spriteDe(c, especie);
  const img = canvasDoSprite(c, especie, paraDireita, desmaiado ? '#333c57' : null, s.animacoes?.parado.quadros[0] ?? 0);
  const S = s.animacoes ? tam * 2 : tam;
  el.width = el.height = S;
  const x = el.getContext('2d');
  if (!x) return;
  x.imageSmoothingEnabled = false;
  x.clearRect(0, 0, S, S);
  if (s.animacoes) {
    const cx = caixaDe(img);
    if (cx) x.drawImage(img, Math.round(S / 2 - (cx.x0 + cx.x1) / 2), Math.round((S - (cx.y1 - cx.y0)) / 2) - cx.y0);
    return;
  }
  const centro = paraDireita ? s.n - s.cx : s.cx;
  x.drawImage(img, Math.round(S / 2 - centro), Math.round((S - s.h) / 2) - s.topo);
}

/** O que a criatura está fazendo, para escolher o quadro da tira. */
export interface Momento {
  /** Relógio da animação, em segundos. */
  tempo: number;
  /** Carregando um golpe: fica no primeiro quadro do ataque. */
  conjurando: boolean;
  /** Segundos desde que o último golpe saiu: o ataque toca uma vez a partir dele. */
  desdeOGolpe: number;
  ferido: boolean;
  andando: boolean;
}

function emLaco(a: { quadros: number[]; fps: number }, tempo: number): number {
  return a.quadros[Math.floor(tempo * a.fps) % a.quadros.length]!;
}

/**
 * Quadro da tira para o momento: dano, ataque, andando ou parado, nessa ordem, na `vista` pedida (uma vista que a tira
 * não tem cai na de lado). Sem tira, 0.
 */
export function quadroDoMomento(s: SpriteMedido, m: Momento, vista: Vista = 'lado'): number {
  const a = (vista === 'lado' ? null : s.vistas?.[vista]) ?? s.animacoes;
  if (!a) return 0;
  if (m.ferido && a.dano) return emLaco(a.dano, m.tempo);
  if (a.ataque) {
    if (m.conjurando) return a.ataque.quadros[0]!;
    const i = Math.floor(m.desdeOGolpe * a.ataque.fps);
    if (i >= 0 && i < a.ataque.quadros.length) return a.ataque.quadros[i]!;
  }
  if (m.andando && a.andando) return emLaco(a.andando, m.tempo);
  return emLaco(a.parado, m.tempo);
}
