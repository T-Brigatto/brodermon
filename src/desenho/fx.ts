// Efeitos especiais em pixel, no espírito dos FX de mesa virtual. Há dois níveis:
// - o comum, igual para todo elemento, só nas cores dele: impacto em estrela, anel de energia, feixe, raio,
//   energia de conjuração, brilho e rastro dos projéteis, e partículas com o jeito do elemento (brasa sobe, gota
//   cai, floco cintila…);
// - as animações próprias, que o elemento escolhe por papel em `fx.animacoes` (tipos.json) e um golpe ou campo
//   pode trocar em `visual`. As peças (labareda, gota, espinho, risco de vento…) estão em `animacoes.ts`, e as
//   receitas que montam cada animação com elas, em `receitas.ts`. Aqui ficam as peças vivas, o tempo e o desenho.
// Só aparecem nos tipos que têm `fx`: a Arena original não tem, e fica igual. Tudo em coordenadas do cenário;
// é só apresentação, então pode sortear à vontade.

import type {
  AnimacaoAvanco,
  AnimacaoCampo,
  AnimacaoForma,
  AnimacaoImpacto,
  AnimacaoProjetil,
  Campo,
  Conteudo,
  PapelGolpe,
  Tipo,
  VisualGolpe,
} from '../conteudo/esquema';
import { acertaForma, type Geometria, type Ponto, type Posicao } from '../nucleo';
import {
  FUMACA,
  SUMIR,
  caminhoRachado,
  quebrado,
  desenharAnel,
  desenharArco,
  desenharBaforada,
  desenharBaseDoFunil,
  desenharBolhas,
  desenharCirculo,
  desenharClarao,
  desenharEspinhos,
  desenharFolha,
  desenharFunil,
  desenharGarra,
  desenharGota,
  desenharLabaredas,
  desenharMancha,
  desenharMordida,
  desenharPedra,
  desenharRachadura,
  desenharRisco,
  desenharRuna,
  desenharTracado,
  desenharVinhas,
  moverBaforada,
  moverBolha,
  moverFolha,
  moverGota,
  moverPedra,
  moverRisco,
  moverRuna,
  paleta,
  passar,
  visivel,
  type Arco,
  type Baforada,
  type Bolha,
  type Clarao,
  type Continuo,
  type Espinho,
  type Folha,
  type Garra,
  type Gota,
  type Labareda,
  type Mancha,
  type Mordida,
  type Paleta,
  type Pedra,
  type Rachadura,
  type Risco,
  type Runa,
  type Tracado,
  type Vinha,
} from './animacoes';
import { projetar } from './arena';
import { BRANCO, anel, comAlfa, cruz, disco, elipseNoChao, linha, trama } from './pixels';
import { AVANCOS, CAMPOS, FORMAS, IMPACTOS, PROJETEIS, ZONAS } from './receitas';

export { anguloNaTela, areaDaForma } from './animacoes';

type Forma = 'ponto' | 'cruz' | 'risco' | 'faisca' | 'trama';
export type Jeito = NonNullable<Tipo['fx']>['estilo'] | 'nevoa';

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
/** Limite das peças das animações próprias (labaredas, riscos, gotas…), somadas. */
const MAXIMO_PECAS = 1200;
const sorte = Math.random;
const sortear = ([a, b]: [number, number]) => a + sorte() * (b - a);
/** Cores do efeito: a mais escura, a do meio e a mais clara. */
const tons = (c: string[]) => ({ escura: c[0]!, media: c[Math.floor((c.length - 1) / 2)]!, clara: c[c.length - 1]! });

/** Força de um acerto: o dano contínuo e o disparo são leves, o super eficaz é forte. */
export type Forca = 'leve' | 'normal' | 'forte';

export class Fx {
  particulas: Particula[] = [];
  anims: Anim[] = [];
  labaredas: Labareda[] = [];
  baforadas: Baforada[] = [];
  bolhas: Bolha[] = [];
  riscos: Risco[] = [];
  arcos: Arco[] = [];
  manchas: Mancha[] = [];
  claroes: Clarao[] = [];
  gotas: Gota[] = [];
  espinhos: Espinho[] = [];
  pedras: Pedra[] = [];
  rachaduras: Rachadura[] = [];
  folhas: Folha[] = [];
  vinhas: Vinha[] = [];
  runas: Runa[] = [];
  garras: Garra[] = [];
  mordidas: Mordida[] = [];
  tracados: Tracado[] = [];
  /** Funis, anéis e círculos que seguem uma zona, pela zona. */
  readonly continuos = new Map<object, Continuo>();
  private readonly paletas = new Map<string, Paleta>();
  /** Relógio dos efeitos, em segundos. */
  t = 0;

  constructor(private readonly c: Conteudo) {}

  /** O efeito do tipo, ou null (sem efeito). */
  de(tipo: string): NonNullable<Tipo['fx']> | null {
    return this.c.tipos[tipo]?.fx ?? null;
  }

  /** A animação de um papel no golpe: a do golpe (`visual`), senão a do elemento; null = efeito comum. */
  animacao<P extends PapelGolpe>(golpe: string, papel: P): NonNullable<VisualGolpe[P]> | null {
    const g = this.c.golpes[golpe];
    const fx = g ? this.de(g.tipo) : null;
    if (!g || !fx) return null;
    return (g.visual?.[papel] ?? fx.animacoes?.[papel] ?? null) as NonNullable<VisualGolpe[P]> | null;
  }

  /** A animação de um terreno ou névoa: a do campo (`visual`), senão a do elemento para a camada. */
  animacaoDoCampo(campo: Campo): AnimacaoCampo | null {
    const fx = this.de(campo.tipo);
    if (!fx) return null;
    return campo.visual ?? fx.animacoes?.[campo.camada] ?? null;
  }

  /** Quantas peças das animações próprias estão no ar (esperando ou vivas). */
  get pecas(): number {
    return (
      this.labaredas.length +
      this.baforadas.length +
      this.bolhas.length +
      this.riscos.length +
      this.arcos.length +
      this.manchas.length +
      this.claroes.length +
      this.gotas.length +
      this.espinhos.length +
      this.pedras.length +
      this.rachaduras.length +
      this.folhas.length +
      this.vinhas.length +
      this.runas.length +
      this.garras.length +
      this.mordidas.length +
      this.tracados.length
    );
  }

  limpar(): void {
    this.particulas = [];
    this.anims = [];
    this.labaredas = [];
    this.baforadas = [];
    this.bolhas = [];
    this.riscos = [];
    this.arcos = [];
    this.manchas = [];
    this.claroes = [];
    this.gotas = [];
    this.espinhos = [];
    this.pedras = [];
    this.rachaduras = [];
    this.folhas = [];
    this.vinhas = [];
    this.runas = [];
    this.garras = [];
    this.mordidas = [];
    this.tracados = [];
    this.continuos.clear();
  }

  // ---------- Partículas ----------

  /**
   * Uma partícula do tipo num ponto do cenário. `forca` escala a velocidade de saída (0 = só a base);
   * `vx`/`vy` somam uma velocidade base; `nevoa` usa a lufada de fumaça com as cores do tipo; `jeito` troca o jeito
   * do elemento por outro (a estrela que cintila parada, a brasa que sobe).
   */
  particula(tipo: string, x: number, y: number, op: { vx?: number; vy?: number; forca?: number; nevoa?: boolean; jeito?: Jeito } = {}): void {
    const fx = this.de(tipo);
    if (!fx) return;
    const jeito: Jeito = op.jeito ?? (op.nevoa ? 'nevoa' : fx.estilo);
    const j = JEITOS[jeito];
    const a = sorte() * Math.PI * 2;
    const forca = op.forca ?? 1;
    const v = sortear(j.velocidade) * forca;
    const vida = sortear(j.vida);
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
  naForma(tipo: string, g: Geometria, z: Posicao, n: number, op: { altura?: number; forca?: number; sopro?: number; nevoa?: boolean; jeito?: Jeito } = {}): void {
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
      this.particula(tipo, s.x, s.y - sorte() * (op.altura ?? 0), { vx, vy, forca: op.forca ?? 0.5, nevoa: op.nevoa, jeito: op.jeito });
    }
  }

  // ---------- Animações comuns ----------

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
  raio(tipo: string, a: Ponto, b: Ponto, dur = 0.24): void {
    const { pontos, galhos } = quebrado(a, b);
    this.animar(tipo, dur, { tipo: 'raio', a, b, pontos, galhos, troca: 0.05 });
  }

  // ---------- Animações próprias: as receitas ----------

  /** Forma que acertou o campo, com a animação dada no lugar do anel, do feixe e do sopro comuns. */
  forma(anim: AnimacaoForma, tipo: string, g: Geometria, z: Posicao): void {
    const p = this.paletaDe(tipo);
    if (p) FORMAS[anim](this, p, tipo, g, z);
  }

  /** Um quadro de uma zona de golpe que dura (cone canalizado, área que anda ou cresce), com a animação dada. */
  zona(anim: AnimacaoForma, tipo: string, g: Geometria, z: Posicao, dt: number, chave: object): void {
    const p = this.paletaDe(tipo);
    if (!p) return;
    const receita = ZONAS[anim];
    if (receita) receita(this, p, tipo, g, z, dt * 60, chave);
    else if (anim in CAMPOS) CAMPOS[anim as AnimacaoCampo](this, p, tipo, g, z, dt * 60, chave);
  }

  /** Um quadro de um terreno ou névoa com a animação dada; `chave` é a zona (para o círculo que a acompanha). */
  campo(anim: AnimacaoCampo, tipo: string, g: Geometria, z: Posicao, dt: number, def?: Campo, chave: object = z): void {
    const p = this.paletaDe(tipo);
    if (p) CAMPOS[anim](this, p, tipo, g, z, dt * 60, chave, def);
  }

  /** Acerto num ponto do cenário com a animação dada. */
  impactoDe(anim: AnimacaoImpacto, tipo: string, x: number, y: number, forca: Forca): void {
    const p = this.paletaDe(tipo);
    if (p) IMPACTOS[anim](this, p, tipo, x, y, forca === 'forte' ? 2 : forca === 'normal' ? 1 : 0);
  }

  /** Um quadro do rastro de um projétil, na posição `q` da tela, voando na direção (ux, uy); `raio` no chão. */
  rastroDoProjetil(anim: AnimacaoProjetil, tipo: string, q: Ponto, ux: number, uy: number, raio: number, dt: number): void {
    const p = this.paletaDe(tipo);
    if (p) PROJETEIS[anim].rastro(this, p, tipo, q, ux, uy, raio, dt * 60);
  }

  /** O corpo do projétil com a animação dada (no lugar da bolinha comum). */
  desenharProjetil(x: CanvasRenderingContext2D, anim: AnimacaoProjetil, tipo: string, q: Ponto, ux: number, uy: number, raio: number): void {
    const p = this.paletaDe(tipo);
    if (p) PROJETEIS[anim].desenhar(x, p, q, ux, uy, raio, this.t);
  }

  /** Um quadro de quem avança com um golpe: `pe` no chão (tela), `h` a altura do corpo, `ang` a direção na tela. */
  avanco(anim: AnimacaoAvanco, tipo: string, pe: Ponto, h: number, ang: number, dt: number): void {
    const p = this.paletaDe(tipo);
    if (p) AVANCOS[anim](this, p, tipo, pe, h, ang, dt * 60);
  }

  // ---------- Peças: as receitas soltam por aqui ----------

  private paletaDe(tipo: string): Paleta | null {
    const fx = this.de(tipo);
    if (!fx) return null;
    let p = this.paletas.get(tipo);
    if (!p) this.paletas.set(tipo, (p = paleta(fx.cores)));
    return p;
  }

  private cheio(): boolean {
    return this.pecas >= MAXIMO_PECAS;
  }

  labareda(p: Paleta, x: number, y: number, h: number, w: number, vida: number, atraso = 0): void {
    if (!this.cheio()) this.labaredas.push({ x, y, h, w, vida, total: vida, atraso, fase: sorte() * 10, p });
  }

  baforada(x: number, y: number, op: { r0: number; r1: number; vx: number; vy: number; vida: number; atraso?: number; cores?: string[] }): void {
    if (this.cheio()) return;
    this.baforadas.push({ x, y, vx: op.vx, vy: op.vy, r0: op.r0, r1: op.r1, vida: op.vida, total: op.vida, atraso: op.atraso ?? 0, cores: op.cores ?? FUMACA, fase: sorte() * 10 });
  }

  /** Bolha de fogo (sobe, `gravidade` negativa, vira fumaça) ou de água (cai, sem fumaça). */
  bolha(p: Paleta, x: number, y: number, vx: number, vy: number, r0: number, r1: number, vida: number, op: { atraso?: number; fumaca?: boolean; gravidade?: number } = {}): void {
    if (!this.cheio()) this.bolhas.push({ x, y, vx, vy, r0, r1, vida, total: vida, atraso: op.atraso ?? 0, p, fumaca: op.fumaca ?? true, gravidade: op.gravidade ?? -12 });
  }

  risco(p: Paleta, x: number, y: number, ang: number, v: number, vida: number, op: { L: number; gira?: number; enrola?: number; grosso?: boolean; atraso?: number }): void {
    if (this.cheio()) return;
    this.riscos.push({ x, y, ang, v, vida, total: vida, atraso: op.atraso ?? 0, gira: op.gira ?? 0, enrola: op.enrola ?? 0, L: Math.round(op.L), grosso: op.grosso ?? false, trilha: [], p });
  }

  arco(
    p: Paleta,
    x: number,
    y: number,
    r0: number,
    r1: number,
    op: { ang?: number; abertura: number; achatado: number; tracos?: number; giro?: number; vida: number; atraso?: number; chao?: boolean; varre?: boolean; grossura?: number },
  ): void {
    if (this.cheio()) return;
    this.arcos.push({
      x,
      y,
      r0,
      r1,
      ang: op.ang ?? 0,
      abertura: op.abertura,
      achatado: op.achatado,
      tracos: op.tracos ?? 0,
      giro: op.giro ?? 0,
      chao: op.chao ?? false,
      varre: op.varre ?? false,
      grossura: op.grossura ?? 1,
      vida: op.vida,
      total: op.vida,
      atraso: op.atraso ?? 0,
      p,
    });
  }

  /** Brilho no chão, num círculo de raio `r` (unidades do chão), que esfria até chão marcado. */
  mancha(p: Paleta, x: number, y: number, r: number, vida: number): void {
    const e = elipseNoChao(x, y, r);
    if (!this.cheio()) this.manchas.push({ x: e.x, y: e.y, rx: e.rx, ry: e.ry, p, vida, total: vida, atraso: 0 });
  }

  /** Lampejo branco com raios de luz em volta de (x, y) da tela, até `r` pixels. */
  clarao(p: Paleta, x: number, y: number, r: number, vida: number): void {
    if (!this.cheio()) this.claroes.push({ x, y, r, p, vida, total: vida, atraso: 0 });
  }

  /** Gota que cai até a linha `chao` da tela e lá vira uma ondinha. */
  gota(p: Paleta, x: number, y: number, vx: number, vy: number, chao: number, op: { tam?: number; vida?: number; atraso?: number } = {}): void {
    const vida = op.vida ?? 1.5;
    if (!this.cheio()) this.gotas.push({ x, y, vx, vy, chao, tam: op.tam ?? 1, vida, total: vida, atraso: op.atraso ?? 0, p });
  }

  /** Espinho (estaca ou cristal) que brota em (x, y) da tela. */
  espinho(p: Paleta, x: number, y: number, h: number, w: number, vida: number, op: { incl?: number; atraso?: number } = {}): void {
    if (!this.cheio()) this.espinhos.push({ x, y, h, w, incl: op.incl ?? 0, vida, total: vida, atraso: op.atraso ?? 0, p });
  }

  /** Pedra (lasca, granizo) que voa de (x, y), cai até a linha `chao` e quica. */
  pedra(p: Paleta, x: number, y: number, vx: number, vy: number, chao: number, op: { tam: number; vida: number; quica?: number; atraso?: number }): void {
    if (this.cheio()) return;
    this.pedras.push({ x, y, vx, vy, chao, tam: op.tam, ang: sorte() * 6, giro: (sorte() - 0.5) * 20, quica: op.quica ?? 1, vida: op.vida, total: op.vida, atraso: op.atraso ?? 0, p });
  }

  /** Rachadura que se abre de `de` (tela) na direção `ang`. */
  rachadura(p: Paleta, de: Ponto, ang: number, comprimento: number, vida: number, atraso = 0): void {
    if (!this.cheio()) this.rachaduras.push({ ramos: caminhoRachado(de, ang, comprimento), p, vida, total: vida, atraso });
  }

  folha(p: Paleta, x: number, y: number, vx: number, vy: number, op: { tam?: number; vida: number; atraso?: number }): void {
    if (this.cheio()) return;
    this.folhas.push({ x, y, vx, vy, ang: sorte() * 6, giro: (sorte() - 0.5) * 14, tam: op.tam ?? 2, fase: sorte() * 10, vida: op.vida, total: op.vida, atraso: op.atraso ?? 0, p });
  }

  /** Vinha (ou raiz) que cresce ao longo de `pontos` (tela). */
  vinha(p: Paleta, pontos: Ponto[], vida: number, op: { grossura?: number; folhas?: number[]; atraso?: number } = {}): void {
    if (!this.cheio()) this.vinhas.push({ pontos, grossura: op.grossura ?? 2, folhas: op.folhas ?? [], p, vida, total: vida, atraso: op.atraso ?? 0 });
  }

  runa(p: Paleta, x: number, y: number, op: { vy?: number; vida: number; atraso?: number }): void {
    if (!this.cheio()) this.runas.push({ x, y, vy: op.vy ?? -14, glifo: Math.floor(sorte() * 100), p, vida: op.vida, total: op.vida, atraso: op.atraso ?? 0 });
  }

  garra(p: Paleta, x: number, y: number, ang: number, L: number, vida: number, atraso = 0): void {
    if (!this.cheio()) this.garras.push({ x, y, ang, L, p, vida, total: vida, atraso });
  }

  mordida(p: Paleta, x: number, y: number, vida: number): void {
    if (!this.cheio()) this.mordidas.push({ x, y, p, vida, total: vida, atraso: 0 });
  }

  /** Prisma (luz que abre em arco-íris) ou corrente, de `a` até `b` na tela. */
  tracado(p: Paleta, a: Ponto, b: Ponto, forma: Tracado['forma'], vida: number): void {
    if (!this.cheio()) this.tracados.push({ a, b, forma, p, vida, total: vida, atraso: 0 });
  }

  /** Funil, anel ou círculo que segue `chave` (uma zona) enquanto for renovado; some `SUMIR` s depois de `segura` sem notícia. */
  manter(chave: object, forma: Continuo['forma'], x: number, y: number, raio: number, p: Paleta, segura = 0.08): void {
    const c = this.continuos.get(chave);
    if (c) Object.assign(c, { x, y, raio, ate: this.t + segura, some: 0 });
    else this.continuos.set(chave, { forma, x, y, raio, ate: this.t + segura, some: 0, fase: sorte() * 10, p });
  }

  // ---------- Tempo ----------

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
    passar(this.labaredas, dt);
    passar(this.baforadas, dt, moverBaforada);
    passar(this.bolhas, dt, moverBolha);
    passar(this.riscos, dt, moverRisco);
    passar(this.arcos, dt);
    passar(this.manchas, dt);
    passar(this.claroes, dt);
    passar(this.espinhos, dt);
    passar(this.pedras, dt, moverPedra);
    passar(this.rachaduras, dt);
    passar(this.folhas, dt, moverFolha);
    passar(this.vinhas, dt);
    passar(this.runas, dt, moverRuna);
    passar(this.garras, dt);
    passar(this.mordidas, dt);
    passar(this.tracados, dt);
    // A gota que chega ao chão vira uma ondinha.
    const pousaram: Gota[] = [];
    passar(this.gotas, dt, (g, d) => {
      moverGota(g, d);
      if (g.y >= g.chao) pousaram.push(g);
    });
    for (const g of pousaram) {
      this.gotas.splice(this.gotas.indexOf(g), 1);
      this.arco(g.p, g.x, g.chao, 0.5, 2 + g.tam * 1.5, { abertura: Math.PI * 2, achatado: 0.45, vida: 0.25, chao: true });
    }
    for (const [chave, c] of this.continuos) if (this.t > c.ate && (c.some += dt) >= SUMIR) this.continuos.delete(chave);
  }

  // ---------- Desenho ----------

  /** O que fica no chão (clarões, ondas de choque, anéis, rachaduras, círculos): antes das criaturas. */
  desenharChao(x: CanvasRenderingContext2D): void {
    for (const m of this.manchas) if (visivel(m)) desenharMancha(x, m, this.t);
    for (const r of this.rachaduras) if (visivel(r)) desenharRachadura(x, r);
    for (const c of this.continuos.values()) {
      if (c.forma === 'anel') desenharAnel(x, c, this.t);
      else if (c.forma === 'circulo') desenharCirculo(x, c, this.t);
      else desenharBaseDoFunil(x, c, this.t);
    }
    for (const a of this.arcos) if (a.chao && visivel(a)) desenharArco(x, a);
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
    // Fumaça atrás de tudo; o que brota do chão (vinhas, espinhos, chamas) e depois o que voa.
    for (const b of this.baforadas) if (visivel(b)) desenharBaforada(x, b, this.t);
    desenharVinhas(x, this.vinhas);
    desenharEspinhos(x, this.espinhos);
    desenharLabaredas(x, this.labaredas, this.t);
    desenharBolhas(x, this.bolhas);
    for (const r of this.pedras) if (visivel(r)) desenharPedra(x, r);
    for (const f of this.folhas) if (visivel(f)) desenharFolha(x, f);
    for (const g of this.gotas) if (visivel(g)) desenharGota(x, g);
    for (const c of this.claroes) if (visivel(c)) desenharClarao(x, c);
    for (const a of this.arcos) if (!a.chao && visivel(a)) desenharArco(x, a);
    for (const r of this.riscos) if (visivel(r)) desenharRisco(x, r);
    for (const f of this.tracados) if (visivel(f)) desenharTracado(x, f, this.t);
    for (const r of this.runas) if (visivel(r)) desenharRuna(x, r);
    for (const g of this.garras) if (visivel(g)) desenharGarra(x, g);
    for (const m of this.mordidas) if (visivel(m)) desenharMordida(x, m);
    for (const c of this.continuos.values()) if (c.forma === 'funil') desenharFunil(x, c, this.t);
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
