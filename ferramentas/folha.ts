// Importação de folhas de sprites geradas por IA (GPT): acha o fundo e os quadros, reduz cada quadro para o tamanho
// do jogo com uma escala só para a folha inteira, reduz as cores a uma paleta comum, alinha os pés e monta a tira que
// o jogo lê (`sprites.json` + PNG). As folhas não têm grade de pixel exata nem quadros em posição fixa; por isso os
// quadros são achados pelas faixas e colunas vazias, e os encostados são cortados no vale de densidade.

import type { Imagem } from './png';

export interface Caixa {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Cor mais comum na borda da folha: o fundo. */
export function fundoDa(im: Imagem): [number, number, number] {
  const conta = new Map<number, number>();
  const somar = (x: number, y: number) => {
    const i = (y * im.largura + x) * 4;
    const k = (im.dados[i]! << 16) | (im.dados[i + 1]! << 8) | im.dados[i + 2]!;
    conta.set(k, (conta.get(k) ?? 0) + 1);
  };
  for (let x = 0; x < im.largura; x += 3) for (const y of [0, 2, im.altura - 3, im.altura - 1]) somar(x, y);
  for (let y = 0; y < im.altura; y += 3) for (const x of [0, 2, im.largura - 3, im.largura - 1]) somar(x, y);
  const [k] = [...conta].sort((a, b) => b[1] - a[1])[0]!;
  return [k >> 16, (k >> 8) & 255, k & 255];
}

/** Máscara do que não é fundo (a soma das diferenças de cor passa do limiar). */
export function mascaraDe(im: Imagem, fundo: [number, number, number], limiar = 48): Uint8Array {
  const m = new Uint8Array(im.largura * im.altura);
  for (let i = 0; i < m.length; i++) {
    const d = Math.abs(im.dados[i * 4]! - fundo[0]) + Math.abs(im.dados[i * 4 + 1]! - fundo[1]) + Math.abs(im.dados[i * 4 + 2]! - fundo[2]);
    m[i] = im.dados[i * 4 + 3]! > 127 && d > limiar ? 1 : 0;
  }
  return m;
}

/** Trechos com algo, juntando buracos de até `folga`. */
function trechos(cheios: boolean[], folga: number): [number, number][] {
  const saida: [number, number][] = [];
  let ini = -1;
  let fim = 0;
  let vazio = 0;
  cheios.forEach((v, i) => {
    if (v) {
      if (ini < 0) ini = i;
      fim = i;
      vazio = 0;
    } else if (ini >= 0 && ++vazio > folga) {
      saida.push([ini, fim]);
      ini = -1;
    }
  });
  if (ini >= 0) saida.push([ini, fim]);
  return saida;
}

const mediana = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]!;

/**
 * Trecho bem maior que o típico (quadros encostados) vira `n` trechos, cortados no vale de densidade perto de k·L/n.
 * Só corta onde há vale de verdade: um bicho largo com efeito no ataque tem corpo no meio, e fica inteiro.
 */
function partir(lista: [number, number][], densidade: number[], tipico: number): [number, number][] {
  const saida: [number, number][] = [];
  for (const [a, b] of lista) {
    const L = b - a;
    const n = Math.round(L / tipico);
    if (n < 2 || L < 1.5 * tipico) {
      saida.push([a, b]);
      continue;
    }
    const cheia = mediana(densidade.slice(a, b + 1).filter((v) => v > 0));
    const cortes = [a];
    for (let k = 1; k < n; k++) {
      const alvo = a + (k * L) / n;
      let melhor = Math.round(alvo);
      for (let i = Math.round(alvo - tipico * 0.3); i <= Math.round(alvo + tipico * 0.3); i++) if (densidade[i]! < densidade[melhor]!) melhor = i;
      if (densidade[melhor]! <= cheia * 0.25) cortes.push(melhor);
    }
    cortes.push(b);
    for (let i = 0; i < cortes.length - 1; i++) saida.push([cortes[i]!, cortes[i + 1]!]);
  }
  return saida;
}

/** Pedaço estreito (o efeito solto de um ataque, um respingo) junta com o vizinho mais perto. */
function juntarMiudos(lista: [number, number][], tipico: number): [number, number][] {
  const saida = lista.map((t) => [...t] as [number, number]);
  for (let i = 0; i < saida.length; ) {
    const [a, b] = saida[i]!;
    if (b - a >= tipico * 0.45 || saida.length === 1) {
      i++;
      continue;
    }
    const antes = i > 0 ? a - saida[i - 1]![1] : Infinity;
    const depois = i < saida.length - 1 ? saida[i + 1]![0] - b : Infinity;
    if (antes <= depois) saida[i - 1]![1] = b;
    else saida[i + 1]![0] = a;
    saida.splice(i, 1);
  }
  return saida;
}

/** Quadros da folha, linha por linha, da esquerda para a direita. */
export function quadrosDa(im: Imagem, m: Uint8Array): Caixa[][] {
  const { largura: W, altura: H } = im;
  const porLinha = Array.from({ length: H }, (_, y) => {
    let s = 0;
    for (let x = 0; x < W; x++) s += m[y * W + x]!;
    return s;
  });
  let faixas = trechos(
    porLinha.map((v) => v > 3),
    2,
  ).filter(([a, b]) => b - a > 30);
  faixas = partir(faixas, porLinha, mediana(faixas.map(([a, b]) => b - a)));
  const colunas = faixas.map(([a, b]) => {
    const dens = Array.from({ length: W }, (_, x) => {
      let s = 0;
      for (let y = a; y <= b; y++) s += m[y * W + x]!;
      return s;
    });
    return {
      a,
      b,
      dens,
      cs: trechos(
        dens.map((v) => v > 1),
        3,
      ).filter(([x0, x1]) => x1 - x0 > 12),
    };
  });
  const tipica = mediana(colunas.flatMap((c) => c.cs.map(([x0, x1]) => x1 - x0)));
  return colunas.map(({ a, b, dens, cs }) =>
    partir(juntarMiudos(cs, tipica), dens, tipica).map(([x0, x1]) => {
      // Aperta a caixa na altura do que existe dentro da coluna.
      let y0 = b;
      let y1 = a;
      for (let y = a; y <= b; y++) {
        for (let x = x0; x <= x1; x++) {
          if (!m[y * W + x]) continue;
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
          break;
        }
      }
      return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
    }),
  );
}

/**
 * Reduz a caixa por `escala` com média de área: cada pixel novo é a cor média dos pixels do bicho que caem nele, e
 * fica opaco se o bicho cobre pelo menos metade dele.
 */
export function reduzir(im: Imagem, m: Uint8Array, c: Caixa, escala: number): Imagem {
  const largura = Math.max(1, Math.round((c.x1 - c.x0) * escala));
  const altura = Math.max(1, Math.round((c.y1 - c.y0) * escala));
  const dados = new Uint8Array(largura * altura * 4);
  for (let j = 0; j < altura; j++) {
    for (let i = 0; i < largura; i++) {
      const sx0 = Math.floor(c.x0 + i / escala);
      const sy0 = Math.floor(c.y0 + j / escala);
      const sx1 = Math.max(sx0 + 1, Math.floor(c.x0 + (i + 1) / escala));
      const sy1 = Math.max(sy0 + 1, Math.floor(c.y0 + (j + 1) / escala));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      let t = 0;
      for (let y = sy0; y < sy1; y++) {
        for (let x = sx0; x < sx1; x++) {
          t++;
          const k = y * im.largura + x;
          if (!m[k]) continue;
          r += im.dados[k * 4]!;
          g += im.dados[k * 4 + 1]!;
          b += im.dados[k * 4 + 2]!;
          n++;
        }
      }
      if (t && n / t >= 0.5) dados.set([Math.round(r / n), Math.round(g / n), Math.round(b / n), 255], (j * largura + i) * 4);
    }
  }
  return { largura, altura, dados };
}

/** Distância de cor com peso perceptivo (o verde pesa mais). */
const distancia = (a: number[], b: number[]) => 2 * (a[0]! - b[0]!) ** 2 + 4 * (a[1]! - b[1]!) ** 2 + 3 * (a[2]! - b[2]!) ** 2;

/**
 * Paleta comum de até `n` cores para todos os quadros. Começa pelas cores mais distantes entre si (assim um olho
 * amarelo pequeno não some no meio de muito azul) e acerta com algumas rodadas de média ponderada.
 */
export function paletaComum(quadros: Imagem[], n: number): number[][] {
  const conta = new Map<number, number>();
  for (const q of quadros) {
    for (let i = 0; i < q.largura * q.altura; i++) {
      if (!q.dados[i * 4 + 3]) continue;
      const k = (q.dados[i * 4]! << 16) | (q.dados[i * 4 + 1]! << 8) | q.dados[i * 4 + 2]!;
      conta.set(k, (conta.get(k) ?? 0) + 1);
    }
  }
  const cores = [...conta].map(([k, v]) => ({ c: [k >> 16, (k >> 8) & 255, k & 255], peso: Math.sqrt(v) }));
  if (cores.length <= n) return cores.map((x) => x.c);
  cores.sort((a, b) => b.peso - a.peso);
  const centros = [cores[0]!.c];
  const perto = cores.map((x) => distancia(x.c, centros[0]!));
  while (centros.length < n) {
    let melhor = 0;
    for (let i = 1; i < cores.length; i++) if (perto[i]! * cores[i]!.peso > perto[melhor]! * cores[melhor]!.peso) melhor = i;
    centros.push(cores[melhor]!.c);
    cores.forEach((x, i) => (perto[i] = Math.min(perto[i]!, distancia(x.c, cores[melhor]!.c))));
  }
  for (let rodada = 0; rodada < 8; rodada++) {
    const soma = centros.map(() => [0, 0, 0, 0]);
    for (const x of cores) {
      let k = 0;
      for (let j = 1; j < centros.length; j++) if (distancia(x.c, centros[j]!) < distancia(x.c, centros[k]!)) k = j;
      const s = soma[k]!;
      s[0]! += x.c[0]! * x.peso;
      s[1]! += x.c[1]! * x.peso;
      s[2]! += x.c[2]! * x.peso;
      s[3]! += x.peso;
    }
    soma.forEach((s, j) => {
      if (s[3]) centros[j] = [Math.round(s[0]! / s[3]), Math.round(s[1]! / s[3]), Math.round(s[2]! / s[3])];
    });
  }
  return centros;
}

/** Troca cada cor do quadro pela mais perto da paleta. */
export function aplicarPaleta(q: Imagem, paleta: number[][]): Imagem {
  const dados = new Uint8Array(q.dados);
  for (let i = 0; i < q.largura * q.altura; i++) {
    if (!dados[i * 4 + 3]) continue;
    const c = [dados[i * 4]!, dados[i * 4 + 1]!, dados[i * 4 + 2]!];
    let melhor = paleta[0]!;
    for (const p of paleta) if (distancia(c, p) < distancia(c, melhor)) melhor = p;
    dados.set(melhor, i * 4);
  }
  return { ...q, dados };
}

/** Linha dos pés (último pixel opaco) e o centro dos pés (média dos pixels na faixa de baixo). */
export function pesDo(q: Imagem): { base: number; centro: number } {
  let base = q.altura - 1;
  achou: for (let y = q.altura - 1; y >= 0; y--) for (let x = 0; x < q.largura; x++) if (q.dados[(y * q.largura + x) * 4 + 3]) {
    base = y;
    break achou;
  }
  let soma = 0;
  let n = 0;
  for (let y = Math.max(0, base - Math.max(2, Math.floor(q.altura / 5))); y <= base; y++) {
    for (let x = 0; x < q.largura; x++) {
      if (!q.dados[(y * q.largura + x) * 4 + 3]) continue;
      soma += x;
      n++;
    }
  }
  return { base, centro: n ? soma / n : q.largura / 2 };
}

/** Lado do quadrado que cabe todos os quadros com os pés na mesma linha e o centro dos pés no meio (múltiplo de 8). */
export function ladoPara(quadros: Imagem[]): number {
  let lado = 8;
  for (const q of quadros) {
    const { base, centro } = pesDo(q);
    lado = Math.max(lado, 2 * Math.ceil(Math.max(centro, q.largura - centro)) + 2, base + 4);
  }
  return Math.ceil(lado / 8) * 8;
}

/** Tira de quadros de `lado` × `lado`, com os pés na linha `lado - 2` e o centro dos pés no meio. */
export function montarTira(quadros: Imagem[], lado: number): Imagem {
  const largura = lado * quadros.length;
  const dados = new Uint8Array(largura * lado * 4);
  quadros.forEach((q, k) => {
    const { base, centro } = pesDo(q);
    const dx = k * lado + Math.round(lado / 2 - centro);
    const dy = lado - 2 - base;
    for (let y = 0; y < q.altura; y++) {
      for (let x = 0; x < q.largura; x++) {
        const i = (y * q.largura + x) * 4;
        if (!q.dados[i + 3]) continue;
        const tx = dx + x;
        const ty = dy + y;
        if (tx < k * lado || tx >= (k + 1) * lado || ty < 0 || ty >= lado) continue;
        dados.set(q.dados.subarray(i, i + 4), (ty * largura + tx) * 4);
      }
    }
  });
  return { largura, altura: lado, dados };
}

/** Altura ocupada (da primeira à última linha com pixel) de um quadro. */
export function alturaDo(q: Imagem): number {
  let topo = -1;
  let fim = -1;
  for (let y = 0; y < q.altura; y++) {
    for (let x = 0; x < q.largura; x++) {
      if (!q.dados[(y * q.largura + x) * 4 + 3]) continue;
      if (topo < 0) topo = y;
      fim = y;
      break;
    }
  }
  return topo < 0 ? 0 : fim - topo + 1;
}
