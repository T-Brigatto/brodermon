// Efeitos especiais em pixel, no espírito dos FX de mesa virtual: animações desenhadas quadro a
// quadro (impacto em estrela, bola de fogo, onda de choque, feixe, raio, energia de conjuração,
// brilho e rastro dos projéteis) e partículas com o jeito de cada elemento (brasa sobe, gota cai,
// floco cintila…). Só aparecem nos tipos que têm `fx` em tipos.json: a Arena original não tem, e
// fica igual. Tudo em coordenadas do cenário; é só apresentação, então pode sortear à vontade.

import type { Conteudo, EstiloFx } from '../conteudo/esquema';
import { acertaForma, type Geometria, type Ponto, type Posicao } from '../nucleo';
import { projetar } from './arena';

const BRANCO = '#f4f4f4';

type Forma = 'ponto' | 'cruz' | 'risco' | 'faisca' | 'trama';
type Jeito = EstiloFx | 'nevoa';

interface Comportamento {
  /** Velocidade de saída (cenário/s), mínima e máxima. */
  velocidade: [number, number];
  vida: [number, number];
  tamanhos: number[];
  /** Empurrão vertical na saída (negativo = para cima) e gravidade (negativa = sobe). */
  impulso: number;
  gravidade: number;
  /** Quanto da velocidade sobra a cada 1/60 s. */
  arrasto: number;
  forma: Forma;
  /** Balanço de lado, em pixels por quadro. */
  oscila?: number;
  /** Giro da velocidade, em rad/s (redemoinho). */
  gira?: number;
  /** Tremida da direção (faísca em zigue-zague). */
  treme?: boolean;
  /** Cintila: de vez em quando, a cor mais clara. */
  pisca?: boolean;
}

const JEITOS: Record<Jeito, Comportamento> = {
  brasa: { velocidade: [8, 26], vida: [0.35, 0.75], tamanhos: [1, 2, 2], impulso: -20, gravidade: -45, arrasto: 0.95, forma: 'ponto', oscila: 0.25 },
  estouro: { velocidade: [45, 100], vida: [0.25, 0.5], tamanhos: [2, 2, 3], impulso: -10, gravidade: 60, arrasto: 0.86, forma: 'ponto' },
  gota: { velocidade: [25, 55], vida: [0.35, 0.65], tamanhos: [1, 2], impulso: -45, gravidade: 240, arrasto: 0.99, forma: 'ponto' },
  floco: { velocidade: [6, 18], vida: [0.6, 1.1], tamanhos: [2], impulso: -4, gravidade: 12, arrasto: 0.96, forma: 'cruz', oscila: 0.35, pisca: true },
  redemoinho: { velocidade: [20, 40], vida: [0.35, 0.7], tamanhos: [1], impulso: 0, gravidade: 0, arrasto: 0.97, forma: 'risco', gira: 9 },
  faisca: { velocidade: [60, 120], vida: [0.08, 0.2], tamanhos: [1], impulso: 0, gravidade: 0, arrasto: 0.95, forma: 'faisca', treme: true },
  poeira: { velocidade: [10, 28], vida: [0.5, 0.9], tamanhos: [3], impulso: -8, gravidade: -4, arrasto: 0.9, forma: 'trama' },
  estilhaco: { velocidade: [40, 85], vida: [0.35, 0.6], tamanhos: [1, 2], impulso: -35, gravidade: 200, arrasto: 0.98, forma: 'risco', pisca: true },
  folha: { velocidade: [10, 26], vida: [0.7, 1.1], tamanhos: [2], impulso: -12, gravidade: 28, arrasto: 0.95, forma: 'risco', oscila: 0.5 },
  estrela: { velocidade: [8, 22], vida: [0.5, 0.9], tamanhos: [2], impulso: 0, gravidade: 0, arrasto: 0.92, forma: 'cruz', pisca: true },
  garra: { velocidade: [35, 75], vida: [0.25, 0.45], tamanhos: [2], impulso: -12, gravidade: 140, arrasto: 0.95, forma: 'risco' },
  // Fumaça das névoas e dos estouros: lufadas lentas.
  nevoa: { velocidade: [3, 8], vida: [0.9, 1.6], tamanhos: [3], impulso: -5, gravidade: -2, arrasto: 0.99, forma: 'trama' },
};

interface Particula {
  x: number;
  y: number;
  /** Onde estava no quadro anterior (a faísca risca daqui até a posição). */
  px: number;
  py: number;
  vx: number;
  vy: number;
  vida: number;
  total: number;
  jeito: Jeito;
  cores: string[];
  tam: number;
  fase: number;
}

/** Animação desenhada quadro a quadro; `t` corre de 0 a `dur`. */
type Anim = { t: number; dur: number; cores: string[] } & (
  | { tipo: 'impacto'; x: number; y: number; forte: boolean }
  | { tipo: 'estouro'; x: number; y: number; raio: number }
  | { tipo: 'nova'; x: number; y: number; de: number; ate: number }
  | { tipo: 'feixe'; a: Ponto; b: Ponto }
  | { tipo: 'raio'; a: Ponto; b: Ponto; pontos: Ponto[]; galhos: Ponto[][]; troca: number }
);

/** A animação sem os campos de tempo e cor, variante por variante. */
type NovaAnim<T = Anim> = T extends unknown ? Omit<T, 't' | 'dur' | 'cores'> : never;

const MAXIMO = 900;
const sorte = Math.random;
const entre = ([a, b]: [number, number]) => a + sorte() * (b - a);
/** Cores do efeito: a mais escura, a do meio e a mais clara. */
const tons = (c: string[]) => ({ escura: c[0]!, media: c[Math.floor((c.length - 1) / 2)]!, clara: c[c.length - 1]! });

export class Fx {
  particulas: Particula[] = [];
  anims: Anim[] = [];
  private t = 0;

  constructor(private readonly c: Conteudo) {}

  /** O efeito do tipo, ou null (sem efeito). */
  de(tipo: string): { estilo: EstiloFx; cores: string[] } | null {
    return this.c.tipos[tipo]?.fx ?? null;
  }

  limpar(): void {
    this.particulas = [];
    this.anims = [];
  }

  // ---------- Partículas ----------

  /**
   * Uma partícula do tipo num ponto do cenário. `forca` escala a velocidade de saída (0 = só a base);
   * `vx`/`vy` somam uma velocidade base; `nevoa` usa a lufada de fumaça com as cores do tipo.
   */
  particula(tipo: string, x: number, y: number, op: { vx?: number; vy?: number; forca?: number; nevoa?: boolean } = {}): void {
    const fx = this.de(tipo);
    if (!fx) return;
    const jeito: Jeito = op.nevoa ? 'nevoa' : fx.estilo;
    const j = JEITOS[jeito];
    const a = sorte() * Math.PI * 2;
    const forca = op.forca ?? 1;
    const v = entre(j.velocidade) * forca;
    const vida = entre(j.vida);
    if (this.particulas.length >= MAXIMO) this.particulas.shift();
    this.particulas.push({
      x,
      y,
      px: x,
      py: y,
      vx: (op.vx ?? 0) + Math.cos(a) * v,
      vy: (op.vy ?? 0) + Math.sin(a) * v + j.impulso * forca,
      vida,
      total: vida,
      jeito,
      cores: fx.cores,
      tam: j.tamanhos[Math.floor(sorte() * j.tamanhos.length)]!,
      fase: sorte() * Math.PI * 2,
    });
  }

  /** `n` partículas saindo de um ponto do cenário. */
  explosao(tipo: string, x: number, y: number, n: number, forca = 1): void {
    for (let i = 0; i < n; i++) this.particula(tipo, x, y, { forca });
  }

  /** Ponto sorteado dentro de uma forma no chão (ou null, se não achar). */
  pontoNa(g: Geometria, z: Posicao): Ponto | null {
    const r = g.forma === 'area' ? g.raio : g.forma === 'parede' ? Math.hypot(g.largura, g.espessura) / 2 : g.alcance;
    const cx = g.forma === 'linha' ? z.x + (z.ux * g.alcance) / 2 : z.x;
    const cy = g.forma === 'linha' ? z.y + (z.uy * g.alcance) / 2 : z.y;
    const rr = g.forma === 'linha' ? g.alcance / 2 + g.largura : r;
    for (let k = 0; k < 12; k++) {
      const p = { x: cx + (sorte() * 2 - 1) * rr, y: cy + (sorte() * 2 - 1) * rr };
      if (acertaForma(g, z, p, 0)) return p;
    }
    return null;
  }

  /**
   * Partículas espalhadas dentro de uma forma no chão, até `altura` acima dele. `sopro` faz elas andarem na
   * direção da forma (cone e linha), com essa velocidade.
   */
  naForma(tipo: string, g: Geometria, z: Posicao, n: number, op: { altura?: number; forca?: number; sopro?: number; nevoa?: boolean } = {}): void {
    if (!this.de(tipo)) return;
    let vx = 0;
    let vy = 0;
    if (op.sopro) {
      const a = projetar(z.x, z.y);
      const b = projetar(z.x + z.ux * 10, z.y + z.uy * 10);
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      vx = ((b.x - a.x) / d) * op.sopro;
      vy = ((b.y - a.y) / d) * op.sopro;
    }
    for (let i = 0; i < n; i++) {
      const p = this.pontoNa(g, z);
      if (!p) continue;
      const s = projetar(p.x, p.y);
      this.particula(tipo, s.x, s.y - sorte() * (op.altura ?? 0), { vx, vy, forca: op.forca ?? 0.5, nevoa: op.nevoa });
    }
  }

  // ---------- Animações ----------

  private animar(tipo: string, dur: number, a: NovaAnim): void {
    const fx = this.de(tipo);
    if (fx) this.anims.push({ ...a, t: 0, dur, cores: fx.cores } as Anim);
  }

  /** Impacto em estrela no ponto do cenário: núcleo branco, raios que se abrem e um halo. */
  impacto(tipo: string, x: number, y: number, forte = false): void {
    this.animar(tipo, forte ? 0.32 : 0.26, { tipo: 'impacto', x, y, forte });
  }

  /** Bola de fogo com onda de choque e clarão no chão, num ponto do chão com `raio` (unidades do chão). */
  estouro(tipo: string, x: number, y: number, raio: number): void {
    this.animar(tipo, 0.55, { tipo: 'estouro', x, y, raio });
    const c = projetar(x, y);
    const fx = this.de(tipo);
    if (!fx) return;
    for (let i = 0; i < 10; i++) this.particula(tipo, c.x, c.y - raio * 0.6, { forca: 1 });
    for (let i = 0; i < 6; i++) this.particula(tipo, c.x + (sorte() - 0.5) * raio, c.y - raio * 0.5 - sorte() * raio * 0.5, { forca: 0.6, nevoa: true });
  }

  /** Anel de energia que se abre no chão, com faíscas na borda. */
  nova(tipo: string, x: number, y: number, de: number, ate: number, dur = 0.38): void {
    this.animar(tipo, dur, { tipo: 'nova', x, y, de, ate });
  }

  /** Feixe grosso entre dois pontos do cenário (jato, prisma, linha). */
  feixe(tipo: string, a: Ponto, b: Ponto): void {
    this.animar(tipo, 0.26, { tipo: 'feixe', a, b });
  }

  /** Raio quebrado, com brilho e galhos, entre dois pontos do cenário. */
  raio(tipo: string, a: Ponto, b: Ponto): void {
    const { pontos, galhos } = quebrado(a, b);
    this.animar(tipo, 0.24, { tipo: 'raio', a, b, pontos, galhos, troca: 0.05 });
  }

  atualizar(dt: number): void {
    this.t += dt;
    const passos = dt * 60;
    for (let i = this.particulas.length - 1; i >= 0; i--) {
      const p = this.particulas[i]!;
      if ((p.vida -= dt) <= 0) {
        this.particulas.splice(i, 1);
        continue;
      }
      const j = JEITOS[p.jeito];
      const arrasto = Math.pow(j.arrasto, passos);
      p.vx *= arrasto;
      p.vy = p.vy * arrasto + j.gravidade * dt;
      if (j.gira) {
        const a = j.gira * dt;
        [p.vx, p.vy] = [p.vx * Math.cos(a) - p.vy * Math.sin(a), p.vx * Math.sin(a) + p.vy * Math.cos(a)];
      }
      if (j.treme) {
        p.vx += (sorte() - 0.5) * 900 * dt;
        p.vy += (sorte() - 0.5) * 900 * dt;
      }
      p.px = p.x;
      p.py = p.y;
      p.x += p.vx * dt + (j.oscila ? Math.sin(this.t * 6 + p.fase) * j.oscila * passos : 0);
      p.y += p.vy * dt;
    }
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i]!;
      if ((a.t += dt) >= a.dur) {
        this.anims.splice(i, 1);
        continue;
      }
      // O raio estala: muda de forma a cada instante.
      if (a.tipo === 'raio' && (a.troca -= dt) <= 0) {
        Object.assign(a, quebrado(a.a, a.b));
        a.troca = 0.05;
      }
    }
  }

  // ---------- Desenho ----------

  /** O que fica no chão (clarões, ondas de choque, anéis): antes das criaturas. */
  desenharChao(x: CanvasRenderingContext2D): void {
    for (const a of this.anims) {
      const p = a.t / a.dur;
      const { media, clara } = tons(a.cores);
      if (a.tipo === 'estouro') {
        const e = elipseNoChao(a.x, a.y, a.raio);
        if (p < 0.5) comAlfa(x, (1 - p * 2) * 0.7, () => trama(x, e.x, e.y, e.rx * 1.3, e.ry * 1.3, clara, 0));
        const f = 0.4 + p;
        x.fillStyle = p < 0.3 ? BRANCO : p < 0.6 ? clara : media;
        anel(x, e.x, e.y, e.rx * f, e.ry * f, p < 0.4 ? 2 : 1, p > 0.6 ? 2 : 0);
      } else if (a.tipo === 'nova') {
        const r = a.de + (a.ate - a.de) * (1 - (1 - p) * (1 - p));
        const e = elipseNoChao(a.x, a.y, r);
        comAlfa(x, 0.35 * (1 - p), () => trama(x, e.x, e.y, e.rx * 0.95, e.ry * 0.95, media, 1));
        x.fillStyle = p < 0.25 ? BRANCO : clara;
        anel(x, e.x, e.y, e.rx, e.ry, p < 0.5 ? 2 : 1, p > 0.7 ? 2 : 0);
        // Faíscas que correm na borda.
        for (let k = 0; k < 8; k++) {
          const ang = (k * Math.PI) / 4 + p * 1.2;
          cruz(x, e.x + Math.cos(ang) * e.rx, e.y + Math.sin(ang) * e.ry, (k + Math.floor(this.t * 20)) % 2 ? BRANCO : clara, p < 0.6);
        }
      }
    }
  }

  /** Animações no ar, partículas e raios: por cima das criaturas. */
  desenhar(x: CanvasRenderingContext2D): void {
    for (const a of this.anims) {
      const p = a.t / a.dur;
      const { escura, media, clara } = tons(a.cores);
      switch (a.tipo) {
        case 'impacto': {
          const R = a.forte ? 13 : 9;
          const cor = p < 0.18 ? BRANCO : p < 0.4 ? clara : p < 0.7 ? media : escura;
          comAlfa(x, 0.4 * (1 - p), () => trama(x, a.x, a.y, R * (0.5 + 0.7 * p), R * (0.4 + 0.6 * p), media, 0));
          const len = R * (0.45 + 0.75 * Math.min(1, p * 2.2));
          const solto = len * Math.max(0, p - 0.25) * 1.3;
          x.fillStyle = cor;
          for (let k = 0; k < 8; k++) {
            const ang = (k * Math.PI) / 4;
            const L = k % 2 ? len * 0.6 : len;
            const de = { x: a.x + Math.cos(ang) * solto, y: a.y + Math.sin(ang) * solto };
            const ate = { x: a.x + Math.cos(ang) * L, y: a.y + Math.sin(ang) * L };
            linha(x, de, ate, k % 2 === 0 && a.forte && p < 0.5 ? 2 : 1);
          }
          if (p < 0.3) {
            x.fillStyle = BRANCO;
            disco(x, a.x, a.y, (a.forte ? 4 : 3) * (1 - p / 0.3) + 1, (a.forte ? 4 : 3) * (1 - p / 0.3) + 1);
          }
          break;
        }
        case 'estouro': {
          const e = elipseNoChao(a.x, a.y, a.raio);
          const cx = e.x;
          const cy = e.y - Math.max(5, e.ry * 0.9);
          const R = Math.max(5, e.rx * 0.8);
          if (p < 0.22) {
            x.fillStyle = BRANCO;
            disco(x, cx, cy, R * (0.3 + (p / 0.22) * 0.8), R * (0.3 + (p / 0.22) * 0.8));
          } else {
            const q = (p - 0.22) / 0.78;
            const camadas: [string, number][] = [
              [escura, 1.1 + 0.25 * q],
              [media, 0.85 - 0.45 * q],
              [clara, 0.55 - 0.55 * q],
            ];
            for (const [cor, f] of camadas) {
              if (f <= 0.05) continue;
              x.fillStyle = cor;
              if (q > 0.45) trama(x, cx, cy, R * f, R * f, cor, Math.floor(this.t * 30));
              else disco(x, cx, cy, R * f, R * f);
            }
          }
          break;
        }
        case 'feixe': {
          if (p > 0.6 && Math.floor(a.t * 60) % 2) break;
          const esp = p < 0.45 ? 3 : p < 0.75 ? 2 : 1;
          comAlfa(x, 0.45, () => {
            x.fillStyle = media;
            linha(x, a.a, a.b, esp + 2);
          });
          x.fillStyle = clara;
          linha(x, a.a, a.b, esp);
          if (p < 0.6) {
            x.fillStyle = BRANCO;
            linha(x, a.a, a.b, 1);
          }
          break;
        }
        case 'raio': {
          if (Math.floor(a.t * 60) % 4 === 3) break;
          comAlfa(x, 0.5, () => {
            x.fillStyle = media;
            for (let k = 1; k < a.pontos.length; k++) linha(x, a.pontos[k - 1]!, a.pontos[k]!, 3);
          });
          x.fillStyle = clara;
          for (const g of a.galhos) for (let k = 1; k < g.length; k++) linha(x, g[k - 1]!, g[k]!, 1);
          x.fillStyle = BRANCO;
          for (let k = 1; k < a.pontos.length; k++) linha(x, a.pontos[k - 1]!, a.pontos[k]!, 1);
          break;
        }
      }
    }
    for (const p of this.particulas) {
      const j = JEITOS[p.jeito];
      if (p.vida < 0.12 && Math.floor(p.vida * 40) % 2) continue;
      const n = p.cores.length;
      const idade = 1 - p.vida / p.total;
      // Nasce clara (quente) e esfria para a cor mais escura.
      let cor = idade < 0.15 && p.jeito !== 'nevoa' ? p.cores[n - 1]! : p.cores[Math.min(n - 1, Math.floor((p.vida / p.total) * n))]!;
      if (j.pisca && Math.floor((this.t + p.fase) * 12) % 4 === 0) cor = BRANCO;
      x.fillStyle = cor;
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      switch (j.forma) {
        case 'ponto':
          x.fillRect(px, py, p.tam, p.tam);
          break;
        case 'cruz':
          cruz(x, px, py, cor, Math.floor((this.t + p.fase) * 8) % 2 === 0);
          break;
        case 'risco': {
          // Três pixels na direção do movimento (folha, estilhaço, risco de garra, vento).
          const v = Math.hypot(p.vx, p.vy) || 1;
          const ux = Math.round(p.vx / v);
          const uy = Math.round(p.vy / v);
          for (let k = 0; k <= p.tam; k++) x.fillRect(px - ux * k, py - uy * k, 1, 1);
          break;
        }
        case 'faisca':
          linha(x, { x: p.px, y: p.py }, { x: p.x, y: p.y }, 1);
          break;
        case 'trama': {
          // Lufada em xadrez; mais velha, mais rala.
          const ralo = p.vida / p.total < 0.4;
          for (let i = 0; i < p.tam; i++) for (let k = 0; k < p.tam; k++) if ((i + k) % 2 === 0 && (!ralo || (i === 1 && k === 1))) x.fillRect(px + i - 1, py + k - 1, 1, 1);
          break;
        }
      }
    }
  }

  /** Energia de quem conjura, no chão: um brilho que cresce embaixo dos pés. `pe` é o ponto do chão no cenário. */
  cargaChao(x: CanvasRenderingContext2D, tipo: string, pe: Ponto, prog: number): void {
    const fx = this.de(tipo);
    if (!fx) return;
    const { clara } = tons(fx.cores);
    comAlfa(x, 0.25 + 0.45 * prog, () => trama(x, pe.x, pe.y, 9 + 8 * prog, 3 + 3 * prog, clara, Math.floor(this.t * 10)));
  }

  /** Energia de quem conjura, no ar: faíscas girando e se fechando em volta do corpo. */
  cargaAr(x: CanvasRenderingContext2D, tipo: string, pe: Ponto, h: number, prog: number): void {
    const fx = this.de(tipo);
    if (!fx) return;
    const { clara } = tons(fx.cores);
    const r = h * 0.9 * (1 - 0.55 * prog) + 3;
    for (let k = 0; k < 6; k++) {
      const ang = this.t * (4 + 4 * prog) + (k * Math.PI) / 3;
      cruz(x, pe.x + Math.cos(ang) * r, pe.y - h / 2 + Math.sin(ang) * r * 0.55, k % 2 ? clara : BRANCO, prog > 0.5 && Math.floor(this.t * 16 + k) % 2 === 0);
    }
  }

  /** Brilho e rastro de um projétil: halo em volta e imagens que ficam para trás na direção do voo. */
  brilhoProjetil(x: CanvasRenderingContext2D, tipo: string, q: Ponto, ux: number, uy: number): void {
    const fx = this.de(tipo);
    if (!fx) return;
    const { escura, media, clara } = tons(fx.cores);
    comAlfa(x, 0.45, () => trama(x, q.x, q.y, 5, 4, media, Math.floor(this.t * 20)));
    const rastro: [number, number, string][] = [
      [4, 3, clara],
      [7, 2, media],
      [10, 2, media],
      [13, 1, escura],
    ];
    for (const [d, tam, cor] of rastro) {
      x.fillStyle = cor;
      x.fillRect(Math.round(q.x - ux * d - tam / 2), Math.round(q.y - uy * d - tam / 2), tam, tam);
    }
  }
}

// ---------- Primitivas de pixel ----------

/** Centro e raios no cenário de um círculo de raio `r` no chão (em perspectiva, vira elipse). */
function elipseNoChao(x: number, y: number, r: number): { x: number; y: number; rx: number; ry: number } {
  const c = projetar(x, y);
  return { x: c.x, y: c.y, rx: Math.abs(projetar(x + r, y).x - c.x), ry: Math.abs(projetar(x, y + r).y - c.y) };
}

function comAlfa(x: CanvasRenderingContext2D, alfa: number, desenho: () => void): void {
  const antes = x.globalAlpha;
  x.globalAlpha = antes * Math.max(0, Math.min(1, alfa));
  desenho();
  x.globalAlpha = antes;
}

/** Elipse cheia, em faixas de 1 pixel. */
function disco(x: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  const r = Math.max(0.5, ry);
  for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
    const meia = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / r) ** 2)));
    x.fillRect(Math.round(cx) - meia, Math.round(cy) + dy, meia * 2 + 1, 1);
  }
}

/** Elipse em xadrez (halo, clarão, fumaça). */
function trama(x: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, cor: string, fase: number): void {
  x.fillStyle = cor;
  const r = Math.max(0.5, ry);
  const ox = Math.round(cx);
  const oy = Math.round(cy);
  for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
    const meia = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / r) ** 2)));
    for (let dx = -meia; dx <= meia; dx++) if ((dx + dy + fase) % 2 === 0) x.fillRect(ox + dx, oy + dy, 1, 1);
  }
}

/** Contorno de elipse, com `esp` pixels; `pontilhado` pula pixels (de tantos em tantos). */
function anel(x: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, esp: number, pontilhado: number): void {
  const n = Math.max(16, Math.round(Math.PI * (rx + ry)));
  for (let k = 0; k < n; k++) {
    if (pontilhado && k % pontilhado) continue;
    const a = (k / n) * Math.PI * 2;
    x.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
    if (esp > 1) x.fillRect(Math.round(cx + Math.cos(a) * (rx - 1)), Math.round(cy + Math.sin(a) * (ry - 1)), 1, 1);
  }
}

/** Faísca em cruz: o centro e, quando `grande`, os quatro braços. */
function cruz(x: CanvasRenderingContext2D, cx: number, cy: number, cor: string, grande: boolean): void {
  x.fillStyle = cor;
  const px = Math.round(cx);
  const py = Math.round(cy);
  x.fillRect(px, py, 1, 1);
  if (!grande) return;
  x.fillRect(px - 1, py, 1, 1);
  x.fillRect(px + 1, py, 1, 1);
  x.fillRect(px, py - 1, 1, 1);
  x.fillRect(px, py + 1, 1, 1);
}

/** Linha de pixels entre dois pontos do cenário, com `esp` de grossura. */
function linha(x: CanvasRenderingContext2D, a: Ponto, b: Ponto, esp: number): void {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))));
  const o = Math.floor(esp / 2);
  for (let k = 0; k <= n; k++) x.fillRect(Math.round(a.x + ((b.x - a.x) * k) / n) - o, Math.round(a.y + ((b.y - a.y) * k) / n) - o, esp, esp);
}

/** Pontos de um raio quebrado de `a` até `b`, e dois galhos curtos saindo do meio. */
function quebrado(a: Ponto, b: Ponto): { pontos: Ponto[]; galhos: Ponto[][] } {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const n = Math.max(3, Math.round(d / 7));
  const nx = -(b.y - a.y) / d;
  const ny = (b.x - a.x) / d;
  const pontos = Array.from({ length: n + 1 }, (_, i) => {
    const f = i / n;
    const desvio = i === 0 || i === n ? 0 : (sorte() * 2 - 1) * 4;
    return { x: a.x + (b.x - a.x) * f + nx * desvio, y: a.y + (b.y - a.y) * f + ny * desvio };
  });
  const galhos = [0, 1].map(() => {
    const de = pontos[1 + Math.floor(sorte() * (n - 1))]!;
    const lado = sorte() < 0.5 ? -1 : 1;
    const comprimento = 6 + sorte() * 8;
    return [de, { x: de.x + (nx * lado + (b.x - a.x) / d) * comprimento * 0.5, y: de.y + (ny * lado + (b.y - a.y) / d) * comprimento * 0.5 }, { x: de.x + nx * lado * comprimento, y: de.y + ny * lado * comprimento + 2 }];
  });
  return { pontos, galhos };
}
